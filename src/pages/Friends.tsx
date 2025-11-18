import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, UserCheck, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  id: string;
  username: string;
  first_name: string;
  avatar_url: string | null;
}

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  sender: Profile;
}

export default function Friends() {
  const { user } = useAuth();
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [friends, setFriends] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadUsers();
      loadFriendRequests();
      loadFriends();
    }
  }, [user]);

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user?.id);
    
    if (data) setAllUsers(data);
  };

  const loadFriendRequests = async () => {
    if (!user) return;

    // Received requests
    const { data: received } = await supabase
      .from('friend_requests')
      .select(`
        *,
        sender:profiles!friend_requests_sender_id_fkey(*)
      `)
      .eq('receiver_id', user.id)
      .eq('status', 'pending');

    if (received) setFriendRequests(received as any);

    // Sent requests
    const { data: sent } = await supabase
      .from('friend_requests')
      .select('receiver_id')
      .eq('sender_id', user.id)
      .eq('status', 'pending');

    if (sent) setSentRequests(sent.map(r => r.receiver_id));
  };

  const loadFriends = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('friendships')
      .select('user_id_1, user_id_2')
      .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

    if (data) {
      const friendIds = data.map(f => 
        f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1
      );
      setFriends(friendIds);
    }
  };

  const sendFriendRequest = async (receiverId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
      });

    if (error) {
      toast.error('Erro ao enviar pedido');
    } else {
      toast.success('Pedido de amizade enviado!');
      setSentRequests([...sentRequests, receiverId]);
    }
  };

  const acceptFriendRequest = async (requestId: string, senderId: string) => {
    if (!user) return;

    // Update request status
    await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    // Create friendship
    const [userId1, userId2] = [user.id, senderId].sort();
    await supabase
      .from('friendships')
      .insert({
        user_id_1: userId1,
        user_id_2: userId2,
      });

    toast.success('Pedido aceito!');
    loadFriendRequests();
    loadFriends();
  };

  const rejectFriendRequest = async (requestId: string) => {
    await supabase
      .from('friend_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    toast.success('Pedido rejeitado');
    loadFriendRequests();
  };

  return (
    <MainLayout title="Amigos">
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sticky top-14 z-10 bg-background">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="requests" className="relative">
            Pedidos
            {friendRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                {friendRequests.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <div className="divide-y divide-border">
            {allUsers.map((profile) => {
              const isFriend = friends.includes(profile.id);
              const requestSent = sentRequests.includes(profile.id);

              return (
                <div
                  key={profile.id}
                  className="flex items-center gap-3 p-4"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {profile.first_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{profile.first_name}</p>
                    <p className="text-sm text-muted-foreground">@{profile.username}</p>
                  </div>

                  {isFriend ? (
                    <Button variant="secondary" size="sm" disabled>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Amigos
                    </Button>
                  ) : requestSent ? (
                    <Button variant="secondary" size="sm" disabled>
                      <Clock className="h-4 w-4 mr-2" />
                      Enviado
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => sendFriendRequest(profile.id)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="requests" className="mt-0">
          {friendRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 p-6 text-center">
              <p className="text-muted-foreground">
                Nenhum pedido de amizade
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {friendRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-3 p-4"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={request.sender.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {request.sender.first_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{request.sender.first_name}</p>
                    <p className="text-sm text-muted-foreground">@{request.sender.username}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => acceptFriendRequest(request.id, request.sender_id)}
                    >
                      Aceitar
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => rejectFriendRequest(request.id)}
                    >
                      Rejeitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
