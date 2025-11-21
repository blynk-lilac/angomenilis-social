import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, UserPlus, Heart, MessageCircle, UserCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    // Load friend requests
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

    // Load notifications
    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (notifs) {
      setNotifications(notifs);
      
      // Mark as read
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
      // Update request status
      await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      // Create friendship
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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-5 w-5 text-destructive" />;
      case 'comment':
        return <MessageCircle className="h-5 w-5 text-primary" />;
      case 'follow':
        return <UserPlus className="h-5 w-5 text-accent" />;
      default:
        return <UserCheck className="h-5 w-5 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => navigate(-1)} className="mr-3">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">Notificações</h1>
        </div>
      </header>

      <ScrollArea className="flex-1">
        {/* Friend Requests Section */}
        {friendRequests.length > 0 && (
          <div className="border-b border-border pb-2">
            <h2 className="text-sm font-semibold text-muted-foreground px-4 py-3">
              Pedidos de Amizade
            </h2>
            {friendRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50"
              >
                <Avatar
                  className="h-14 w-14 cursor-pointer"
                  onClick={() => navigate(`/profile/${request.sender.username}`)}
                >
                  <AvatarImage src={request.sender.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
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
                      className="flex-1"
                    >
                      Aceitar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectRequest(request.id)}
                      className="flex-1"
                    >
                      Rejeitar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notifications Section */}
        {notifications.length > 0 ? (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground px-4 py-3">
              Atividades
            </h2>
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  if (notif.related_id) {
                    navigate(`/post/${notif.related_id}`);
                  }
                }}
                className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer ${
                  !notif.is_read ? 'bg-primary/5' : ''
                }`}
              >
                {notif.avatar_url ? (
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={notif.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {notif.message[0]}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    {getNotificationIcon(notif.type)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{notif.title}</p>
                  <p className="text-sm text-muted-foreground">{notif.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notif.created_at), {
                      locale: ptBR,
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          friendRequests.length === 0 && (
            <div className="flex flex-col items-center justify-center h-96 p-6 text-center">
              <p className="text-muted-foreground mb-2">Sem notificações</p>
              <p className="text-sm text-muted-foreground">
                Você será notificado quando houver atividades
              </p>
            </div>
          )
        )}
      </ScrollArea>
    </div>
  );
}
