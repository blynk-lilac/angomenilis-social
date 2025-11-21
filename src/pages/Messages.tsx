import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Plus, Settings } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { toast } from 'sonner';

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

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    await Promise.all([loadProfile(), loadFriends(), loadStories()]);
    setLoading(false);
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

  // Group stories by user
  const groupedStories = Object.values(
    stories.reduce((acc: Record<string, Story[]>, story) => {
      if (!acc[story.user_id]) acc[story.user_id] = [];
      acc[story.user_id].push(story);
      return acc;
    }, {})
  );

  const myStories = groupedStories.find(stories => stories[0].user_id === user?.id);

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
      <header className="sticky top-0 z-10 bg-card border-b border-border safe-area-top">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 cursor-pointer hover-scale" onClick={() => navigate('/profile')}>
              <AvatarImage src={myProfile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                {myProfile?.first_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-2xl font-bold">Chats</h1>
          </div>
          <button 
            onClick={() => navigate('/profile')}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <Settings className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/50 border-none rounded-full h-11"
          />
        </div>
      </div>

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
                <p className="text-xs text-center mt-1 w-16 truncate font-medium">Your Story</p>
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
      <ScrollArea className="flex-1 pb-16">
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
                    {/* Online indicator - você pode adicionar lógica real aqui */}
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
                          <div className="min-w-[20px] h-5 px-1.5 bg-destructive text-white text-xs font-bold rounded-full flex items-center justify-center">
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

      <BottomNav />
    </div>
  );
}
