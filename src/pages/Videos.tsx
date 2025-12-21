import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Send, Bookmark, Upload, MoreVertical, Play, Pause, Volume2, VolumeX, Eye, Music2 } from "lucide-react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import VerificationBadge from "@/components/VerificationBadge";
import { VideosSkeleton } from "@/components/loading/VideosSkeleton";
import { motion, AnimatePresence } from "framer-motion";

interface Video {
  id: string;
  user_id: string;
  video_url: string;
  caption: string;
  created_at: string;
  share_code: string;
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

export default function Videos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [expandedCaptions, setExpandedCaptions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [playingStates, setPlayingStates] = useState<{ [key: string]: boolean }>({});
  const [mutedStates, setMutedStates] = useState<{ [key: string]: boolean }>({});
  const [viewCounts, setViewCounts] = useState<{ [key: string]: number }>({});
  const { shareCode } = useParams();
  const navigate = useNavigate();
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCurrentUser();
    loadVideos();

    const channel = supabase
      .channel("videos-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "verification_videos" }, () => loadVideos())
      .on("postgres_changes", { event: "*", schema: "public", table: "video_views" }, (payload: any) => {
        if (payload.new?.video_id) {
          updateViewCount(payload.new.video_id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shareCode]);

  useEffect(() => {
    if (videos.length > 0 && videos[currentVideoIndex]) {
      const currentVideo = videoRefs.current[videos[currentVideoIndex].id];
      if (currentVideo) {
        currentVideo.muted = mutedStates[videos[currentVideoIndex].id] ?? false;
        currentVideo.play().catch(() => {});
        setPlayingStates(prev => ({ ...prev, [videos[currentVideoIndex].id]: true }));
        recordView(videos[currentVideoIndex].id);
      }
      
      videos.forEach((video, index) => {
        if (index !== currentVideoIndex) {
          const vid = videoRefs.current[video.id];
          if (vid) {
            vid.pause();
            setPlayingStates(prev => ({ ...prev, [video.id]: false }));
          }
        }
      });
    }
  }, [currentVideoIndex, videos]);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const videoHeight = window.innerHeight - 56;
      const newIndex = Math.round(scrollTop / videoHeight);
      if (newIndex !== currentVideoIndex && newIndex >= 0 && newIndex < videos.length) {
        setCurrentVideoIndex(newIndex);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [currentVideoIndex, videos.length]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const recordView = async (videoId: string) => {
    if (!currentUserId) return;
    try {
      await supabase.from("video_views").upsert({ 
        video_id: videoId, 
        user_id: currentUserId 
      }, { onConflict: 'video_id,user_id' });
    } catch (e) {
      // Silent fail
    }
  };

  const updateViewCount = async (videoId: string) => {
    const { count } = await supabase
      .from("video_views")
      .select("*", { count: "exact", head: true })
      .eq("video_id", videoId);
    setViewCounts(prev => ({ ...prev, [videoId]: count || 0 }));
  };

  const loadVideos = async () => {
    const startTime = Date.now();
    try {
      let query = supabase
        .from("verification_videos")
        .select(`
          *,
          profiles (username, avatar_url, verified, badge_type),
          verification_video_likes (user_id),
          verification_video_comments (id),
          video_views (user_id)
        `)
        .order("created_at", { ascending: false });

      if (shareCode) query = query.eq("share_code", shareCode);

      const { data, error } = await query;
      if (error) {
        toast.error("Erro ao carregar vídeos");
        return;
      }

      setVideos(data || []);
      
      // Initialize view counts
      const counts: { [key: string]: number } = {};
      (data || []).forEach(v => { counts[v.id] = v.video_views?.length || 0; });
      setViewCounts(counts);
    } finally {
      const elapsed = Date.now() - startTime;
      setTimeout(() => setLoading(false), Math.max(0, 2000 - elapsed));
    }
  };

  const handleVideoFileChange = (file: File | null) => {
    if (!file) { setVideoFile(null); setVideoPreview(null); return; }
    const ok = ["video/mp4", "video/webm"].includes(file.type);
    if (!ok) { toast.error("Formato não suportado. Use MP4 ou WebM."); return; }
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
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

  const handleLike = async (videoId: string) => {
    const video = videos.find(v => v.id === videoId);
    const hasLiked = video?.verification_video_likes?.some(l => l.user_id === currentUserId);
    if (hasLiked) {
      await supabase.from("verification_video_likes").delete().eq("video_id", videoId).eq("user_id", currentUserId);
    } else {
      await supabase.from("verification_video_likes").insert({ video_id: videoId, user_id: currentUserId });
    }
    loadVideos();
  };

  const handleShare = async (video: Video) => {
    const shareUrl = `${window.location.origin}/videos/${video.share_code}`;
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Link copiado!");
  };

  const handleUpload = async () => {
    if (!videoFile) { toast.error("Selecione um vídeo"); return; }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const fileExt = videoFile.name.split(".").pop()?.toLowerCase() || "mp4";
      if (!['mp4', 'webm'].includes(fileExt)) { toast.error("Formato não suportado."); return; }

      const fileName = `videos/${user.id}/${Date.now()}.${fileExt}`;
      const contentType = fileExt === "webm" ? "video/webm" : "video/mp4";
      const arrayBuffer = await videoFile.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, arrayBuffer, { cacheControl: '3600', upsert: false, contentType });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(fileName);

      await supabase.from("verification_videos").insert({ user_id: user.id, video_url: publicUrl, caption });

      toast.success("Vídeo publicado!");
      setUploadOpen(false);
      setVideoFile(null);
      setVideoPreview(null);
      setCaption("");
      loadVideos();
    } catch (error: any) {
      toast.error(error.message || "Erro ao publicar vídeo");
    } finally {
      setUploading(false);
    }
  };

  const formatViewCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black">
        <TopBar />

        <div className="fixed top-14 left-4 z-50 flex items-center gap-2">
          <span className="text-white font-bold text-xl">Reels</span>
        </div>

        <div 
          ref={containerRef}
          className="h-[calc(100vh-56px)] mt-14 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        >
          {loading ? (
            <VideosSkeleton />
          ) : videos.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-white gap-4">
              <Upload className="h-16 w-16 text-muted-foreground" />
              <p className="text-lg">Nenhum vídeo disponível</p>
              <Button onClick={() => setUploadOpen(true)} variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Publicar primeiro vídeo
              </Button>
            </div>
          ) : (
            videos.map((video, index) => {
              const isExpanded = expandedCaptions.has(video.id);
              const captionPreview = video.caption?.slice(0, 60);
              const needsExpand = video.caption && video.caption.length > 60;
              const isPlaying = playingStates[video.id];
              const isMuted = mutedStates[video.id] ?? false;
              const hasLiked = video.verification_video_likes?.some(l => l.user_id === currentUserId);
              const views = viewCounts[video.id] || 0;

              return (
                <motion.div 
                  key={video.id} 
                  className="relative h-[calc(100vh-56px)] w-full bg-black snap-start snap-always flex items-center justify-center"
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
                      preload="auto"
                      className="w-full h-full object-contain"
                      onPlay={() => setPlayingStates(prev => ({ ...prev, [video.id]: true }))}
                      onPause={() => setPlayingStates(prev => ({ ...prev, [video.id]: false }))}
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

                  {/* User Info - Instagram Style */}
                  <div className="absolute bottom-4 left-4 right-20 text-white z-10">
                    <div className="flex items-center gap-3 mb-3">
                      <Link to={`/profile/${video.user_id}`}>
                        <Avatar className="h-10 w-10 ring-2 ring-white/50">
                          <AvatarImage src={video.profiles.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-500 text-white font-bold">
                            {video.profiles.username[0].toUpperCase()}
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
                          <button onClick={() => setExpandedCaptions(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(video.id)) newSet.delete(video.id);
                            else newSet.add(video.id);
                            return newSet;
                          })} className="ml-1 text-gray-300 font-medium">
                            {isExpanded ? 'menos' : '... mais'}
                          </button>
                        )}
                      </p>
                    )}

                    {/* Audio Info */}
                    <div className="flex items-center gap-2 text-xs text-white/70">
                      <Music2 className="h-3 w-3" />
                      <span className="truncate">Áudio original • {video.profiles.username}</span>
                    </div>
                  </div>

                  {/* Action Buttons - Instagram Style */}
                  <div className="absolute bottom-24 right-3 flex flex-col items-center gap-4 z-10">
                    <motion.button 
                      className="flex flex-col items-center"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleLike(video.id)}
                    >
                      <Heart className={`h-7 w-7 ${hasLiked ? "fill-red-500 text-red-500" : "text-white"}`} />
                      <span className="text-white text-xs font-medium mt-1">{video.verification_video_likes?.length || 0}</span>
                    </motion.button>

                    <motion.button 
                      className="flex flex-col items-center"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => navigate(`/comments-video/${video.id}`)}
                    >
                      <MessageCircle className="h-7 w-7 text-white" />
                      <span className="text-white text-xs font-medium mt-1">{video.verification_video_comments?.length || 0}</span>
                    </motion.button>

                    <motion.button 
                      className="flex flex-col items-center"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleShare(video)}
                    >
                      <Send className="h-7 w-7 text-white" />
                    </motion.button>

                    <motion.button 
                      className="flex flex-col items-center"
                      whileTap={{ scale: 0.9 }}
                    >
                      <Bookmark className="h-7 w-7 text-white" />
                    </motion.button>

                    {/* Views Count */}
                    <div className="flex flex-col items-center mt-2">
                      <Eye className="h-5 w-5 text-white/70" />
                      <span className="text-white/70 text-xs font-medium mt-0.5">{formatViewCount(views)}</span>
                    </div>

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
                              await supabase.from("verification_videos").delete().eq("id", video.id);
                              toast.success("Vídeo eliminado");
                              loadVideos();
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

        {/* Mobile Upload Button */}
        <div className="fixed bottom-20 right-4 z-50 md:hidden">
          <Button onClick={() => setUploadOpen(true)} size="icon" className="h-14 w-14 rounded-full shadow-lg">
            <Upload className="h-6 w-6" />
          </Button>
        </div>

        {/* Upload Dialog */}
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Publicar Vídeo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {videoPreview ? (
                <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                  <video src={videoPreview} controls className="w-full h-full object-contain" />
                  <Button variant="ghost" size="sm" className="absolute top-2 right-2" onClick={() => { setVideoFile(null); setVideoPreview(null); }}>
                    Trocar
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/30">
                  <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Clique para selecionar</span>
                  <Input type="file" accept="video/mp4,video/webm" className="hidden" onChange={(e) => handleVideoFileChange(e.target.files?.[0] || null)} />
                </label>
              )}
              <Textarea placeholder="Adicione uma legenda..." value={caption} onChange={(e) => setCaption(e.target.value)} className="min-h-24 resize-none" />
              <Button onClick={handleUpload} disabled={uploading || !videoFile} className="w-full">
                {uploading ? "Publicando..." : "Publicar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <style>{`
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </div>
    </ProtectedRoute>
  );
}
