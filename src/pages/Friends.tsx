import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { UserPlus, UserCheck, Clock, Search } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');

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

    const { data: received } = await supabase
      .from('friend_requests')
      .select(`
        *,
        sender:profiles!friend_requests_sender_id_fkey(*)
      `)
      .eq('receiver_id', user.id)
      .eq('status', 'pending');

    if (received) setFriendRequests(received as any);

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

    await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

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

  // Filter users by search query
  const filteredUsers = allUsers.filter(profile => 
    profile.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout title="Amigos">
      <div className="p-3">
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Pesquisa"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 border-none rounded-xl h-12"
            />
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-3">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="requests">
              Pedidos {friendRequests.length > 0 && `(${friendRequests.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <div className="space-y-2">
              {filteredUsers.map((profile) => {
                const isFriend = friends.includes(profile.id);
                const requestSent = sentRequests.includes(profile.id);

                return (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {profile.first_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-foreground truncate">{profile.first_name}</p>
                        <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
                      </div>
                    </div>

                    {isFriend ? (
                      <Button variant="secondary" size="sm" disabled className="ml-2 h-8 text-xs">
                        <UserCheck className="h-3 w-3 mr-1" />
                        Amigos
                      </Button>
                    ) : requestSent ? (
                      <Button variant="outline" size="sm" disabled className="ml-2 h-8 text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Pendente
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => sendFriendRequest(profile.id)}
                        className="ml-2 h-8 text-xs"
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
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
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">Sem pedidos de amizade</p>
              </div>
            ) : (
              <div className="space-y-2">
                {friendRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={request.sender.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {request.sender.first_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-foreground truncate">{request.sender.first_name}</p>
                        <p className="text-xs text-muted-foreground truncate">@{request.sender.username}</p>
                      </div>
                    </div>

                    <div className="flex gap-1.5 ml-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => acceptFriendRequest(request.id, request.sender_id)}
                        className="h-8 text-xs px-3"
                      >
                        Aceitar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => rejectFriendRequest(request.id)}
                        className="h-8 text-xs px-3"
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
      </div>
    </MainLayout>
  );
}
