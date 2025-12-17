import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPlus, UserCheck, Search, Users, ChevronRight, X } from 'lucide-react';
import { toast } from 'sonner';
import { useOnlineUsers } from '@/hooks/useOnlineUsers';
import { OnlineIndicator } from '@/components/OnlineIndicator';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import VerificationBadge from '@/components/VerificationBadge';

interface Profile {
  id: string;
  username: string;
  first_name: string;
  full_name: string | null;
  avatar_url: string | null;
  verified?: boolean;
  badge_type?: string | null;
}

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  sender: Profile;
}

interface MutualFriend {
  id: string;
  avatar_url: string | null;
  first_name: string;
}

export default function Friends() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const onlineUsers = useOnlineUsers();
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [friendProfiles, setFriendProfiles] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mutualFriendsMap, setMutualFriendsMap] = useState<{ [userId: string]: MutualFriend[] }>({});
  const [activeTab, setActiveTab] = useState('suggestions');
  
  // Calculate online friends count
  const onlineFriendsCount = friendProfiles.filter(u => onlineUsers.has(u.id)).length;

  useEffect(() => {
    if (user) {
      loadUsers();
      loadFriendRequests();
      loadFriends();
    }

    // Real-time subscription for friendships
    const channel = supabase
      .channel('friendships-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => {
        loadFriends();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, () => {
        loadFriendRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (allUsers.length > 0 && friends.length > 0) {
      loadMutualFriends();
    }
  }, [allUsers, friends]);

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, first_name, full_name, avatar_url, verified, badge_type')
      .neq('id', user?.id);
    
    if (data) setAllUsers(data);
  };

  const loadFriendRequests = async () => {
    if (!user) return;

    const { data: received } = await supabase
      .from('friend_requests')
      .select(`
        *,
        sender:profiles!friend_requests_sender_id_fkey(id, username, first_name, full_name, avatar_url, verified, badge_type)
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

      // Load friend profiles
      if (friendIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, first_name, full_name, avatar_url, verified, badge_type')
          .in('id', friendIds);
        
        if (profiles) setFriendProfiles(profiles);
      }
    }
  };

  const loadMutualFriends = async () => {
    if (!user || friends.length === 0) return;

    const mutualMap: { [userId: string]: MutualFriend[] } = {};

    // For each non-friend user, find mutual friends
    for (const profile of allUsers) {
      if (friends.includes(profile.id)) continue;

      const { data: theirFriendships } = await supabase
        .from('friendships')
        .select('user_id_1, user_id_2')
        .or(`user_id_1.eq.${profile.id},user_id_2.eq.${profile.id}`);

      if (theirFriendships) {
        const theirFriends = theirFriendships.map(f => 
          f.user_id_1 === profile.id ? f.user_id_2 : f.user_id_1
        );

        const mutual = friends.filter(f => theirFriends.includes(f));
        
        if (mutual.length > 0) {
          const mutualProfiles = friendProfiles
            .filter(fp => mutual.includes(fp.id))
            .slice(0, 3)
            .map(fp => ({
              id: fp.id,
              avatar_url: fp.avatar_url,
              first_name: fp.first_name
            }));
          
          mutualMap[profile.id] = mutualProfiles;
        }
      }
    }

    setMutualFriendsMap(mutualMap);
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

  const navigateToProfile = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  // Filter users by search query
  const filteredUsers = allUsers.filter(profile => 
    profile.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFriends = friendProfiles.filter(profile =>
    profile.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout title="Amigos">
      <div className="max-w-2xl mx-auto pb-20">
        {/* Header with Search */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b">
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Pesquisar pessoas"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 bg-muted/40 border-0 rounded-full h-11 text-[15px] focus-visible:ring-1 focus-visible:ring-primary/30"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-3 px-4 py-2 border-t border-border/50">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-primary">{onlineFriendsCount} online</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{friends.length} amigos</span>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-transparent border-b rounded-none h-auto p-0">
            <TabsTrigger 
              value="suggestions"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-12 text-sm font-semibold"
            >
              Sugestões
            </TabsTrigger>
            <TabsTrigger 
              value="friends"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-12 text-sm font-semibold"
            >
              Amigos ({friends.length})
            </TabsTrigger>
            <TabsTrigger 
              value="requests"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-12 text-sm font-semibold relative"
            >
              Pedidos
              {friendRequests.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                  {friendRequests.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions" className="mt-0">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="divide-y divide-border/30">
                <AnimatePresence>
                  {filteredUsers.filter(p => !friends.includes(p.id)).map((profile, index) => {
                    const requestSent = sentRequests.includes(profile.id);
                    const mutualFriends = mutualFriendsMap[profile.id] || [];

                    return (
                      <motion.div
                        key={profile.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div 
                          className="relative cursor-pointer"
                          onClick={() => navigateToProfile(profile.id)}
                        >
                          <Avatar className="h-14 w-14 border-2 border-border/50">
                            <AvatarImage src={profile.avatar_url || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-lg font-bold">
                              {profile.first_name?.[0] || profile.username?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <OnlineIndicator userId={profile.id} size="md" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div 
                              className="min-w-0 flex-1 cursor-pointer"
                              onClick={() => navigateToProfile(profile.id)}
                            >
                              <div className="flex items-center gap-1">
                                <p className="font-bold text-[15px] truncate hover:underline">
                                  {profile.full_name || profile.first_name}
                                </p>
                                {profile.verified && (
                                  <VerificationBadge verified={profile.verified} badgeType={profile.badge_type} size="sm" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">@{profile.username}</p>
                              
                              {/* Mutual Friends with Avatars */}
                              {mutualFriends.length > 0 && (
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="flex -space-x-2">
                                    {mutualFriends.map((mf) => (
                                      <Avatar key={mf.id} className="h-6 w-6 border-2 border-background">
                                        <AvatarImage src={mf.avatar_url || undefined} />
                                        <AvatarFallback className="text-[10px] bg-muted">
                                          {mf.first_name?.[0]}
                                        </AvatarFallback>
                                      </Avatar>
                                    ))}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {mutualFriends.length} amigo{mutualFriends.length > 1 ? 's' : ''} em comum
                                  </span>
                                </div>
                              )}
                            </div>

                            {requestSent ? (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                disabled 
                                className="h-9 px-4 rounded-full text-xs font-bold shrink-0"
                              >
                                Pendente
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => sendFriendRequest(profile.id)}
                                className="h-9 px-4 rounded-full text-xs font-bold shrink-0"
                              >
                                <UserPlus className="h-4 w-4 mr-1" />
                                Adicionar
                              </Button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Friends Tab */}
          <TabsContent value="friends" className="mt-0">
            <ScrollArea className="h-[calc(100vh-280px)]">
              {filteredFriends.length === 0 ? (
                <div className="text-center py-20 px-4">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
                  <h3 className="text-xl font-bold mb-2">Nenhum amigo ainda</h3>
                  <p className="text-muted-foreground text-sm">
                    Adicione amigos para vê-los aqui
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  <AnimatePresence>
                    {filteredFriends.map((profile, index) => (
                      <motion.div
                        key={profile.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => navigateToProfile(profile.id)}
                      >
                        <div className="relative">
                          <Avatar className="h-14 w-14 border-2 border-border/50">
                            <AvatarImage src={profile.avatar_url || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-lg font-bold">
                              {profile.first_name?.[0] || profile.username?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <OnlineIndicator userId={profile.id} size="md" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="font-bold text-[15px] truncate hover:underline">
                              {profile.full_name || profile.first_name}
                            </p>
                            {profile.verified && (
                              <VerificationBadge verified={profile.verified} badgeType={profile.badge_type} size="sm" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">@{profile.username}</p>
                          {onlineUsers.has(profile.id) && (
                            <span className="text-xs text-green-500 font-medium">Online agora</span>
                          )}
                        </div>

                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="mt-0">
            <ScrollArea className="h-[calc(100vh-280px)]">
              {friendRequests.length === 0 ? (
                <div className="text-center py-20 px-4">
                  <UserPlus className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
                  <h3 className="text-xl font-bold mb-2">Nenhum pedido</h3>
                  <p className="text-muted-foreground text-sm">
                    Quando alguém te enviar um pedido de amizade, ele aparecerá aqui.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  <AnimatePresence>
                    {friendRequests.map((request, index) => (
                      <motion.div
                        key={request.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div 
                            className="relative cursor-pointer"
                            onClick={() => navigateToProfile(request.sender.id)}
                          >
                            <Avatar className="h-14 w-14 border-2 border-border/50">
                              <AvatarImage src={request.sender.avatar_url || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-lg font-bold">
                                {request.sender.first_name?.[0] || request.sender.username?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <OnlineIndicator userId={request.sender.id} size="md" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div 
                              className="cursor-pointer"
                              onClick={() => navigateToProfile(request.sender.id)}
                            >
                              <div className="flex items-center gap-1">
                                <p className="font-bold text-[15px] truncate hover:underline">
                                  {request.sender.full_name || request.sender.first_name}
                                </p>
                                {request.sender.verified && (
                                  <VerificationBadge verified={request.sender.verified} badgeType={request.sender.badge_type} size="sm" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">@{request.sender.username}</p>
                            </div>

                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                onClick={() => acceptFriendRequest(request.id, request.sender_id)}
                                className="flex-1 h-9 rounded-full font-bold"
                              >
                                Aceitar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => rejectFriendRequest(request.id)}
                                className="flex-1 h-9 rounded-full font-bold"
                              >
                                Rejeitar
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
