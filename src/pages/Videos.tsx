import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageSquare, Share2, Upload, MoreVertical, Play, Pause, Volume2, VolumeX } from "lucide-react";
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
  const { shareCode } = useParams();
  const navigate = useNavigate();
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCurrentUser();
    loadVideos();

    const channel = supabase
      .channel("videos-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "verification_videos",
        },
        () => loadVideos()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shareCode]);

  useEffect(() => {
    // Auto-play current video when scrolling
    if (videos.length > 0 && videos[currentVideoIndex]) {
      const currentVideo = videoRefs.current[videos[currentVideoIndex].id];
      if (currentVideo) {
        currentVideo.play().catch(() => {});
        setPlayingStates(prev => ({ ...prev, [videos[currentVideoIndex].id]: true }));
      }
      
      // Pause other videos
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

  const loadVideos = async () => {
    const startTime = Date.now();
    try {
      let query = supabase
        .from("verification_videos")
        .select(`
          *,
          profiles (
            username,
            avatar_url,
            verified,
            badge_type
          ),
          verification_video_likes (user_id),
          verification_video_comments (id)
        `)
        .order("created_at", { ascending: false });

      if (shareCode) {
        query = query.eq("share_code", shareCode);
      }

      const { data, error } = await query;

      if (error) {
        toast.error("Erro ao carregar vídeos");
        return;
      }

      setVideos(data || []);
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 2000 - elapsed);
      setTimeout(() => {
        setLoading(false);
      }, remaining);
    }
  };

  const handleVideoFileChange = (file: File | null) => {
    setVideoFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
    } else {
      setVideoPreview(null);
    }
  };

  const togglePlayPause = (videoId: string) => {
    const video = videoRefs.current[videoId];
    if (video) {
      if (video.paused) {
        video.play();
        setPlayingStates(prev => ({ ...prev, [videoId]: true }));
      } else {
        video.pause();
        setPlayingStates(prev => ({ ...prev, [videoId]: false }));
      }
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
    try {
      const video = videos.find(v => v.id === videoId);
      const hasLiked = video?.verification_video_likes?.some(like => like.user_id === currentUserId);

      if (hasLiked) {
        await supabase
          .from("verification_video_likes")
          .delete()
          .eq("video_id", videoId)
          .eq("user_id", currentUserId);
      } else {
        await supabase
          .from("verification_video_likes")
          .insert({ video_id: videoId, user_id: currentUserId });
      }

      loadVideos();
    } catch (error: any) {
      toast.error("Erro ao curtir vídeo");
    }
  };

  const handleShare = async (video: Video) => {
    const shareUrl = `${window.location.origin}/videos/${video.share_code}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copiado!");
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  const handleUpload = async () => {
    if (!videoFile) {
      toast.error("Selecione um vídeo");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, videoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName);

      const { error } = await supabase.from("verification_videos").insert({
        user_id: user.id,
        video_url: publicUrl,
        caption,
      });

      if (error) throw error;

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

  const toggleCaption = (videoId: string) => {
    setExpandedCaptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black">
        <TopBar />

        <div className="fixed top-14 right-4 z-50 md:block hidden">
          <Button onClick={() => setUploadOpen(true)} size="sm" className="gap-2 rounded-full">
            <Upload className="h-4 w-4" />
            Upload
          </Button>
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
              const captionPreview = video.caption?.slice(0, 80);
              const needsExpand = video.caption && video.caption.length > 80;
              const isPlaying = playingStates[video.id];
              const isMuted = mutedStates[video.id] ?? true;
              const hasLiked = video.verification_video_likes?.some(l => l.user_id === currentUserId);

              return (
                <motion.div 
                  key={video.id} 
                  className="relative h-[calc(100vh-56px)] w-full bg-black snap-start snap-always flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Video Player */}
                  <div className="relative w-full h-full" onClick={() => togglePlayPause(video.id)}>
                    <video
                      ref={(el) => { videoRefs.current[video.id] = el; }}
                      src={video.video_url}
                      loop
                      muted={isMuted}
                      playsInline
                      preload="auto"
                      className="w-full h-full object-contain"
                      onPlay={() => setPlayingStates(prev => ({ ...prev, [video.id]: true }))}
                      onPause={() => setPlayingStates(prev => ({ ...prev, [video.id]: false }))}
                    />
                    
                    {/* Play/Pause Overlay */}
                    <AnimatePresence>
                      {!isPlaying && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        >
                          <div className="h-20 w-20 rounded-full bg-black/40 flex items-center justify-center">
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
                    className="absolute top-4 right-4 h-10 w-10 rounded-full bg-black/40 hover:bg-black/60 z-20"
                    onClick={(e) => toggleMute(video.id, e)}
                  >
                    {isMuted ? (
                      <VolumeX className="h-5 w-5 text-white" />
                    ) : (
                      <Volume2 className="h-5 w-5 text-white" />
                    )}
                  </Button>

                  {/* User Info */}
                  <div className="absolute bottom-20 left-4 right-20 text-white z-10">
                    <div className="flex items-center gap-3 mb-3">
                      <Link to={`/profile/${video.user_id}`}>
                        <Avatar className="h-12 w-12 ring-2 ring-white cursor-pointer">
                          <AvatarImage src={video.profiles.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-500 text-white font-bold">
                            {video.profiles.username[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div>
                        <Link to={`/profile/${video.user_id}`} className="flex items-center gap-1.5 hover:underline">
                          <span className="font-bold text-base">{video.profiles.username}</span>
                          {video.profiles.verified && (
                            <VerificationBadge 
                              verified={video.profiles.verified}
                              badgeType={video.profiles.badge_type} 
                              className="w-4 h-4" 
                            />
                          )}
                        </Link>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 px-3 mt-1 text-xs rounded-full border-white/50 text-white hover:bg-white/20"
                        >
                          Seguir
                        </Button>
                      </div>
                    </div>
                    
                    {video.caption && (
                      <div className="text-sm leading-relaxed">
                        <p className="break-words">
                          {isExpanded ? video.caption : captionPreview}
                          {needsExpand && (
                            <button
                              onClick={() => toggleCaption(video.id)}
                              className="ml-2 text-gray-300 font-semibold hover:text-white"
                            >
                              {isExpanded ? 'ver menos' : '... ver mais'}
                            </button>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="absolute bottom-20 right-4 flex flex-col items-center gap-5 z-10">
                    <motion.div 
                      className="flex flex-col items-center"
                      whileTap={{ scale: 0.9 }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-12 w-12 rounded-full bg-black/20 hover:bg-black/40"
                        onClick={() => handleLike(video.id)}
                      >
                        <Heart
                          className={`h-7 w-7 transition-all ${
                            hasLiked ? "fill-red-500 text-red-500" : "text-white"
                          }`}
                        />
                      </Button>
                      <span className="text-white text-xs font-semibold mt-1">
                        {video.verification_video_likes?.length || 0}
                      </span>
                    </motion.div>

                    <motion.div 
                      className="flex flex-col items-center"
                      whileTap={{ scale: 0.9 }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-12 w-12 rounded-full bg-black/20 hover:bg-black/40"
                        onClick={() => navigate(`/comments-video/${video.id}`)}
                      >
                        <MessageSquare className="h-7 w-7 text-white" />
                      </Button>
                      <span className="text-white text-xs font-semibold mt-1">
                        {video.verification_video_comments?.length || 0}
                      </span>
                    </motion.div>

                    <motion.div 
                      className="flex flex-col items-center"
                      whileTap={{ scale: 0.9 }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-12 w-12 rounded-full bg-black/20 hover:bg-black/40"
                        onClick={() => handleShare(video)}
                      >
                        <Share2 className="h-7 w-7 text-white" />
                      </Button>
                    </motion.div>

                    {video.user_id === currentUserId && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-12 w-12 rounded-full bg-black/20 hover:bg-black/40"
                          >
                            <MoreVertical className="h-7 w-7 text-white" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur">
                          <DropdownMenuItem
                            onClick={async () => {
                              try {
                                await supabase
                                  .from("verification_videos")
                                  .delete()
                                  .eq("id", video.id);
                                toast.success("Vídeo eliminado");
                                loadVideos();
                              } catch {
                                toast.error("Erro ao eliminar");
                              }
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
          <Button 
            onClick={() => setUploadOpen(true)} 
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
          >
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
                  <video 
                    src={videoPreview} 
                    controls 
                    className="w-full h-full object-contain"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setVideoFile(null);
                      setVideoPreview(null);
                    }}
                  >
                    Trocar
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                  <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Clique para selecionar um vídeo</span>
                  <Input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => handleVideoFileChange(e.target.files?.[0] || null)}
                  />
                </label>
              )}
              
              <Textarea
                placeholder="Adicione uma legenda..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="min-h-24 resize-none"
              />
              
              <Button
                onClick={handleUpload}
                disabled={uploading || !videoFile}
                className="w-full"
              >
                {uploading ? "Publicando..." : "Publicar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <style>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
      </div>
    </ProtectedRoute>
  );
}
