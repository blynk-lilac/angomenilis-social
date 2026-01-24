import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, ArrowLeft, Edit, Check, CheckCheck, Camera } from 'lucide-react';
import { MessagesSkeleton } from '@/components/loading/MessagesSkeleton';
import { motion, AnimatePresence } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';
import VerificationBadge, { hasSpecialBadgeEmoji } from '@/components/VerificationBadge';

interface Conversation {
  id: string;
  username: string;
  first_name: string;
  avatar_url: string | null;
  verified?: boolean;
  badge_type?: string | null;
  lastMessage?: {
    content: string;
    created_at: string;
    read: boolean;
    sender_id: string;
    message_type?: string;
  };
  unreadCount: number;
}

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadData();
      subscribeToRealTimeStats();
    }
  }, [user]);

  const subscribeToRealTimeStats = () => {
    if (!user) return;

    // Subscribe to follows changes
    const followsChannel = supabase
      .channel('follows-changes-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follows',
          filter: `following_id=eq.${user.id}`,
        },
        () => {
          loadFollowersCount();
        }
      )
      .subscribe();

    // Subscribe to posts changes
    const postsChannel = supabase
      .channel('posts-changes-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadPostsCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(followsChannel);
      supabase.removeChannel(postsChannel);
    };
  };

  const loadFollowersCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', user.id);
    setFollowersCount(count || 0);
  };

  const loadPostsCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    setPostsCount(count || 0);
  };

  const loadData = async () => {
    const startTime = Date.now();
    await Promise.all([loadProfile(), loadConversations(), loadFollowersCount(), loadPostsCount()]);
    
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, 1500 - elapsed);
    setTimeout(() => setLoading(false), remaining);
  };

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) setMyProfile(data);
  };

  const loadConversations = async () => {
    if (!user) return;

    try {
      // Get all messages where user is sender or receiver
      const { data: messages } = await supabase
        .from('messages')
        .select('sender_id, receiver_id, content, created_at, read, message_type')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (!messages) return;

      // Get unique conversation partners
      const partnerIds = new Set<string>();
      const latestMessages: Record<string, typeof messages[0]> = {};
      
      messages.forEach(msg => {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!latestMessages[partnerId]) {
          latestMessages[partnerId] = msg;
          partnerIds.add(partnerId);
        }
      });

      if (partnerIds.size === 0) {
        setConversations([]);
        return;
      }

      // Get profiles for all partners
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', Array.from(partnerIds));

      // Build conversations with unread counts
      const conversationsWithData = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', profile.id)
            .eq('receiver_id', user.id)
            .eq('read', false);

          return {
            ...profile,
            lastMessage: latestMessages[profile.id],
            unreadCount: unreadCount || 0,
          };
        })
      );

      // Sort by most recent message
      setConversations(conversationsWithData.sort((a, b) => {
        const aTime = a.lastMessage?.created_at || '0';
        const bTime = b.lastMessage?.created_at || '0';
        return bTime.localeCompare(aTime);
      }));
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const filteredConversations = conversations.filter(conv => 
    conv.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMessagePreview = (msg: Conversation['lastMessage']) => {
    if (!msg) return '';
    if (msg.message_type === 'image') return '📷 Foto';
    if (msg.message_type === 'video') return '🎥 Vídeo';
    if (msg.message_type === 'audio') return '🎤 Áudio';
    return msg.content;
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <MessagesSkeleton />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-background overflow-hidden">
        {/* Header - Dark theme like reference */}
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border"
        >
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold">Chats</h1>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => setShowSearch(!showSearch)}
              >
                <Search className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => navigate('/friends')}
              >
                <Edit className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
              >
                <Camera className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 pb-3 overflow-hidden"
              >
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar conversas..."
                  className="h-10 rounded-full bg-muted/50 border-0"
                  autoFocus
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.header>

        {/* My Profile Quick Access */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-4 border-b border-border/50"
        >
          <div 
            className="flex items-center gap-4 cursor-pointer"
            onClick={() => navigate(`/profile/${myProfile?.id}`)}
          >
            <div className="relative">
              <Avatar className="h-14 w-14 ring-2 ring-primary/20">
                <AvatarImage src={myProfile?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-lg font-semibold">
                  {myProfile?.first_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 rounded-full border-2 border-card" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-lg">{myProfile?.first_name}</p>
                {(myProfile?.verified || hasSpecialBadgeEmoji(myProfile?.username) || hasSpecialBadgeEmoji(myProfile?.full_name)) && (
                  <VerificationBadge verified={myProfile.verified} badgeType={myProfile.badge_type} username={myProfile?.username} fullName={myProfile?.full_name} className="w-5 h-5" />
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{followersCount} seguidores</span>
                <span>{postsCount} posts</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          {filteredConversations.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-80 p-6 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
                <Edit className="h-10 w-10 text-primary" />
              </div>
              <p className="text-lg font-semibold mb-2">Sem conversas</p>
              <p className="text-sm text-muted-foreground mb-4">Comece a conversar com alguém</p>
              <Button onClick={() => navigate('/friends')} className="rounded-full px-6">
                Encontrar pessoas
              </Button>
            </motion.div>
          ) : (
            <div className="pb-20">
              {filteredConversations.map((conv, index) => {
                const isUnread = conv.lastMessage && !conv.lastMessage.read && conv.lastMessage.sender_id === conv.id;
                const isOwnMessage = conv.lastMessage?.sender_id === user?.id;
                
                return (
                  <motion.button
                    key={conv.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/chat/${conv.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors active:bg-muted"
                  >
                    <div className="relative">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={conv.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-lg font-semibold">
                          {conv.first_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-card" />
                    </div>
                    
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <p className={`font-semibold truncate ${isUnread ? 'text-foreground' : 'text-foreground'}`}>
                            {conv.first_name}
                          </p>
                          {(conv.verified || hasSpecialBadgeEmoji(conv.username)) && (
                            <VerificationBadge verified={conv.verified} badgeType={conv.badge_type} username={conv.username} className="w-4 h-4" />
                          )}
                        </div>
                        {conv.lastMessage && (
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {formatDistanceToNow(new Date(conv.lastMessage.created_at), { locale: ptBR, addSuffix: false }).replace('cerca de ', '').replace('aproximadamente ', '')}
                          </span>
                        )}
                      </div>
                      {conv.lastMessage && (
                        <div className="flex items-center gap-1.5">
                          {isOwnMessage && (
                            conv.lastMessage.read ? (
                              <CheckCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />
                            ) : (
                              <Check className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )
                          )}
                          <p className={`text-sm truncate flex-1 ${isUnread ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                            {getMessagePreview(conv.lastMessage)}
                          </p>
                          {conv.unreadCount > 0 && (
                            <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="min-w-[20px] h-5 px-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center"
                            >
                              {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                            </motion.div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </ProtectedRoute>
  );
}
