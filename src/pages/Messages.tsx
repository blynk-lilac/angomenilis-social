import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Friend {
  id: string;
  username: string;
  first_name: string;
  avatar_url: string | null;
  lastMessage?: {
    content: string;
    created_at: string;
    read: boolean;
  };
}

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadFriends();
    }
  }, [user]);

  const loadFriends = async () => {
    if (!user) return;

    try {
      // Get friendships
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select(`
          id,
          user_id_1,
          user_id_2
        `)
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

      if (error) throw error;

      // Get friend profiles
      const friendIds = friendships?.map(f => 
        f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1
      ) || [];

      if (friendIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', friendIds);

      // Get last messages
      const friendsWithMessages = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: messages } = await supabase
            .from('messages')
            .select('content, created_at, read')
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${profile.id}),and(sender_id.eq.${profile.id},receiver_id.eq.${user.id})`)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            ...profile,
            lastMessage: messages?.[0]
          };
        })
      );

      setFriends(friendsWithMessages);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Mensagens">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </MainLayout>
    );
  }

  if (friends.length === 0) {
    return (
      <MainLayout title="Mensagens">
        <div className="flex flex-col items-center justify-center h-96 p-6 text-center">
          <p className="text-muted-foreground mb-4">
            Você ainda não tem conversas
          </p>
          <p className="text-sm text-muted-foreground">
            Adicione amigos para começar a conversar
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Mensagens">
      <div className="divide-y divide-border">
        {friends.map((friend) => (
          <button
            key={friend.id}
            onClick={() => navigate(`/chat/${friend.id}`)}
            className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
          >
            <Avatar className="h-12 w-12">
              <AvatarImage src={friend.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {friend.first_name[0]}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-left">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground">{friend.first_name}</p>
                {friend.lastMessage && (
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(friend.lastMessage.created_at), {
                      locale: ptBR,
                      addSuffix: true
                    })}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">@{friend.username}</p>
              {friend.lastMessage && (
                <p className={`text-sm truncate ${!friend.lastMessage.read ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                  {friend.lastMessage.content}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </MainLayout>
  );
}
