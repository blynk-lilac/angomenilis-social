import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Send, Bookmark, MoreVertical, Play, Pause, Volume2, VolumeX, Eye, Music2 } from "lucide-react";
import { useNavigate, useParams, Link } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import VerificationBadge from "@/components/VerificationBadge";
import { VideosSkeleton } from "@/components/loading/VideosSkeleton";
import { MusicPlayer } from "@/components/MusicPlayer";
import { motion, AnimatePresence } from "framer-motion";

interface Video {
  id: string;
  user_id: string;
  video_url: string;
  caption: string;
  created_at: string;
  share_code: string;
  music_name?: string | null;
  music_artist?: string | null;
  music_url?: string | null;
  profiles: {
    username: string;
    avatar_url: string;
    verified: boolean;
    badge_type?: string | null;
  };
  verification_video_likes: { user_id: string }[];
  verification_video_comments: { id: string }[];
  video_views?: { user_id: string }[];
}

interface FeedVideo {
  id: string;
  user_id: string;
  video_url: string;
  caption: string;
  created_at: string;
  music_name?: string | null;
  music_artist?: string | null;
  music_url?: string | null;
  source: 'reels' | 'feed';
  profiles: {
    username: string;
    avatar_url: string;
    verified: boolean;
    badge_type?: string | null;
  };
  likes_count: number;
  comments_count: number;
  has_liked: boolean;
  views: number;
  original_id: string;
  share_code?: string;
}

export default function Videos() {
  const [allVideos, setAllVideos] = useState<FeedVideo[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [expandedCaptions, setExpandedCaptions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [playingStates, setPlayingStates] = useState<{ [key: string]: boolean }>({});
  const [mutedStates, setMutedStates] = useState<{ [key: string]: boolean }>({});
  const { shareCode } = useParams();
  const navigate = useNavigate();
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCurrentUser();
    loadAllVideos();

    const channel = supabase
      .channel("videos-all-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "verification_videos" }, () => loadAllVideos())
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => loadAllVideos())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [shareCode]);

  useEffect(() => {
    if (allVideos.length > 0 && allVideos[currentVideoIndex]) {
      const currentVideo = videoRefs.current[allVideos[currentVideoIndex].id];
      if (currentVideo) {
        currentVideo.muted = mutedStates[allVideos[currentVideoIndex].id] ?? false;
        currentVideo.play().catch(() => {});
        setPlayingStates(prev => ({ ...prev, [allVideos[currentVideoIndex].id]: true }));
      }
      
      allVideos.forEach((video, index) => {
        if (index !== currentVideoIndex) {
          const vid = videoRefs.current[video.id];
          if (vid) {
            vid.pause();
            setPlayingStates(prev => ({ ...prev, [video.id]: false }));
          }
        }
      });
    }
  }, [currentVideoIndex, allVideos]);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const videoHeight = window.innerHeight - 56;
      const newIndex = Math.round(scrollTop / videoHeight);
      if (newIndex !== currentVideoIndex && newIndex >= 0 && newIndex < allVideos.length) {
        setCurrentVideoIndex(newIndex);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [currentVideoIndex, allVideos.length]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const isVideoUrl = (url: string) => {
    if (!url) return false;
    const l = url.toLowerCase();
    return l.includes(".mp4") || l.includes(".webm") || l.includes(".mov") || l.includes(".avi") || l.includes(".mkv");
  };

  const loadAllVideos = async () => {
    try {
      const combined: FeedVideo[] = [];

      // Load verification_videos (reels)
      const { data: reelsData } = await supabase
        .from("verification_videos")
        .select(`*, profiles (username, avatar_url, verified, badge_type), verification_video_likes (user_id), verification_video_comments (id), video_views (user_id)`)
        .order("created_at", { ascending: false })
        .limit(30);

      if (reelsData) {
        for (const v of reelsData) {
          combined.push({
            id: `reel_${v.id}`,
            original_id: v.id,
            user_id: v.user_id,
            video_url: v.video_url,
            caption: v.caption || '',
            created_at: v.created_at,
            music_name: null,
            music_artist: null,
            music_url: null,
            source: 'reels',
            profiles: v.profiles,
            likes_count: v.verification_video_likes?.length || 0,
            comments_count: v.verification_video_comments?.length || 0,
            has_liked: v.verification_video_likes?.some((l: any) => l.user_id === currentUserId) || false,
            views: v.video_views?.length || 0,
            share_code: v.share_code,
          });
        }
      }

      // Load feed posts with videos
      const { data: postsData } = await supabase
        .from("posts")
        .select(`*, profiles (id, username, avatar_url, verified, badge_type, full_name, first_name), post_reactions (user_id), comments (id)`)
        .not('media_urls', 'is', null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (postsData) {
        for (const p of postsData) {
          const videoUrls = (p.media_urls || []).filter((url: string) => isVideoUrl(url));
          if (videoUrls.length > 0) {
            combined.push({
              id: `post_${p.id}`,
              original_id: p.id,
              user_id: p.user_id,
              video_url: videoUrls[0],
              caption: p.content || '',
              created_at: p.created_at,
              music_name: p.music_name,
              music_artist: p.music_artist,
              music_url: p.music_url,
              source: 'feed',
              profiles: {
                username: p.profiles?.username || 'user',
                avatar_url: p.profiles?.avatar_url || '',
                verified: p.profiles?.verified || false,
                badge_type: p.profiles?.badge_type,
              },
              likes_count: p.post_reactions?.length || 0,
              comments_count: p.comments?.length || 0,
              has_liked: p.post_reactions?.some((r: any) => r.user_id === currentUserId) || false,
              views: 0,
              share_code: undefined,
            });
          }
        }
      }

      // Sort by date
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setAllVideos(combined);
    } finally {
      setLoading(false);
    }
  };

  const togglePlayPause = (videoId: string) => {
    const video = videoRefs.current[videoId];
    if (video) {
      if (video.paused) { video.play(); setPlayingStates(prev => ({ ...prev, [videoId]: true })); }
      else { video.pause(); setPlayingStates(prev => ({ ...prev, [videoId]: false })); }
    }
  };

  const toggleMute = (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRefs.current[videoId];
    if (video) {
      video.muted = !video.muted;
      setMutedStates(prev => ({ ...prev, [videoId]: video.muted }));
    }
  };

  const handleLike = async (fv: FeedVideo) => {
    if (!currentUserId) return;
    if (fv.source === 'reels') {
      if (fv.has_liked) {
        await supabase.from("verification_video_likes").delete().eq("video_id", fv.original_id).eq("user_id", currentUserId);
      } else {
        await supabase.from("verification_video_likes").insert({ video_id: fv.original_id, user_id: currentUserId });
      }
    } else {
      const { data: existing } = await supabase.from("post_reactions").select("id").eq("post_id", fv.original_id).eq("user_id", currentUserId).maybeSingle();
      if (existing) {
        await supabase.from("post_reactions").delete().eq("id", existing.id);
      } else {
        await supabase.from("post_reactions").insert({ post_id: fv.original_id, user_id: currentUserId, reaction_type: "heart" });
      }
    }
    loadAllVideos();
  };

  const handleShare = async (fv: FeedVideo) => {
    const url = fv.share_code
      ? `${window.location.origin}/videos/${fv.share_code}`
      : `${window.location.origin}/post/${fv.original_id}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const formatViewCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black">
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-12 bg-gradient-to-b from-black/60 to-transparent">
          <span className="text-white font-bold text-xl">Reels</span>
        </div>

        <div 
          ref={containerRef}
          className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        >
          {loading ? (
            <VideosSkeleton />
          ) : allVideos.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-white gap-4">
              <Play className="h-16 w-16 text-muted-foreground" />
              <p className="text-lg">Nenhum vídeo disponível</p>
              <p className="text-sm text-muted-foreground">Publique vídeos no feed para aparecerem aqui</p>
            </div>
          ) : (
            allVideos.map((video, index) => {
              const isExpanded = expandedCaptions.has(video.id);
              const captionPreview = video.caption?.slice(0, 60);
              const needsExpand = video.caption && video.caption.length > 60;
              const isPlaying = playingStates[video.id];
              const isMuted = mutedStates[video.id] ?? false;

              return (
                <motion.div 
                  key={video.id} 
                  className="relative h-screen w-full bg-black snap-start snap-always flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="relative w-full h-full" onClick={() => togglePlayPause(video.id)}>
                    <video
                      ref={(el) => { videoRefs.current[video.id] = el; }}
                      src={video.video_url}
                      loop
                      muted={isMuted}
                      playsInline
                      autoPlay={index === currentVideoIndex}
                      preload={index <= 2 ? "auto" : "metadata"}
                      className="w-full h-full object-contain"
                      onPlay={() => setPlayingStates(prev => ({ ...prev, [video.id]: true }))}
                      onPause={() => setPlayingStates(prev => ({ ...prev, [video.id]: false }))}
                      disablePictureInPicture
                      disableRemotePlayback
                    />
                    
                    <AnimatePresence>
                      {!isPlaying && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        >
                          <div className="h-20 w-20 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                            <Play className="h-10 w-10 text-white fill-white ml-1" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Mute Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute bottom-32 right-4 h-10 w-10 rounded-full bg-black/40 hover:bg-black/60 z-20"
                    onClick={(e) => toggleMute(video.id, e)}
                  >
                    {isMuted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
                  </Button>

                  {/* User Info */}
                  <div className="absolute bottom-4 left-4 right-20 text-white z-10">
                    <div className="flex items-center gap-3 mb-3">
                      <Link to={`/profile/${video.user_id}`}>
                        <Avatar className="h-10 w-10 ring-2 ring-white/50">
                          <AvatarImage src={video.profiles.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-500 text-white font-bold">
                            {video.profiles.username[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <Link to={`/profile/${video.user_id}`} className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm">{video.profiles.username}</span>
                        {video.profiles.verified && (
                          <VerificationBadge verified={video.profiles.verified} badgeType={video.profiles.badge_type} className="w-3.5 h-3.5" />
                        )}
                      </Link>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 px-3 text-xs rounded-md border-white/50 text-white bg-transparent hover:bg-white/20"
                      >
                        Seguir
                      </Button>
                    </div>
                    
                    {video.caption && (
                      <p className="text-sm leading-relaxed mb-2">
                        {isExpanded ? video.caption : captionPreview}
                        {needsExpand && (
                          <button onClick={(e) => { e.stopPropagation(); setExpandedCaptions(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(video.id)) newSet.delete(video.id);
                            else newSet.add(video.id);
                            return newSet;
                          }); }} className="ml-1 text-gray-300 font-medium">
                            {isExpanded ? 'menos' : '... mais'}
                          </button>
                        )}
                      </p>
                    )}

                    {/* Music info */}
                    {video.music_name ? (
                      <div className="mb-2">
                        <MusicPlayer musicName={video.music_name} musicArtist={video.music_artist} musicUrl={video.music_url} overlay />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-white/70">
                        <Music2 className="h-3 w-3" />
                        <span className="truncate">Áudio original • {video.profiles.username}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="absolute bottom-24 right-3 flex flex-col items-center gap-4 z-10">
                    <motion.button 
                      className="flex flex-col items-center"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleLike(video)}
                    >
                      <Heart className={`h-7 w-7 ${video.has_liked ? "fill-red-500 text-red-500" : "text-white"}`} />
                      <span className="text-white text-xs font-medium mt-1">{video.likes_count}</span>
                    </motion.button>

                    <motion.button 
                      className="flex flex-col items-center"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        if (video.source === 'reels') navigate(`/comments-video/${video.original_id}`);
                        else navigate(`/comments/${video.original_id}`);
                      }}
                    >
                      <MessageCircle className="h-7 w-7 text-white" />
                      <span className="text-white text-xs font-medium mt-1">{video.comments_count}</span>
                    </motion.button>

                    <motion.button 
                      className="flex flex-col items-center"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleShare(video)}
                    >
                      <Send className="h-7 w-7 text-white" />
                    </motion.button>

                    <motion.button className="flex flex-col items-center" whileTap={{ scale: 0.9 }}>
                      <Bookmark className="h-7 w-7 text-white" />
                    </motion.button>

                    {video.views > 0 && (
                      <div className="flex flex-col items-center mt-2">
                        <Eye className="h-5 w-5 text-white/70" />
                        <span className="text-white/70 text-xs font-medium mt-0.5">{formatViewCount(video.views)}</span>
                      </div>
                    )}

                    {video.user_id === currentUserId && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="mt-2">
                            <MoreVertical className="h-6 w-6 text-white" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur">
                          <DropdownMenuItem
                            onClick={async () => {
                              if (video.source === 'reels') {
                                await supabase.from("verification_videos").delete().eq("id", video.original_id);
                              } else {
                                await supabase.from("posts").delete().eq("id", video.original_id);
                              }
                              toast.success("Vídeo eliminado");
                              loadAllVideos();
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        <style>{`
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
