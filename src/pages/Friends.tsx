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
      <div className="max-w-2xl mx-auto">
        {/* Search Bar - Estilo Twitter */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b px-4 py-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Pesquisar pessoas"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 bg-muted/30 border-border/50 rounded-full h-11 text-[15px] focus-visible:ring-1 focus-visible:ring-primary/30 transition-all"
            />
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-transparent border-b rounded-none h-auto p-0">
            <TabsTrigger 
              value="all"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-14 text-[15px] font-semibold"
            >
              Sugestões
            </TabsTrigger>
            <TabsTrigger 
              value="requests"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-14 text-[15px] font-semibold relative"
            >
              Pedidos 
              {friendRequests.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                  {friendRequests.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <div className="divide-y divide-border/40">
              {filteredUsers.map((profile) => {
                const isFriend = friends.includes(profile.id);
                const requestSent = sentRequests.includes(profile.id);

                return (
                  <div
                    key={profile.id}
                    className="flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors"
                  >
                    <Avatar className="h-12 w-12 flex-shrink-0 border border-border/50">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-foreground font-bold">
                        {profile.first_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-[15px] text-foreground truncate hover:underline cursor-pointer">
                            {profile.first_name}
                          </p>
                          <p className="text-[15px] text-muted-foreground truncate">@{profile.username}</p>
                        </div>

                        {isFriend ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            disabled 
                            className="h-8 px-4 rounded-full border-border/60 text-xs font-bold"
                          >
                            Amigos
                          </Button>
                        ) : requestSent ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            disabled 
                            className="h-8 px-4 rounded-full border-border/60 text-xs font-bold"
                          >
                            Pendente
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => sendFriendRequest(profile.id)}
                            className="h-8 px-4 rounded-full text-xs font-bold hover:opacity-90 transition-opacity"
                          >
                            Seguir
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="requests" className="mt-0">
            {friendRequests.length === 0 ? (
              <div className="text-center py-20 px-4">
                <div className="max-w-xs mx-auto">
                  <UserPlus className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
                  <h3 className="text-2xl font-bold mb-2">Nenhum pedido</h3>
                  <p className="text-muted-foreground text-[15px]">
                    Quando alguém te enviar um pedido de amizade, ele aparecerá aqui.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {friendRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors"
                  >
                    <Avatar className="h-12 w-12 flex-shrink-0 border border-border/50">
                      <AvatarImage src={request.sender.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-foreground font-bold">
                        {request.sender.first_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-[15px] text-foreground truncate hover:underline cursor-pointer">
                            {request.sender.first_name}
                          </p>
                          <p className="text-[15px] text-muted-foreground truncate">@{request.sender.username}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => acceptFriendRequest(request.id, request.sender_id)}
                          className="flex-1 h-9 rounded-full text-sm font-bold hover:opacity-90"
                        >
                          Aceitar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => rejectFriendRequest(request.id)}
                          className="flex-1 h-9 rounded-full text-sm font-bold border-border/60"
                        >
                          Rejeitar
                        </Button>
                      </div>
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
