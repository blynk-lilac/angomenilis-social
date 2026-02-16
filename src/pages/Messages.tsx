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
import { Search, ArrowLeft, Edit, Check, CheckCheck, Camera, SlidersHorizontal, ChevronDown, TrendingUp } from 'lucide-react';
import { MessagesSkeleton } from '@/components/loading/MessagesSkeleton';
import { motion, AnimatePresence } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';
import VerificationBadge, { hasSpecialBadgeEmoji } from '@/components/VerificationBadge';
import BottomNav from '@/components/BottomNav';

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
  const [activeTab, setActiveTab] = useState('principal');

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    await Promise.all([loadProfile(), loadConversations()]);
    setLoading(false);
  };

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) setMyProfile(data);
  };

  const loadConversations = async () => {
    if (!user) return;
    try {
      const { data: messages } = await supabase
        .from('messages')
        .select('sender_id, receiver_id, content, created_at, read, message_type')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (!messages) return;

      const partnerIds = new Set<string>();
      const latestMessages: Record<string, typeof messages[0]> = {};
      
      messages.forEach(msg => {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!latestMessages[partnerId]) {
          latestMessages[partnerId] = msg;
          partnerIds.add(partnerId);
        }
      });

      if (partnerIds.size === 0) { setConversations([]); return; }

      const { data: profiles } = await supabase.from('profiles').select('*').in('id', Array.from(partnerIds));

      const conversationsWithData = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', profile.id)
            .eq('receiver_id', user.id)
            .eq('read', false);

          return { ...profile, lastMessage: latestMessages[profile.id], unreadCount: unreadCount || 0 };
        })
      );

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
    if (msg.message_type === 'image') return 'Foto';
    if (msg.message_type === 'video') return 'Vídeo';
    if (msg.message_type === 'audio') return 'Áudio';
    return msg.content;
  };

  const getTimeAgo = (date: string) => {
    return formatDistanceToNow(new Date(date), { locale: ptBR, addSuffix: false })
      .replace('cerca de ', '')
      .replace('aproximadamente ', '');
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  if (loading) {
    return <ProtectedRoute><MessagesSkeleton /></ProtectedRoute>;
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-background overflow-hidden">
        {/* Instagram DM Header */}
        <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between h-12 px-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-1">
                <h1 className="text-lg font-bold">{myProfile?.username || 'Chats'}</h1>
                <ChevronDown className="h-4 w-4" />
                {totalUnread > 0 && (
                  <span className="ml-1 h-2 w-2 rounded-full bg-red-500" />
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate('/friends')}>
                <TrendingUp className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate('/friends')}>
                <Edit className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar"
                className="h-9 pl-9 rounded-xl bg-muted/50 border-0 text-sm"
              />
            </div>
          </div>

          {/* Tabs - Instagram DM style */}
          <div className="flex items-center gap-2 px-4 pb-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            {['principal', 'pedidos', 'geral'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {tab === 'principal' && totalUnread > 0 && activeTab !== tab && (
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 mr-1" />
                )}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'principal' && totalUnread > 0 && ` ${totalUnread}`}
              </button>
            ))}
          </div>
        </header>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          {filteredConversations.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-80 p-6 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <Edit className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold mb-2">Sem conversas</p>
              <p className="text-sm text-muted-foreground mb-4">Comece a conversar com alguém</p>
              <Button onClick={() => navigate('/friends')} className="rounded-full px-6">
                Encontrar pessoas
              </Button>
            </motion.div>
          ) : (
            <div className="pb-16">
              {filteredConversations.map((conv, index) => {
                const isUnread = conv.lastMessage && !conv.lastMessage.read && conv.lastMessage.sender_id === conv.id;
                const isOwnMessage = conv.lastMessage?.sender_id === user?.id;

                return (
                  <motion.button
                    key={conv.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => navigate(`/chat/${conv.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors active:bg-muted/50"
                  >
                    <div className="relative">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={conv.avatar_url || undefined} className="object-cover" />
                        <AvatarFallback className="bg-muted text-lg font-semibold">
                          {conv.first_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-card" />
                    </div>

                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-semibold text-sm truncate ${isUnread ? 'text-foreground' : 'text-foreground'}`}>
                          {conv.first_name}
                        </span>
                        {(conv.verified || hasSpecialBadgeEmoji(conv.username)) && (
                          <VerificationBadge verified={conv.verified} badgeType={conv.badge_type} username={conv.username} className="w-4 h-4" />
                        )}
                      </div>
                      {conv.lastMessage && (
                        <div className="flex items-center gap-1">
                          {isOwnMessage && (
                            conv.lastMessage.read
                              ? <CheckCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                              : <Check className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className={`text-xs truncate ${isUnread ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                            {getMessagePreview(conv.lastMessage)}
                          </span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            · {getTimeAgo(conv.lastMessage.created_at)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {conv.unreadCount > 0 && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                      <Camera className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
