import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import VerificationBadge from '@/components/VerificationBadge';
import { MessageCircle, Eye, ThumbsUp, Heart, Laugh, Frown, Angry } from 'lucide-react';

interface LikesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
}

interface ReactionUser {
  id: string;
  username: string;
  first_name: string;
  avatar_url: string | null;
  verified?: boolean;
  badge_type?: string | null;
  reaction_type: string;
  mutual_friends: number;
}

const reactionTabs = [
  { type: 'all', label: 'Todas', icon: null },
  { type: 'heart', label: '', icon: Heart, color: 'text-red-500' },
  { type: 'thumbs-up', label: '', icon: ThumbsUp, color: 'text-blue-500' },
  { type: 'laughing', label: '', icon: Laugh, color: 'text-yellow-500' },
  { type: 'sad', label: '', icon: Frown, color: 'text-yellow-600' },
  { type: 'angry', label: '', icon: Angry, color: 'text-orange-500' },
];

export function LikesSheet({ open, onOpenChange, postId }: LikesSheetProps) {
  const navigate = useNavigate();
  const [users, setUsers] = useState<ReactionUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [viewCount, setViewCount] = useState(0);
  const [reactionCounts, setReactionCounts] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    if (open && postId) {
      loadReactions();
      loadViewCount();
      subscribeToReactions();
    }
  }, [open, postId]);

  const loadViewCount = async () => {
    // Simulated view count based on reactions * random factor
    const { count } = await supabase
      .from('post_reactions')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
    
    setViewCount((count || 0) * Math.floor(Math.random() * 100 + 50));
  };

  const loadReactions = async () => {
    setLoading(true);
    const { data: reactions } = await supabase
      .from('post_reactions')
      .select(`
        reaction_type,
        user_id,
        profiles:user_id (
          id,
          username,
          first_name,
          avatar_url,
          verified,
          badge_type
        )
      `)
      .eq('post_id', postId);

    if (reactions) {
      const counts: { [key: string]: number } = {};
      const usersData: ReactionUser[] = [];

      reactions.forEach((r: any) => {
        counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
        
        if (r.profiles) {
          usersData.push({
            id: r.profiles.id,
            username: r.profiles.username,
            first_name: r.profiles.first_name,
            avatar_url: r.profiles.avatar_url,
            verified: r.profiles.verified,
            badge_type: r.profiles.badge_type,
            reaction_type: r.reaction_type,
            mutual_friends: Math.floor(Math.random() * 100),
          });
        }
      });

      setReactionCounts(counts);
      setUsers(usersData);
    }
    setLoading(false);
  };

  const subscribeToReactions = () => {
    const channel = supabase
      .channel(`likes-${postId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_reactions', filter: `post_id=eq.${postId}` },
        () => loadReactions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const filteredUsers = activeTab === 'all' 
    ? users 
    : users.filter(u => u.reaction_type === activeTab);

  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)} m`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)} k`;
    return count.toString();
  };

  const getReactionIcon = (type: string) => {
    const tab = reactionTabs.find(t => t.type === type);
    if (tab?.icon) {
      const Icon = tab.icon;
      return <Icon className={`h-4 w-4 ${tab.color}`} />;
    }
    return null;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0">
        {/* Header with tabs */}
        <SheetHeader className="p-4 border-b sticky top-0 bg-background z-10">
          <SheetTitle className="sr-only">Reações</SheetTitle>
          
          {/* Reaction tabs - Facebook style */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {reactionTabs.map((tab) => {
              const count = tab.type === 'all' 
                ? totalReactions 
                : reactionCounts[tab.type] || 0;
              
              if (tab.type !== 'all' && count === 0) return null;

              return (
                <button
                  key={tab.type}
                  onClick={() => setActiveTab(tab.type)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full transition-all whitespace-nowrap ${
                    activeTab === tab.type
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {tab.icon && <tab.icon className={`h-5 w-5 ${tab.color}`} />}
                  <span className="text-sm">
                    {tab.type === 'all' ? `Todas: ${formatCount(count)}` : formatCount(count)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* View count */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
            <Eye className="h-4 w-4" />
            <span>{formatCount(viewCount)} visualizações</span>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(85vh-140px)]">
          <div className="p-4 space-y-2">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="h-12 w-12 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-muted rounded" />
                      <div className="h-3 w-24 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma reação ainda
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={`${user.id}-${user.reaction_type}`}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  {/* Avatar with reaction badge */}
                  <div className="relative">
                    <Avatar 
                      className="h-12 w-12 cursor-pointer"
                      onClick={() => {
                        onOpenChange(false);
                        navigate(`/profile/${user.id}`);
                      }}
                    >
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {user.first_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    {/* Reaction badge */}
                    <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-background border-2 border-background flex items-center justify-center">
                      {getReactionIcon(user.reaction_type)}
                    </div>
                  </div>

                  {/* User info */}
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/profile/${user.id}`);
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-sm truncate">
                        {user.first_name}
                      </span>
                      {user.verified && (
                        <VerificationBadge 
                          verified={user.verified} 
                          badgeType={user.badge_type} 
                          className="w-3.5 h-3.5" 
                        />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.mutual_friends} amigos em comum
                    </p>
                  </div>

                  {/* Message button */}
                  <Button
                    size="sm"
                    className="h-9 px-4 rounded-full bg-primary hover:bg-primary/90"
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/chat/${user.id}`);
                    }}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
