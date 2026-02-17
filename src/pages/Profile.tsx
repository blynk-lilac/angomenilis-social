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
  Ban,
  Clapperboard,
  Repeat2,
  UserSquare2,
  ChevronDown,
  Music,
  Settings,
  Plus,
  Users,
  Globe,
  Info
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TopBar } from "@/components/TopBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import VerificationBadge, { hasSpecialBadgeEmoji } from "@/components/VerificationBadge";
import { ProfileSkeleton } from "@/components/loading/ProfileSkeleton";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import AssociatedAccounts from "@/components/AssociatedAccounts";
import { motion, AnimatePresence } from "framer-motion";
import { OnlineIndicator } from "@/components/OnlineIndicator";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";

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
  views_count?: number;
}

interface Story {
  id: string;
  media_url: string;
  media_type: string;
  created_at: string;
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
  const [postsCount, setPostsCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"followers" | "following" | "friends">("followers");
  const [modalUsers, setModalUsers] = useState<Profile[]>([]);
  const [modalSearch, setModalSearch] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const onlineUsers = useOnlineUsers();

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
          loadStories(profileId),
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
    const [followers, following, friendships, postsData] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profileId),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profileId),
      supabase.from("friendships").select("*", { count: "exact", head: true }).or(`user_id_1.eq.${profileId},user_id_2.eq.${profileId}`),
      supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", profileId)
    ]);

    setFollowersCount(followers.count || 0);
    setFollowingCount(following.count || 0);
    setFriendsCount(friendships.count || 0);
    setPostsCount(postsData.count || 0);
  };

  const loadStories = async (profileId: string) => {
    const { data } = await supabase
      .from("stories")
      .select("*")
      .eq("user_id", profileId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    
    if (data) setStories(data);
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
      
      const videosWithData = await Promise.all(
        data.map(async (video) => {
          const [userLike, viewsCount] = await Promise.all([
            supabase.from("verification_video_likes").select("*").eq("video_id", video.id).eq("user_id", user?.id).maybeSingle(),
            supabase.from("video_views").select("*", { count: "exact", head: true }).eq("video_id", video.id)
          ]);

          return {
            ...video,
            likes_count: video.likes[0]?.count || 0,
            comments_count: video.comments[0]?.count || 0,
            user_liked: !!userLike.data,
            views_count: viewsCount.count || 0
          };
        })
      );

      setVideos(videosWithData);
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

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

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
      <div className="h-screen bg-background overflow-y-auto native-scroll pb-[52px]">
        {/* Native App Header */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="app-header safe-area-top"
        >
          <div className="flex items-center justify-between px-4 h-12">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full h-9 w-9 press-effect">
                <ArrowLeft className="h-[18px] w-[18px]" />
              </Button>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-bold">{profile.first_name}</h1>
                {(profile.verified || hasSpecialBadgeEmoji(profile.username) || hasSpecialBadgeEmoji(profile.full_name)) && <VerificationBadge verified={profile.verified} badgeType={profile.badge_type} username={profile.username} fullName={profile.full_name} className="w-4 h-4" />}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {isOwnProfile && (
                <Button variant="ghost" size="icon" onClick={() => navigate('/settings/edit-profile')} className="rounded-full h-9 w-9">
                  <Settings className="h-5 w-5" />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
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
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar link do perfil
                  </DropdownMenuItem>
                  {!isOwnProfile && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => navigate(`/report?type=profile&id=${profile.id}`)}
                        className="text-destructive"
                      >
                        <Flag className="h-4 w-4 mr-2" />
                        Denunciar conta
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </motion.div>

        {/* Banner Section - Premium Modern Design */}
        <div className="relative">
          {/* Cover Photo */}
          <div className="relative h-52 bg-gradient-to-br from-primary/30 via-accent/20 to-secondary/30 overflow-hidden">
            {profile.banner_url ? (
              <img 
                src={profile.banner_url} 
                alt="Cover" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-600/30 via-purple-500/20 to-pink-500/30" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
            {isOwnProfile && (
              <>
                <input ref={bannerInputRef} type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-4 right-4 gap-2 rounded-xl shadow-lg backdrop-blur-sm bg-background/80 hover:bg-background"
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={uploadingBanner}
                >
                  <Camera className="h-4 w-4" />
                  {uploadingBanner ? 'Enviando...' : 'Editar capa'}
                </Button>
              </>
            )}
          </div>

          {/* Profile Info Container - Modern Instagram/Facebook Hybrid */}
          <div className="px-4 pb-5">
            {/* Avatar Row */}
            <div className="flex items-end justify-between -mt-20 mb-5">
              {/* Name and info on left */}
              <div className="flex-1 pt-24">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <h1 className="text-2xl font-bold tracking-tight">{profile.full_name || profile.first_name}</h1>
                  {(profile.verified || hasSpecialBadgeEmoji(profile.username) || hasSpecialBadgeEmoji(profile.full_name)) && <VerificationBadge verified={profile.verified} badgeType={profile.badge_type} username={profile.username} fullName={profile.full_name} className="w-5 h-5" />}
                </div>
                {profile.username && (
                  <p className="text-muted-foreground font-medium">@{profile.username}</p>
                )}
                {profile.category && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full mt-2">
                    <Briefcase className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-semibold text-primary">{profile.category}</span>
                  </div>
                )}
              </div>

              {/* Avatar on right - Premium Ring */}
              <div className="relative">
                <div className={`p-1 rounded-full ${stories.length > 0 ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[3px]' : 'bg-background shadow-xl'}`}>
                  <Avatar className="h-36 w-36 border-4 border-background shadow-2xl">
                    <AvatarImage src={profile.avatar_url} className="object-cover" />
                    <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-primary/30 to-accent/30">
                      {profile.first_name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                {/* Online/Offline indicator - Enhanced */}
                {!isOwnProfile && (
                  <div 
                    className={`absolute bottom-3 right-3 h-6 w-6 rounded-full border-[3px] border-background shadow-lg ${
                      onlineUsers.has(profile.id) ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                )}
                
                {isOwnProfile && (
                  <>
                    <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute bottom-3 right-3 h-10 w-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full flex items-center justify-center border-3 border-background shadow-xl transition-all duration-200"
                    >
                      <Camera className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Bio - Enhanced */}
            {profile.bio && (
              <p className="text-[15px] mb-5 whitespace-pre-wrap leading-relaxed text-foreground/90">{profile.bio}</p>
            )}

            {/* Location and Website - Pills Style */}
            <div className="flex flex-wrap gap-2 mb-5">
              {profile.location && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/60 rounded-full text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{profile.location}</span>
                </div>
              )}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full text-sm hover:bg-primary/20 transition-colors">
                  <LinkIcon className="h-4 w-4 text-primary" />
                  <span className="text-primary font-medium">{profile.website.replace('https://', '').replace('http://', '')}</span>
                </a>
              )}
            </div>

            {/* Stats Row - Premium Glass Design */}
            <div className="flex items-center justify-around mb-5 py-4 bg-muted/30 rounded-2xl border border-border/50">
              <button className="flex flex-col items-center group" onClick={() => {}}>
                <span className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">{formatNumber(postsCount)}</span>
                <span className="text-xs text-muted-foreground font-medium">Publicações</span>
              </button>
              <div className="h-8 w-px bg-border/50" />
              <button className="flex flex-col items-center group" onClick={() => handleOpenModal("followers")}>
                <span className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">{formatNumber(followersCount)}</span>
                <span className="text-xs text-muted-foreground font-medium">Filharam</span>
              </button>
              <div className="h-8 w-px bg-border/50" />
              <button className="flex flex-col items-center group" onClick={() => handleOpenModal("following")}>
                <span className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">{formatNumber(followingCount)}</span>
                <span className="text-xs text-muted-foreground font-medium">A filhar</span>
              </button>
              <div className="h-8 w-px bg-border/50" />
              <button className="flex flex-col items-center group" onClick={() => handleOpenModal("friends")}>
                <span className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">{formatNumber(friendsCount)}</span>
                <span className="text-xs text-muted-foreground font-medium">Amigos</span>
              </button>
            </div>

            {/* Action Buttons - Modern Rounded */}
            <div className="flex gap-2.5">
              {isOwnProfile ? (
                <>
                  <Button 
                    className="flex-1 h-11 rounded-xl font-semibold gap-2 shadow-sm"
                    onClick={() => navigate('/create')}
                  >
                    <Plus className="h-4 w-4" />
                    Criar publicação
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="flex-1 h-11 rounded-xl font-semibold gap-2"
                    onClick={() => navigate('/settings/edit-profile')}
                  >
                    Editar perfil
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="icon"
                    className="h-11 w-11 rounded-xl"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant={isFollowing ? "secondary" : "default"}
                    className="flex-1 h-11 rounded-xl font-semibold gap-2 shadow-sm"
                    onClick={handleFollow}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="h-4 w-4" />
                        Filhou
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Filhar
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="flex-1 h-11 rounded-xl font-semibold gap-2"
                    onClick={() => navigate(`/chat/${profile.id}`)}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Mensagem
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="icon"
                    className="h-11 w-11 rounded-xl"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>

            {/* Professional Panel Link */}
            {isOwnProfile && (
              <button 
                onClick={() => navigate('/professional')}
                className="w-full mt-4 p-3 bg-muted/50 rounded-xl flex items-center justify-between hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-semibold block">Painel Profissional</span>
                    <span className="text-xs text-muted-foreground">Gerir a tua conta profissional</span>
                  </div>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground rotate-[-90deg]" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs - Facebook style */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-transparent border-y h-12 rounded-none p-0">
            <TabsTrigger value="posts" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full data-[state=active]:shadow-none font-semibold">
              Publicações
            </TabsTrigger>
            <TabsTrigger value="reels" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full data-[state=active]:shadow-none font-semibold">
              Reels
            </TabsTrigger>
            <TabsTrigger value="about" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full data-[state=active]:shadow-none font-semibold">
              Sobre
            </TabsTrigger>
          </TabsList>

          {/* Posts Grid */}
          <TabsContent value="posts" className="mt-0">
            {posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Camera className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">Sem publicações</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Quando partilhares publicações, elas aparecem aqui.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-0.5">
                  {posts.map((post, idx) => {
                    const hasMedia = post.media_urls && post.media_urls.length > 0;
                    const firstMedia = hasMedia ? post.media_urls[0] : null;
                    const isVideo = firstMedia?.includes('.mp4') || firstMedia?.includes('.webm');

                    return (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className="aspect-square relative cursor-pointer group"
                        onClick={() => navigate(`/post/${post.id}`)}
                      >
                        {hasMedia ? (
                          <>
                            {isVideo ? (
                              <video src={firstMedia!} className="w-full h-full object-cover" muted />
                            ) : (
                              <img src={firstMedia!} alt="" className="w-full h-full object-cover" />
                            )}
                            {post.media_urls!.length > 1 && (
                              <div className="absolute top-2 right-2">
                                <Copy className="h-4 w-4 text-white drop-shadow-lg" />
                              </div>
                            )}
                            {isVideo && (
                              <div className="absolute top-2 right-2">
                                <Play className="h-4 w-4 text-white drop-shadow-lg fill-white" />
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center p-2">
                            <p className="text-xs text-muted-foreground line-clamp-4">{post.content}</p>
                          </div>
                        )}
                        
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                          <div className="flex items-center gap-1 text-white">
                            <Heart className="h-5 w-5 fill-white" />
                            <span className="font-bold">{formatNumber(post.likes_count)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-white">
                            <MessageCircle className="h-5 w-5 fill-white" />
                            <span className="font-bold">{formatNumber(post.comments_count)}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                {/* End of posts indicator */}
                <div className="py-8 text-center border-t border-border mt-1">
                  <p className="text-muted-foreground text-sm">Fim das publicações</p>
                </div>
              </>
            )}
          </TabsContent>

          {/* Reels Grid */}
          <TabsContent value="reels" className="mt-0">
            {videos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Clapperboard className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">Sem reels</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Quando partilhares reels, eles aparecem aqui.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-0.5">
                  {videos.map((video, idx) => (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className="aspect-[9/16] relative cursor-pointer group"
                      onClick={() => navigate(`/videos?v=${video.id}`)}
                    >
                      <video src={video.video_url} className="w-full h-full object-cover" muted />
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white">
                        <Play className="h-4 w-4 fill-white" />
                        <span className="text-xs font-semibold">{formatNumber(video.views_count || 0)}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
                {/* End of posts indicator */}
                <div className="py-8 text-center border-t border-border mt-1">
                  <p className="text-muted-foreground text-sm">Fim dos reels</p>
                </div>
              </>
            )}
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about" className="mt-0 p-4">
            <div className="space-y-4">
              <div className="bg-card rounded-xl p-4 border">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  Detalhes
                </h3>
                <div className="space-y-3">
                  {profile.category && (
                    <div className="flex items-center gap-3">
                      <Briefcase className="h-5 w-5 text-muted-foreground" />
                      <span>{profile.category}</span>
                    </div>
                  )}
                  {profile.location && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                  {profile.civil_status && (
                    <div className="flex items-center gap-3">
                      <Heart className="h-5 w-5 text-muted-foreground" />
                      <span>{profile.civil_status}</span>
                    </div>
                  )}
                  {profile.website && (
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {profile.website.replace('https://', '').replace('http://', '')}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Friends Section */}
              {friends.length > 0 && (
                <div className="bg-card rounded-xl p-4 border">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Amigos
                    </h3>
                    <span className="text-sm text-muted-foreground">{friends.length} amigos</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {friends.slice(0, 6).map(friend => (
                      <button
                        key={friend.id}
                        onClick={() => navigate(`/profile/${friend.id}`)}
                        className="flex flex-col items-center p-2 rounded-xl hover:bg-muted transition-colors"
                      >
                        <Avatar className="h-16 w-16 mb-1">
                          <AvatarImage src={friend.avatar_url} />
                          <AvatarFallback>{friend.first_name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-center line-clamp-1">{friend.first_name}</span>
                      </button>
                    ))}
                  </div>
                  {friends.length > 6 && (
                    <Button 
                      variant="ghost" 
                      className="w-full mt-2"
                      onClick={() => handleOpenModal("friends")}
                    >
                      Ver todos os amigos
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Modal for Followers/Following/Friends */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-md h-[70vh] flex flex-col p-0">
            <DialogHeader className="p-4 border-b">
              <DialogTitle className="text-center">
                {modalType === "followers" ? "Pessoas que filharam" : modalType === "following" ? "A filhar" : "Amigos"}
              </DialogTitle>
              <div className="pt-3">
                <Input
                  placeholder="Pesquisar..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="rounded-full bg-muted/50 border-0"
                />
              </div>
            </DialogHeader>
            <ScrollArea className="flex-1">
              {filteredModalUsers.map(user => (
                <div 
                  key={user.id}
                  className="flex items-center gap-3 p-4 hover:bg-muted/50 cursor-pointer"
                  onClick={() => { setModalOpen(false); navigate(`/profile/${user.id}`); }}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>{user.first_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="font-semibold truncate">{user.first_name}</p>
                      {user.verified && <VerificationBadge verified={user.verified} badgeType={user.badge_type} size="sm" />}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
