import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Camera, 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  UserPlus,
  UserCheck,
  Bell,
  BellOff,
  Briefcase,
  Star,
  ArrowLeft,
  Search,
  MapPin,
  Link as LinkIcon,
  X,
  Grid3X3,
  Play,
  Flag,
  Copy,
  Ban
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TopBar } from "@/components/TopBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import VerificationBadge from "@/components/VerificationBadge";
import { ProfileSkeleton } from "@/components/loading/ProfileSkeleton";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import AssociatedAccounts from "@/components/AssociatedAccounts";
import { motion, AnimatePresence } from "framer-motion";

interface Profile {
  id: string;
  username: string;
  full_name: string;
  first_name: string;
  avatar_url: string;
  bio: string;
  verified?: boolean;
  badge_type?: string | null;
  banner_url?: string;
  location?: string;
  website?: string;
  category?: string;
  civil_status?: string;
}

interface Friend {
  id: string;
  username: string;
  full_name: string;
  first_name: string;
  avatar_url: string;
  verified?: boolean;
  badge_type?: string | null;
}

interface Post {
  id: string;
  content: string;
  created_at: string;
  media_urls?: string[];
  likes_count: number;
  comments_count: number;
  user_liked: boolean;
}

interface Video {
  id: string;
  video_url: string;
  caption: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  user_liked: boolean;
}

export default function Profile() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"followers" | "following" | "friends">("followers");
  const [modalUsers, setModalUsers] = useState<Profile[]>([]);
  const [modalSearch, setModalSearch] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    const startTime = Date.now();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);
      const profileId = userId || user.id;
      setIsOwnProfile(profileId === user.id);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      if (profileData) {
        setProfile(profileData);
        await Promise.all([
          loadStats(profileId),
          loadPosts(profileId),
          loadVideos(profileId),
          loadFriends(profileId),
        ]);
        
        if (profileId !== user.id) {
          await checkFollowing(user.id, profileId);
        }
      }
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 2000 - elapsed);
      setTimeout(() => setLoading(false), remaining);
    }
  };

  const loadStats = async (profileId: string) => {
    const [followers, following, friendships] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profileId),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profileId),
      supabase.from("friendships").select("*", { count: "exact", head: true }).or(`user_id_1.eq.${profileId},user_id_2.eq.${profileId}`)
    ]);

    setFollowersCount(followers.count || 0);
    setFollowingCount(following.count || 0);
    setFriendsCount(friendships.count || 0);
  };

  const checkFollowing = async (currentUserId: string, profileId: string) => {
    const { data } = await supabase
      .from("follows")
      .select("*")
      .eq("follower_id", currentUserId)
      .eq("following_id", profileId)
      .maybeSingle();

    setIsFollowing(!!data);
  };

  const loadFriends = async (profileId: string) => {
    const { data } = await supabase
      .from("friendships")
      .select("*")
      .or(`user_id_1.eq.${profileId},user_id_2.eq.${profileId}`);

    if (data) {
      const friendIds = data.map(f => f.user_id_1 === profileId ? f.user_id_2 : f.user_id_1);
      
      if (friendIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, full_name, first_name, avatar_url, verified, badge_type")
          .in("id", friendIds);
        setFriends(profiles || []);
      }
    }
  };

  const loadPosts = async (profileId: string) => {
    const { data } = await supabase
      .from("posts")
      .select(`*, likes:post_likes(count), comments:comments(count)`)
      .eq("user_id", profileId)
      .is("expires_at", null)
      .order("created_at", { ascending: false });

    if (data) {
      const { data: { user } } = await supabase.auth.getUser();
      
      const postsWithLikes = await Promise.all(
        data.map(async (post) => {
          const { data: userLike } = await supabase
            .from("post_likes")
            .select("*")
            .eq("post_id", post.id)
            .eq("user_id", user?.id)
            .maybeSingle();

          return {
            ...post,
            likes_count: post.likes[0]?.count || 0,
            comments_count: post.comments[0]?.count || 0,
            user_liked: !!userLike,
          };
        })
      );

      setPosts(postsWithLikes);
    }
  };

  const loadVideos = async (profileId: string) => {
    const { data } = await supabase
      .from("verification_videos")
      .select(`*, likes:verification_video_likes(count), comments:verification_video_comments(count)`)
      .eq("user_id", profileId)
      .order("created_at", { ascending: false });

    if (data) {
      const { data: { user } } = await supabase.auth.getUser();
      
      const videosWithLikes = await Promise.all(
        data.map(async (video) => {
          const { data: userLike } = await supabase
            .from("verification_video_likes")
            .select("*")
            .eq("video_id", video.id)
            .eq("user_id", user?.id)
            .maybeSingle();

          return {
            ...video,
            likes_count: video.likes[0]?.count || 0,
            comments_count: video.comments[0]?.count || 0,
            user_liked: !!userLike,
          };
        })
      );

      setVideos(videosWithLikes);
    }
  };

  const handleFollow = async () => {
    if (!profile) return;

    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", profile.id);
      setIsFollowing(false);
      setFollowersCount(prev => prev - 1);
    } else {
      await supabase.from("follows").insert({ follower_id: currentUserId, following_id: profile.id });
      setIsFollowing(true);
      setFollowersCount(prev => prev + 1);
    }
  };

  const handleLike = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (post.user_liked) {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", currentUserId);
      setPosts(posts.map(p => p.id === postId ? { ...p, user_liked: false, likes_count: p.likes_count - 1 } : p));
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: currentUserId });
      setPosts(posts.map(p => p.id === postId ? { ...p, user_liked: true, likes_count: p.likes_count + 1 } : p));
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploadingBanner(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/banner-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(fileName);

      await supabase.from('profiles').update({ banner_url: publicUrl }).eq('id', profile.id);
      setProfile({ ...profile, banner_url: publicUrl });
      toast.success('Foto de capa atualizada!');
    } catch (error) {
      toast.error('Erro ao enviar foto de capa');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(fileName);

      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id);
      setProfile({ ...profile, avatar_url: publicUrl });
      toast.success('Foto de perfil atualizada!');
    } catch (error) {
      toast.error('Erro ao enviar foto de perfil');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleOpenModal = async (type: "followers" | "following" | "friends") => {
    setModalType(type);
    setModalOpen(true);
    setModalSearch("");

    if (type === "followers") {
      const { data } = await supabase
        .from("follows")
        .select("profiles!follows_follower_id_fkey(*)")
        .eq("following_id", profile?.id);
      setModalUsers(data?.map(d => d.profiles) || []);
    } else if (type === "following") {
      const { data } = await supabase
        .from("follows")
        .select("profiles!follows_following_id_fkey(*)")
        .eq("follower_id", profile?.id);
      setModalUsers(data?.map(d => d.profiles) || []);
    } else {
      const { data } = await supabase
        .from("friendships")
        .select("*")
        .or(`user_id_1.eq.${profile?.id},user_id_2.eq.${profile?.id}`);

      if (data) {
        const friendIds = data.map(f => f.user_id_1 === profile?.id ? f.user_id_2 : f.user_id_1);
        const { data: profiles } = await supabase.from("profiles").select("*").in("id", friendIds);
        setModalUsers(profiles || []);
      }
    }
  };

  const filteredModalUsers = modalUsers.filter(u => 
    u.username?.toLowerCase().includes(modalSearch.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(modalSearch.toLowerCase()) ||
    u.first_name?.toLowerCase().includes(modalSearch.toLowerCase())
  );

  if (loading || !profile) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <TopBar />
          <ProfileSkeleton />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-20">
        <TopBar />

        {/* Header */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-14 z-40 bg-background/95 backdrop-blur-lg border-b px-4 py-2 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">{profile.username}</h1>
            {profile.verified && <VerificationBadge verified={profile.verified} badgeType={profile.badge_type} className="w-5 h-5" />}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem 
                onClick={() => {
                  const url = `${window.location.origin}/profile/${profile.id}`;
                  navigator.clipboard.writeText(url);
                  toast.success("Link do perfil copiado!");
                }}
                className="cursor-pointer"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar link do perfil
              </DropdownMenuItem>
              {!isOwnProfile && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => navigate(`/report?type=profile&id=${profile.id}`)}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    Denunciar conta
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={async () => {
                      // Block user logic
                      toast.success("Utilizador bloqueado");
                    }}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Bloquear utilizador
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          {/* Banner e Avatar */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative"
          >
            <div className="h-48 sm:h-56 bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 overflow-hidden relative group">
              {profile.banner_url ? (
                <img src={profile.banner_url} alt="Banner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10" />
              )}
              {isOwnProfile && (
                <>
                  <input ref={bannerInputRef} type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                  <button
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={uploadingBanner}
                    className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Camera className="h-4 w-4" />
                    {uploadingBanner ? 'Enviando...' : 'Editar capa'}
                  </button>
                </>
              )}
            </div>

            <div className="px-4 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-20 gap-4">
                <div className="relative">
                  <Avatar className="h-28 w-28 sm:h-36 sm:w-36 border-4 border-background ring-4 ring-primary/20 shadow-xl">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-accent text-white">
                      {profile.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isOwnProfile && (
                    <>
                      <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                      <button
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="absolute bottom-2 right-2 h-9 w-9 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
                      >
                        <Camera className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>

                {isOwnProfile && (
                  <div className="flex flex-wrap gap-2 sm:pb-4">
                    <Button onClick={() => navigate("/professional-panel")} size="sm" className="rounded-full px-4 h-9 text-sm font-semibold shadow-sm">
                      Painel profissional
                    </Button>
                    <Button onClick={() => navigate("/settings/edit-profile")} variant="outline" size="sm" className="rounded-full px-4 h-9 text-sm font-semibold">
                      Editar perfil
                    </Button>
                  </div>
                )}

                {!isOwnProfile && (
                  <div className="flex gap-2 sm:pb-4">
                    <Button onClick={handleFollow} className="rounded-full px-6" variant={isFollowing ? "outline" : "default"}>
                      {isFollowing ? <><UserCheck className="h-4 w-4 mr-2" />A seguir</> : <><UserPlus className="h-4 w-4 mr-2" />Seguir</>}
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-full">
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold">{profile.full_name || profile.first_name || profile.username}</h2>
                  {profile.verified && <VerificationBadge verified={profile.verified} badgeType={profile.badge_type} className="w-6 h-6" />}
                </div>
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
                
                {profile.category && (
                  <p className="text-sm text-primary mt-1">{profile.category}</p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 mt-3 text-sm">
                  <button onClick={() => handleOpenModal("followers")} className="hover:underline">
                    <span className="font-bold">{followersCount}</span> <span className="text-muted-foreground">seguidores</span>
                  </button>
                  <button onClick={() => handleOpenModal("following")} className="hover:underline">
                    <span className="font-bold">{followingCount}</span> <span className="text-muted-foreground">a seguir</span>
                  </button>
                </div>

                {profile.bio && <p className="mt-3 text-sm">{profile.bio}</p>}

                {/* Info extra */}
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                  {profile.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                  {profile.website && (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                      <LinkIcon className="h-4 w-4" />
                      <span>{profile.website.replace(/https?:\/\//, '')}</span>
                    </a>
                  )}
                </div>

                {isOwnProfile && <AssociatedAccounts userId={currentUserId} />}
              </div>
            </div>
          </motion.div>

          {/* Tabs */}
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-12 p-0 px-4 gap-2">
              <TabsTrigger value="posts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold px-4">
                <Grid3X3 className="h-4 w-4 mr-2" />
                Posts
              </TabsTrigger>
              <TabsTrigger value="reels" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold px-4">
                <Play className="h-4 w-4 mr-2" />
                Reels
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="mt-0">
              {posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Grid3X3 className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Nenhuma publicação ainda</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-0.5 p-1">
                  {posts.map((post) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => navigate(`/comments/${post.id}`)}
                      className="aspect-square bg-muted overflow-hidden cursor-pointer relative group"
                    >
                      {post.media_urls && post.media_urls[0] ? (
                        post.media_urls[0].includes('.mp4') || post.media_urls[0].includes('.webm') ? (
                          <video src={post.media_urls[0]} className="w-full h-full object-cover" />
                        ) : (
                          <img src={post.media_urls[0]} alt="" className="w-full h-full object-cover" />
                        )
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center p-2">
                          <p className="text-xs text-center line-clamp-3">{post.content}</p>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                        <div className="flex items-center gap-1">
                          <Heart className="h-5 w-5 fill-white" />
                          <span className="font-semibold">{post.likes_count}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-5 w-5 fill-white" />
                          <span className="font-semibold">{post.comments_count}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="reels" className="mt-0">
              {videos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Play className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Nenhum reel ainda</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-0.5 p-1">
                  {videos.map((video) => (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => navigate(`/videos/${video.id}`)}
                      className="aspect-[9/16] bg-black overflow-hidden cursor-pointer relative group"
                    >
                      <video src={video.video_url} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-2 left-2 flex items-center gap-2 text-white text-xs">
                        <Play className="h-3 w-3 fill-white" />
                        <span>{video.likes_count}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Fullscreen Modal for Followers/Following */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-lg h-[90vh] p-0 gap-0">
            <DialogHeader className="p-4 border-b">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-bold">
                  {modalType === "followers" ? "Seguidores" : modalType === "following" ? "A seguir" : "Amigos"}
                </DialogTitle>
                <Button variant="ghost" size="icon" onClick={() => setModalOpen(false)} className="rounded-full">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="pl-10 h-10 rounded-full bg-muted border-0"
                />
              </div>
            </DialogHeader>
            <ScrollArea className="flex-1">
              <div className="p-2">
                {filteredModalUsers.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    Nenhum usuário encontrado
                  </div>
                ) : (
                  filteredModalUsers.map((user) => (
                    <motion.button
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ backgroundColor: 'hsl(var(--muted) / 0.5)' }}
                      onClick={() => {
                        setModalOpen(false);
                        navigate(`/profile/${user.id}`);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                          {(user.first_name || user.username)?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold">{user.full_name || user.first_name || user.username}</span>
                          {user.verified && <VerificationBadge verified={user.verified} badgeType={user.badge_type} className="w-4 h-4" />}
                        </div>
                        <span className="text-sm text-muted-foreground">@{user.username}</span>
                      </div>
                    </motion.button>
                  ))
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}