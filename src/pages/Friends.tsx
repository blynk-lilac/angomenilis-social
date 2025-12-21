import { useEffect, useState, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Users, X, TrendingUp, Hash, Play, Grid3X3, Film, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { useOnlineUsers } from '@/hooks/useOnlineUsers';
import { OnlineIndicator } from '@/components/OnlineIndicator';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import VerificationBadge from '@/components/VerificationBadge';
import { Sheet, SheetContent } from '@/components/ui/sheet';

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

interface TrendingHashtag {
  id: string;
  name: string;
  post_count: number;
}

interface Video {
  id: string;
  video_url: string;
  caption: string | null;
  user_id: string;
  created_at: string;
  profile?: {
    username: string;
    first_name: string;
    avatar_url: string | null;
    verified?: boolean;
  };
}

interface Post {
  id: string;
  content: string;
  media_urls: string[] | null;
  user_id: string;
  created_at: string;
  profiles?: {
    username: string;
    first_name: string;
    avatar_url: string | null;
    verified?: boolean;
  };
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
  const [activeTab, setActiveTab] = useState('discover');
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>([]);
  const [trendingVideos, setTrendingVideos] = useState<Video[]>([]);
  const [searchResults, setSearchResults] = useState<{ users: Profile[]; videos: Video[]; posts: Post[] }>({ users: [], videos: [], posts: [] });
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [fullscreenSheet, setFullscreenSheet] = useState(false);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});
  
  const onlineFriendsCount = friendProfiles.filter(u => onlineUsers.has(u.id)).length;

  useEffect(() => {
    if (user) {
      loadUsers();
      loadFriendRequests();
      loadFriends();
      loadTrendingHashtags();
      loadTrendingVideos();
    }

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

  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch();
    } else {
      setSearchResults({ users: [], videos: [], posts: [] });
    }
  }, [searchQuery]);

  // Intersection Observer for video autoplay
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.5 }
    );

    Object.values(videoRefs.current).forEach((video) => {
      if (video) observer.observe(video);
    });

    return () => observer.disconnect();
  }, [trendingVideos]);

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

    for (const profile of allUsers.slice(0, 20)) {
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

  const loadTrendingHashtags = async () => {
    const { data } = await supabase
      .from('hashtags')
      .select('id, name, post_count')
      .order('post_count', { ascending: false })
      .limit(10);
    
    if (data) setTrendingHashtags(data);
  };

  const loadTrendingVideos = async () => {
    const { data } = await supabase
      .from('verification_videos')
      .select(`
        id, video_url, caption, user_id, created_at,
        profile:profiles!verification_videos_user_id_fkey(username, first_name, avatar_url, verified)
      `)
      .order('created_at', { ascending: false })
      .limit(12);
    
    if (data) setTrendingVideos(data as any);
  };

  const handleSearch = async () => {
    const query = searchQuery.toLowerCase();
    
    // Search users
    const { data: users } = await supabase
      .from('profiles')
      .select('id, username, first_name, full_name, avatar_url, verified, badge_type')
      .or(`username.ilike.%${query}%,first_name.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(10);

    // Search videos
    const { data: videos } = await supabase
      .from('verification_videos')
      .select(`
        id, video_url, caption, user_id, created_at,
        profile:profiles!verification_videos_user_id_fkey(username, first_name, avatar_url, verified)
      `)
      .ilike('caption', `%${query}%`)
      .limit(10);

    // Search posts
    const { data: posts } = await supabase
      .from('posts')
      .select(`
        id, content, media_urls, user_id, created_at,
        profiles(username, first_name, avatar_url, verified)
      `)
      .ilike('content', `%${query}%`)
      .limit(10);

    setSearchResults({
      users: users || [],
      videos: videos as any || [],
      posts: posts as any || []
    });
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

  const openPostFullscreen = (post: Post) => {
    setSelectedPost(post);
    setFullscreenSheet(true);
  };

  const filteredFriends = friendProfiles.filter(profile =>
    profile.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout title="Explorar">
      <div className="max-w-2xl mx-auto pb-20">
        {/* Header with Search */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b">
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Pesquisar pessoas, vídeos, hashtags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 bg-muted/40 border-0 rounded-xl h-11 text-[15px] focus-visible:ring-1 focus-visible:ring-primary/30"
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

          {/* Stats */}
          <div className="flex items-center gap-3 px-4 py-2 border-t border-border/50">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-full">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-green-600">{onlineFriendsCount} online</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{friends.length} amigos</span>
            </div>
          </div>
        </div>

        {/* Search Results */}
        {searchQuery && (searchResults.users.length > 0 || searchResults.videos.length > 0 || searchResults.posts.length > 0) && (
          <div className="p-4 space-y-6">
            {/* Users Results */}
            {searchResults.users.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Pessoas
                </h3>
                <div className="space-y-2">
                  {searchResults.users.map(profile => (
                    <div
                      key={profile.id}
                      className="flex items-center gap-3 p-3 bg-card rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigateToProfile(profile.id)}
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback>{profile.first_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold">{profile.first_name}</span>
                          {profile.verified && <VerificationBadge verified badgeType={profile.badge_type} size="sm" />}
                        </div>
                        <span className="text-sm text-muted-foreground">@{profile.username}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Videos Results */}
            {searchResults.videos.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Film className="h-4 w-4" /> Vídeos
                </h3>
                <div className="grid grid-cols-3 gap-1">
                  {searchResults.videos.map(video => (
                    <div
                      key={video.id}
                      className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden cursor-pointer"
                      onClick={() => navigate(`/videos?id=${video.id}`)}
                    >
                      <video
                        src={video.video_url}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="h-8 w-8 text-white/80 fill-white/80" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Posts Results */}
            {searchResults.posts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4" /> Publicações
                </h3>
                <div className="grid grid-cols-3 gap-1">
                  {searchResults.posts.map(post => (
                    <div
                      key={post.id}
                      className="relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer group"
                      onClick={() => openPostFullscreen(post)}
                    >
                      {post.media_urls?.[0] ? (
                        <img src={post.media_urls[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-2">
                          <p className="text-xs text-muted-foreground line-clamp-4">{post.content}</p>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-5 w-5 text-white drop-shadow" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Content */}
        {!searchQuery && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-transparent border-b rounded-none h-auto p-0">
              <TabsTrigger 
                value="discover"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent h-12 text-sm font-semibold"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Descobrir
              </TabsTrigger>
              <TabsTrigger 
                value="friends"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent h-12 text-sm font-semibold"
              >
                <Users className="h-4 w-4 mr-2" />
                Amigos
              </TabsTrigger>
              <TabsTrigger 
                value="requests"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent h-12 text-sm font-semibold relative"
              >
                Pedidos
                {friendRequests.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                    {friendRequests.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Discover Tab */}
            <TabsContent value="discover" className="mt-0">
              <ScrollArea className="h-[calc(100vh-280px)]">
                {/* Trending Hashtags */}
                <div className="p-4">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Hash className="h-5 w-5 text-primary" />
                    Hashtags em alta
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {trendingHashtags.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => navigate(`/hashtag/${tag.name}`)}
                        className="px-4 py-2 bg-muted/50 hover:bg-muted rounded-full text-sm font-medium transition-colors"
                      >
                        #{tag.name}
                        <span className="ml-2 text-muted-foreground">{tag.post_count}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trending Videos */}
                <div className="p-4">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Play className="h-5 w-5 text-primary" />
                    Vídeos em destaque
                  </h3>
                  <div className="grid grid-cols-3 gap-1">
                    {trendingVideos.map(video => (
                      <div
                        key={video.id}
                        className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden cursor-pointer group"
                        onClick={() => navigate(`/videos?id=${video.id}`)}
                      >
                        <video
                          ref={(el) => { if (el) videoRefs.current[video.id] = el; }}
                          src={video.video_url}
                          className="w-full h-full object-cover"
                          muted
                          loop
                          playsInline
                          preload="metadata"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute bottom-2 left-2 right-2">
                          <div className="flex items-center gap-2 mb-1">
                            <Avatar className="h-6 w-6 border border-white">
                              <AvatarImage src={video.profile?.avatar_url || undefined} />
                              <AvatarFallback className="text-[10px]">{video.profile?.first_name?.[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-white text-xs font-medium truncate">{video.profile?.username}</span>
                          </div>
                          {video.caption && (
                            <p className="text-white text-[10px] line-clamp-2">{video.caption}</p>
                          )}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="h-10 w-10 text-white fill-white" />
                        </div>
                      </div>
                    ))}
                  </div>
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
                    <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
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
                                  className="flex-1 h-9 rounded-xl font-bold"
                                >
                                  Aceitar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => rejectFriendRequest(request.id)}
                                  className="flex-1 h-9 rounded-xl font-bold"
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
        )}

        {/* Fullscreen Post Sheet */}
        <Sheet open={fullscreenSheet} onOpenChange={setFullscreenSheet}>
          <SheetContent side="bottom" className="h-full p-0 rounded-none">
            {selectedPost && (
              <div className="h-full flex flex-col bg-black">
                {/* Header */}
                <div className="flex items-center justify-between p-4 bg-background">
                  <Button variant="ghost" size="icon" onClick={() => setFullscreenSheet(false)}>
                    <X className="h-6 w-6" />
                  </Button>
                  <span className="font-semibold">Publicação</span>
                  <Button variant="ghost" size="icon" onClick={() => navigate(`/post/${selectedPost.id}`)}>
                    <MoreHorizontal className="h-6 w-6" />
                  </Button>
                </div>

                {/* Content */}
                <div className="flex-1 flex items-center justify-center">
                  {selectedPost.media_urls?.[0] ? (
                    selectedPost.media_urls[0].includes('.mp4') || selectedPost.media_urls[0].includes('.webm') ? (
                      <video
                        src={selectedPost.media_urls[0]}
                        className="max-w-full max-h-full object-contain"
                        controls
                        autoPlay
                      />
                    ) : (
                      <img
                        src={selectedPost.media_urls[0]}
                        alt=""
                        className="max-w-full max-h-full object-contain"
                      />
                    )
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-lg text-white">{selectedPost.content}</p>
                    </div>
                  )}
                </div>

                {/* Caption */}
                <div className="p-4 bg-background">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedPost.profiles?.avatar_url || undefined} />
                      <AvatarFallback>{selectedPost.profiles?.first_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-semibold">{selectedPost.profiles?.username}</span>
                    </div>
                  </div>
                  {selectedPost.content && (
                    <p className="text-sm">{selectedPost.content}</p>
                  )}
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </MainLayout>
  );
}
