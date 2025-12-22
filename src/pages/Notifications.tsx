import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, UserPlus, Heart, MessageCircle, UserCheck, Check, Search, MoreHorizontal, Bell, ThumbsUp, Share2, AtSign } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface FriendRequest {
  id: string;
  sender_id: string;
  created_at: string;
  sender: {
    first_name: string;
    avatar_url: string | null;
    username: string;
  };
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  related_id: string | null;
  avatar_url: string | null;
}

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    const { data: requests } = await supabase
      .from('friend_requests')
      .select(`
        id,
        sender_id,
        created_at,
        sender:profiles!friend_requests_sender_id_fkey(first_name, avatar_url, username)
      `)
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (requests) {
      setFriendRequests(requests as any);
    }

    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (notifs) {
      setNotifications(notifs);
      
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
    }

    setLoading(false);
  };

  const handleAcceptRequest = async (requestId: string, senderId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      await supabase.from('friendships').insert({
        user_id_1: user.id,
        user_id_2: senderId,
      });

      toast.success('Pedido de amizade aceito!');
      loadData();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast.error('Erro ao aceitar pedido');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      toast.success('Pedido rejeitado');
      loadData();
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      toast.error('Erro ao rejeitar pedido');
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id);
    
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success('Todas as notificações marcadas como lidas');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
      case 'post_like':
        return (
          <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center">
            <Heart className="h-4 w-4 text-red-500" />
          </div>
        );
      case 'reaction':
      case 'story_reaction':
        return (
          <div className="h-8 w-8 rounded-full bg-pink-500/20 flex items-center justify-center">
            <ThumbsUp className="h-4 w-4 text-pink-500" />
          </div>
        );
      case 'comment':
        return (
          <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
            <MessageCircle className="h-4 w-4 text-blue-500" />
          </div>
        );
      case 'follow':
        return (
          <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
            <UserPlus className="h-4 w-4 text-purple-500" />
          </div>
        );
      case 'mention':
        return (
          <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
            <AtSign className="h-4 w-4 text-green-500" />
          </div>
        );
      case 'share':
        return (
          <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center">
            <Share2 className="h-4 w-4 text-orange-500" />
          </div>
        );
      case 'message':
        return (
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <MessageCircle className="h-4 w-4 text-primary" />
          </div>
        );
      default:
        return (
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <Bell className="h-4 w-4 text-muted-foreground" />
          </div>
        );
    }
  };

  const getTypeIndicator = (type: string) => {
    switch (type) {
      case 'like':
      case 'post_like':
        return <Heart className="h-4 w-4 text-red-500 fill-red-500" />;
      case 'reaction':
      case 'story_reaction':
        return <span className="text-sm">❤️</span>;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-primary fill-primary" />;
      case 'follow':
        return <UserCheck className="h-4 w-4 text-orange-500" />;
      default:
        return null;
    }
  };

  const filteredNotifications = notifications.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const newNotifications = filteredNotifications.filter(n => !n.is_read);
  const oldNotifications = filteredNotifications.filter(n => n.is_read);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-muted transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold">Notificações</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={markAllAsRead}>
              <Check className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Search className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar notificações..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-muted/50 border-0 rounded-xl"
            />
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1">
        {/* Friend Requests Section */}
        {friendRequests.length > 0 && (
          <div className="border-b border-border pb-2">
            <h2 className="text-sm font-semibold text-muted-foreground px-4 py-3 flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Pedidos de Amizade
              <Badge variant="destructive" className="ml-auto">{friendRequests.length}</Badge>
            </h2>
            <AnimatePresence>
              {friendRequests.map((request, idx) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <Avatar
                    className="h-14 w-14 cursor-pointer ring-2 ring-primary/20"
                    onClick={() => navigate(`/profile/${request.sender.username}`)}
                  >
                    <AvatarImage src={request.sender.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {request.sender.first_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{request.sender.first_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(request.created_at), {
                        locale: ptBR,
                        addSuffix: true,
                      })}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        onClick={() => handleAcceptRequest(request.id, request.sender_id)}
                        className="flex-1 h-8 rounded-lg font-semibold"
                      >
                        Aceitar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectRequest(request.id)}
                        className="flex-1 h-8 rounded-lg font-semibold"
                      >
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* New Notifications */}
        {newNotifications.length > 0 && (
          <div className="border-b border-border">
            <h2 className="text-sm font-semibold text-muted-foreground px-4 py-3">
              Novas
            </h2>
            <AnimatePresence>
              {newNotifications.map((notif, idx) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => {
                    if (notif.related_id) {
                      if (notif.type === 'message') {
                        navigate(`/chat/${notif.related_id}`);
                      } else if (notif.type === 'follow') {
                        navigate(`/profile/${notif.related_id}`);
                      } else {
                        navigate(`/post/${notif.related_id}`);
                      }
                    }
                  }}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer bg-primary/5 transition-colors"
                >
                  <div className="relative flex-shrink-0">
                    {notif.avatar_url ? (
                      <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                        <AvatarImage src={notif.avatar_url} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {notif.message[0]}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      getNotificationIcon(notif.type)
                    )}
                    <div className="absolute -bottom-1 -right-1">
                      {getTypeIndicator(notif.type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-bold">{notif.title}</span>{' '}
                      <span className="text-muted-foreground">{notif.message}</span>
                    </p>
                    <p className="text-xs text-primary mt-1 font-medium">
                      {formatDistanceToNow(new Date(notif.created_at), {
                        locale: ptBR,
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full flex-shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Older Notifications */}
        {oldNotifications.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground px-4 py-3">
              Anteriores
            </h2>
            {oldNotifications.map((notif, idx) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.02 }}
                onClick={() => {
                  if (notif.related_id) {
                    if (notif.type === 'message') {
                      navigate(`/chat/${notif.related_id}`);
                    } else if (notif.type === 'follow') {
                      navigate(`/profile/${notif.related_id}`);
                    } else {
                      navigate(`/post/${notif.related_id}`);
                    }
                  }
                }}
                className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <div className="relative flex-shrink-0">
                  {notif.avatar_url ? (
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={notif.avatar_url} />
                      <AvatarFallback className="bg-muted">
                        {notif.message[0]}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    getNotificationIcon(notif.type)
                  )}
                  <div className="absolute -bottom-1 -right-1">
                    {getTypeIndicator(notif.type)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-semibold">{notif.title}</span>{' '}
                    <span className="text-muted-foreground">{notif.message}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notif.created_at), {
                      locale: ptBR,
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full flex-shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredNotifications.length === 0 && friendRequests.length === 0 && (
          <div className="flex flex-col items-center justify-center h-96 p-6 text-center">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Bell className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold mb-2">Sem notificações</p>
            <p className="text-sm text-muted-foreground">
              Você será notificado quando houver atividades
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
