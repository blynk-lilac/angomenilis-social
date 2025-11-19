import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Archive } from 'lucide-react';

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
    <MainLayout title="Angomenilis">
      <div className="flex flex-col h-full bg-background">
        {/* Search Bar */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Perguntar à Meta AI ou pesquisar"
              className="pl-10 bg-muted/50 border-none rounded-full h-10"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full whitespace-nowrap"
          >
            Todas
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full whitespace-nowrap"
          >
            Não lidas
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full whitespace-nowrap"
          >
            Favoritos
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full whitespace-nowrap"
          >
            Grupos
          </Button>
        </div>

        {/* Archived */}
        <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-full">
              <Archive className="h-5 w-5 text-primary" />
            </div>
            <span className="font-medium">Arquivadas</span>
          </div>
          <div className="text-sm text-muted-foreground">1</div>
        </button>

        <ScrollArea className="flex-1">
          <div>
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
        </ScrollArea>
      </div>
    </MainLayout>
  );
}
