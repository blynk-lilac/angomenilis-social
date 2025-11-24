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
import { Search, Plus, Settings, UserPlus } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { toast } from 'sonner';
import { MessagesSkeleton } from '@/components/loading/MessagesSkeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Friend {
  id: string;
  username: string;
  first_name: string;
  avatar_url: string | null;
  lastMessage?: {
    content: string;
    created_at: string;
    read: boolean;
    sender_id: string;
  };
  unreadCount: number;
}

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  profile: {
    username: string;
    first_name: string;
    avatar_url: string | null;
  };
}

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [channels, setChannels] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("chats");

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    const startTime = Date.now();
    await Promise.all([loadProfile(), loadFriends(), loadStories(), loadChannels()]);
    
    // Garantir no mínimo 3 segundos de loading
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, 3000 - elapsed);
    setTimeout(() => {
      setLoading(false);
    }, remaining);
  };

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (data) setMyProfile(data);
  };

  const loadChannels = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('channels')
      .select(`
        *,
        channel_followers!inner(user_id),
        profiles:created_by(username, avatar_url)
      `)
      .eq('channel_followers.user_id', user.id);
    
    if (data) setChannels(data);
  };

  const loadStories = async () => {
    const { data } = await supabase
      .from('stories')
      .select(`
        *,
        profile:profiles(username, first_name, avatar_url)
      `)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (data) {
      setStories(data as any);
    }
  };

  const loadFriends = async () => {
    if (!user) return;

    try {
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select(`
          id,
          user_id_1,
          user_id_2
        `)
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

      if (error) throw error;

      const friendIds = friendships?.map(f => 
        f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1
      ) || [];

      if (friendIds.length === 0) return;

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', friendIds);

      const friendsWithMessages = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: messages } = await supabase
            .from('messages')
            .select('content, created_at, read, sender_id')
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${profile.id}),and(sender_id.eq.${profile.id},receiver_id.eq.${user.id})`)
            .order('created_at', { ascending: false })
            .limit(1);

          // Count unread messages from this friend
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', profile.id)
            .eq('receiver_id', user.id)
            .eq('read', false);

          return {
            ...profile,
            lastMessage: messages?.[0],
            unreadCount: unreadCount || 0
          };
        })
      );

      setFriends(friendsWithMessages.sort((a, b) => {
        const aTime = a.lastMessage?.created_at || '0';
        const bTime = b.lastMessage?.created_at || '0';
        return bTime.localeCompare(aTime);
      }));
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const handleStoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;

    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const mediaType = file.type.startsWith('image/') ? 'image' : 'video';

    setUploading(true);

    try {
      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('stories')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          media_url: publicUrl,
          media_type: mediaType,
        });

      if (insertError) throw insertError;

      toast.success('Story publicada!');
      loadStories();
    } catch (error) {
      console.error('Error uploading story:', error);
      toast.error('Erro ao publicar story');
    } finally {
      setUploading(false);
    }
  };

  const filteredFriends = friends.filter(friend => 
    friend.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedStories = Object.values(
    stories.reduce((acc: Record<string, Story[]>, story) => {
      if (!acc[story.user_id]) acc[story.user_id] = [];
      acc[story.user_id].push(story);
      return acc;
    }, {})
  );

  const myStories = groupedStories.find(stories => stories[0].user_id === user?.id);

  if (loading) {
    return <MessagesSkeleton />;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border safe-area-top">
        <div className="flex items-center justify-between h-14 px-4">
          <h1 className="text-2xl font-bold">Mensagens</h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/profile')}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <Settings className="h-6 w-6" />
            </button>
            <button 
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <Search className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b-0 bg-transparent h-12 px-4 gap-6">
            <TabsTrigger 
              value="chats" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent font-semibold data-[state=active]:shadow-none pb-3"
            >
              Chats
            </TabsTrigger>
            <TabsTrigger 
              value="canais" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent font-semibold data-[state=active]:shadow-none pb-3"
            >
              Canais
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <Tabs value={activeTab} className="flex-1 flex flex-col">
        {/* Chats Tab */}
        <TabsContent value="chats" className="flex-1 mt-0 flex flex-col">
          {/* Stories */}
          <div className="px-4 py-3 border-b border-border">
            <ScrollArea className="w-full">
              <div className="flex gap-3 pb-2">
                {/* Your Story */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <label htmlFor="story-upload" className="cursor-pointer">
                    <div className="relative">
                      <Avatar className="h-16 w-16 border-2 border-muted">
                        <AvatarImage src={myProfile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-muted">
                          {myProfile?.first_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-0 right-0 h-6 w-6 bg-primary rounded-full flex items-center justify-center border-2 border-card">
                        <Plus className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <p className="text-xs text-center mt-1 w-16 truncate font-medium">A tua nota</p>
                  </label>
                  <Input
                    id="story-upload"
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleStoryUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </div>

                {/* Friends Stories */}
                {groupedStories.filter(stories => stories[0].user_id !== user?.id).map((userStories) => {
                  const story = userStories[0];
                  return (
                    <div
                      key={story.user_id}
                      onClick={() => navigate('/stories')}
                      className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer hover-scale"
                    >
                      <div className="relative">
                        <div className="p-0.5 rounded-full bg-gradient-to-tr from-primary via-accent to-primary">
                          <Avatar className="h-16 w-16 border-[3px] border-card">
                            <AvatarImage src={story.profile.avatar_url || undefined} />
                            <AvatarFallback className="bg-muted">
                              {story.profile.first_name[0]}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                      <p className="text-xs text-center mt-1 w-16 truncate font-medium">
                        {story.profile.first_name}
                      </p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Conversations */}
          <ScrollArea className="flex-1">
            {filteredFriends.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 p-6 text-center">
                <p className="text-muted-foreground mb-2">
                  Nenhuma conversa
                </p>
                <p className="text-sm text-muted-foreground">
                  Adicione amigos para começar a conversar
                </p>
              </div>
            ) : (
              <div>
                {filteredFriends.map((friend) => {
                  const isUnread = friend.lastMessage && 
                                 !friend.lastMessage.read && 
                                 friend.lastMessage.sender_id === friend.id;
                  
                  return (
                    <button
                      key={friend.id}
                      onClick={() => navigate(`/chat/${friend.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors active:bg-muted"
                    >
                      <div className="relative">
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={friend.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                            {friend.first_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 rounded-full border-[3px] border-card" />
                      </div>
                      
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className={`font-semibold truncate ${isUnread ? 'text-foreground' : 'text-foreground'}`}>
                            {friend.first_name}
                          </p>
                          {friend.lastMessage && (
                            <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                              {formatDistanceToNow(new Date(friend.lastMessage.created_at), {
                                locale: ptBR,
                                addSuffix: false
                              }).replace('cerca de ', '').replace('aproximadamente ', '')}
                            </span>
                          )}
                        </div>
                        {friend.lastMessage && (
                          <div className="flex items-center gap-2">
                            <p className={`text-sm truncate flex-1 ${isUnread ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                              {friend.lastMessage.content}
                            </p>
                            {friend.unreadCount > 0 && (
                              <div className="min-w-[20px] h-5 px-1.5 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center">
                                {friend.unreadCount > 15 ? '15+' : friend.unreadCount}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Canais Tab */}
        <TabsContent value="canais" className="flex-1 mt-0 flex flex-col">
          <ScrollArea className="flex-1">
            {channels.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 p-6 text-center">
                <p className="text-muted-foreground mb-2">
                  Nenhum canal
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Entre num canal para começar a receber atualizações
                </p>
                <Button onClick={() => navigate('/channels')} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Explorar Canais
                </Button>
              </div>
            ) : (
              <div>
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => navigate(`/channel/${channel.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors active:bg-muted"
                  >
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={channel.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                        {channel.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-semibold truncate">{channel.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        Canal · {channel.follower_count || 0} membro(s)
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* FAB - Floating Action Button */}
      <button
        onClick={() => navigate(activeTab === 'chats' ? '/groups/new' : '/channels/create')}
        className="fixed bottom-20 right-6 h-14 w-14 bg-primary hover:bg-primary/90 text-white rounded-full shadow-lg flex items-center justify-center z-20 transition-transform hover:scale-110 active:scale-95"
      >
        <Plus className="h-6 w-6" />
      </button>

      <BottomNav />
    </div>
  );
}
