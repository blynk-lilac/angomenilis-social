import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { MessageNotification } from "@/components/MessageNotification";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Share2, Bookmark, Play, Volume2, VolumeX, MoreHorizontal, Heart, Repeat2 } from "lucide-react";
import { MusicPlayer, pauseAllAudio } from "@/components/MusicPlayer";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import StoriesBar from "@/components/StoriesBar";
import CreateStory from "@/components/CreateStory";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import VerificationBadge, { hasSpecialBadgeEmoji } from "@/components/VerificationBadge";
import { FeedSkeleton } from "@/components/loading/FeedSkeleton";
import { parseTextWithLinksAndMentions } from "@/utils/textUtils";
import { SponsoredAd } from "@/components/SponsoredAd";
import { ImageGalleryViewer } from "@/components/ImageGalleryViewer";
import { UserSuggestions } from "@/components/UserSuggestions";
import { motion, AnimatePresence } from "framer-motion";
import PostOptionsSheet from "@/components/PostOptionsSheet";
import { playLikeSound, playClickSound } from "@/utils/soundEffects";
import { useRateLimiting } from "@/hooks/useRateLimiting";
interface Post {
  id: string;
  content: string;
  user_id: string;
  media_urls?: string[];
  music_name?: string | null;
  music_artist?: string | null;
  music_url?: string | null;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    full_name: string;
    first_name: string;
    avatar_url: string;
    verified?: boolean;
    badge_type?: string | null;
  };
  post_likes: { user_id: string }[];
  post_reactions: { user_id: string; reaction_type: string }[];
  comments: { id: string }[];
}

export default function Feed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { checkLikeLimit } = useRateLimiting();
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [createStoryOpen, setCreateStoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sponsoredAds, setSponsoredAds] = useState<any[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[] | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [savedPosts, setSavedPosts] = useState<string[]>([]);
  const [optionsSheet, setOptionsSheet] = useState<{ open: boolean; post: Post | null }>({ open: false, post: null });
  const [mutedVideos, setMutedVideos] = useState<{ [key: string]: boolean }>({});
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedVideosRef = useRef<Set<HTMLVideoElement>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        // Load profile and saved posts in parallel
        const [profileResult, savedResult] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('saved_posts').select('post_id').eq('user_id', user.id)
        ]);
        
        if (profileResult.data) setMyProfile(profileResult.data);
        if (savedResult.data) setSavedPosts(savedResult.data.map(s => s.post_id));
      }
      
      // Load posts and ads in parallel for speed
      await Promise.all([loadPosts(), loadSponsoredAds()]);
      // Show content immediately - no artificial delay
      setLoading(false);
    };
    loadData();

    const channel = supabase
      .channel("posts-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => loadPosts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Intersection Observer for video autoplay/pause (scroll)
  useEffect(() => {
    observerRef.current?.disconnect();
    observedVideosRef.current = new Set();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;

          if (entry.isIntersecting) {
            // Pause all other videos and music
            pauseAllAudio();
            observedVideosRef.current.forEach((v) => {
              if (v !== video && !v.paused) v.pause();
            });

            // Unmute and play the visible video
            video.muted = false;
            video.play().catch(() => {
              // If autoplay with sound fails, try muted
              video.muted = true;
              video.play().catch(console.log);
            });
          } else {
            if (!video.paused) video.pause();
          }
        });
      },
      {
        threshold: 0.55,
        rootMargin: '0px 0px -20% 0px',
      }
    );

    observerRef.current = observer;

    // Observe all current videos
    Object.values(videoRefs.current).forEach((video) => {
      if (!video) return;
      observedVideosRef.current.add(video);
      observer.observe(video);
    });

    return () => {
      observer.disconnect();
      observerRef.current = null;
      observedVideosRef.current.clear();
    };
  }, [posts]);

  const loadPosts = async () => {
    const { data } = await supabase
      .from("posts")
      .select(`*, profiles(id, username, full_name, first_name, avatar_url, verified, badge_type), post_likes(user_id), post_reactions(user_id, reaction_type), comments(id)`)
      .order("created_at", { ascending: false })
      .limit(30); // Limit for faster initial load

    if (data) setPosts(data);
  };

  const loadSponsoredAds = async () => {
    const { data } = await supabase.from("sponsored_ads").select("*").eq("is_active", true);
    if (data) setSponsoredAds(data);
  };

  const handleLike = async (postId: string) => {
    if (!currentUserId) return;

    const { data: existingReaction } = await supabase
      .from("post_reactions")
      .select("*")
      .eq("post_id", postId)
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (existingReaction) {
      await supabase.from("post_reactions").delete().eq("id", existingReaction.id);
      playClickSound();
    } else {
      // Check rate limit before liking
      const allowed = await checkLikeLimit();
      if (!allowed) return;
      
      await supabase.from("post_reactions").insert({ post_id: postId, user_id: currentUserId, reaction_type: "heart" });
      playLikeSound();
    }

    loadPosts();
  };

  const handleSave = async (postId: string) => {
    if (!currentUserId) return;

    if (savedPosts.includes(postId)) {
      await supabase.from('saved_posts').delete().eq('post_id', postId).eq('user_id', currentUserId);
      setSavedPosts(savedPosts.filter(id => id !== postId));
      toast.success('Removido dos guardados');
    } else {
      await supabase.from('saved_posts').insert({ post_id: postId, user_id: currentUserId });
      setSavedPosts([...savedPosts, postId]);
      toast.success('Guardado!');
    }
  };

  const getUserReaction = (post: Post) => {
    return post.post_reactions?.find(r => r.user_id === currentUserId)?.reaction_type;
  };

  const isVideo = (url: string) => {
    if (!url) return false;
    const lowercaseUrl = url.toLowerCase();
    return lowercaseUrl.includes(".mp4") || lowercaseUrl.includes(".webm") || lowercaseUrl.includes(".mov") || lowercaseUrl.includes(".avi") || lowercaseUrl.includes(".mkv");
  };

  const toggleVideoMute = (postId: string) => {
    const video = videoRefs.current[postId];
    if (video) {
      video.muted = !video.muted;
      setMutedVideos({ ...mutedVideos, [postId]: video.muted });
    }
  };

  const registerVideoRef = (key: string) => (el: HTMLVideoElement | null) => {
    const prev = videoRefs.current[key];

    if (prev && observerRef.current) {
      observerRef.current.unobserve(prev);
      observedVideosRef.current.delete(prev);
    }

    if (el) {
      videoRefs.current[key] = el;
      observedVideosRef.current.add(el);
      observerRef.current?.observe(el);
    } else {
      delete videoRefs.current[key];
    }
  };

  const VideoPlayer = ({ url, postId }: { url: string; postId: string }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasError, setHasError] = useState(false);
    const isMuted = mutedVideos[postId] ?? false;

    if (hasError) {
      return (
        <div className="relative bg-muted overflow-hidden aspect-video flex items-center justify-center">
          <div className="text-center p-4">
            <Play className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Erro ao carregar vídeo</p>
          </div>
        </div>
      );
    }

    return (
      <div className="relative bg-black overflow-hidden" onClick={() => {
        const video = videoRefs.current[postId];
        if (video) {
          if (video.paused) {
            pauseAllAudio();
            video.play();
          } else {
            video.pause();
          }
        }
      }}>
        <video
          ref={registerVideoRef(postId)}
          className="w-full max-h-[600px] object-contain cursor-pointer"
          playsInline
          muted={isMuted}
          loop
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={() => setHasError(true)}
        >
          <source src={url} type="video/mp4" />
        </video>

        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20">
            <div className="h-16 w-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              <Play className="h-8 w-8 text-foreground fill-foreground ml-1" />
            </div>
          </div>
        )}

        <button
          className="absolute bottom-4 right-4 h-8 w-8 rounded-full bg-black/60 flex items-center justify-center"
          onClick={(e) => { e.stopPropagation(); toggleVideoMute(postId); }}
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4 text-white" />
          ) : (
            <Volume2 className="h-4 w-4 text-white" />
          )}
        </button>
      </div>
    );
  };

  const renderMediaGrid = (mediaUrls: string[], postId: string) => {
    if (!mediaUrls || mediaUrls.length === 0) return null;

    if (mediaUrls.length === 1) {
      const url = mediaUrls[0];
      return (
        <div className="relative">
          {isVideo(url) ? (
            <VideoPlayer url={url} postId={postId} />
          ) : (
            <img 
              src={url} 
              alt="Post" 
              className="w-full object-cover cursor-pointer" 
              onClick={() => setGalleryImages(mediaUrls)}
            />
          )}
        </div>
      );
    }

    return (
      <div className={`grid gap-0.5 ${mediaUrls.length === 2 ? 'grid-cols-2' : mediaUrls.length >= 3 ? 'grid-cols-2' : ''}`}>
        {mediaUrls.slice(0, 4).map((url, idx) => (
          <div 
            key={idx} 
            className={`relative cursor-pointer ${mediaUrls.length === 3 && idx === 0 ? 'row-span-2' : ''}`}
            onClick={() => { 
              if (!isVideo(url)) {
                setGalleryImages(mediaUrls.filter(u => !isVideo(u))); 
                setGalleryIndex(idx); 
              }
            }}
          >
            {isVideo(url) ? (
              <div className="relative aspect-square bg-black">
                <video
                  src={url}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  preload="metadata"
                  onClick={(e) => {
                    e.stopPropagation();
                    pauseAllAudio();
                    const vid = e.currentTarget;
                    if (vid.paused) vid.play();
                    else vid.pause();
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Play className="h-12 w-12 text-white/80 fill-white/80" />
                </div>
              </div>
            ) : (
              <img src={url} alt="" className="w-full aspect-square object-cover" />
            )}
            {idx === 3 && mediaUrls.length > 4 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">+{mediaUrls.length - 4}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <MessageNotification />
        <div className="min-h-screen bg-background">
          <TopBar />
          <FeedSkeleton />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <MessageNotification />
      <div className="min-h-screen bg-background">
        <TopBar />

        <div className="pt-16 pb-20">
          <div className="max-w-xl mx-auto">
            {/* Stories Bar - Premium Design */}
            <div className="px-3 py-4 bg-gradient-to-b from-card to-transparent">
              <StoriesBar onCreateStory={() => setCreateStoryOpen(true)} />
            </div>

            {/* Create Post Card - Facebook Style */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-3 mb-4"
            >
              <div className="bg-card border border-border shadow-sm rounded-lg overflow-hidden">
                <div className="p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={myProfile?.avatar_url} className="object-cover" />
                      <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                        {myProfile?.first_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      onClick={() => navigate("/create")}
                      className="flex-1 h-10 px-4 bg-muted hover:bg-muted/80 rounded-full text-left text-muted-foreground transition-colors text-sm"
                    >
                      No que estás a pensar, {myProfile?.first_name || 'amigo'}?
                    </button>
                  </div>
                </div>
                <div className="border-t border-border flex">
                  <button 
                    onClick={() => navigate("/create")}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-red-500">🎥</span> Vídeo em direto
                  </button>
                  <button 
                    onClick={() => navigate("/create")}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors border-l border-border"
                  >
                    <span className="text-green-500">📷</span> Foto/vídeo
                  </button>
                  <button 
                    onClick={() => navigate("/create")}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors border-l border-border"
                  >
                    <span className="text-yellow-500">😊</span> Sentimento
                  </button>
                </div>
              </div>
            </motion.div>

            {/* User Suggestions - Enhanced */}
            <div className="px-3 mb-5">
              <UserSuggestions />
            </div>

            {/* Posts Feed - Threads Style */}
            <div className="space-y-0">
              {posts.map((post, index) => {
                const userReaction = getUserReaction(post);
                const totalReactions = post.post_reactions?.length || 0;
                const isSaved = savedPosts.includes(post.id);

                const showAd = index > 0 && index % 5 === 0 && sponsoredAds.length > 0;
                const adIndex = Math.floor(index / 5) % sponsoredAds.length;

                return (
                  <div key={post.id}>
                    {showAd && (
                      <SponsoredAd 
                        ad={sponsoredAds[adIndex]} 
                        likesCount={0}
                        isLiked={false}
                        userId={currentUserId}
                      />
                    )}
                    
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02, duration: 0.4 }}
                    >
                      {/* Facebook Style Post Card */}
                      <div className="bg-card border border-border shadow-sm rounded-lg mb-3 mx-3 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center gap-3 p-3">
                          <Avatar 
                            className="h-10 w-10 cursor-pointer"
                            onClick={() => navigate(`/profile/${post.profiles.id}`)}
                          >
                            <AvatarImage src={post.profiles.avatar_url} className="object-cover" />
                            <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                              {post.profiles.first_name?.[0] || post.profiles.username?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div 
                              className="flex items-center gap-1.5 cursor-pointer"
                              onClick={() => navigate(`/profile/${post.profiles.id}`)}
                            >
                              <span className="font-semibold text-sm hover:underline">
                                {post.profiles.first_name || post.profiles.username}
                              </span>
                              {(post.profiles.verified || hasSpecialBadgeEmoji(post.profiles.username) || hasSpecialBadgeEmoji(post.profiles.full_name)) && (
                                <VerificationBadge 
                                  verified={post.profiles.verified} 
                                  badgeType={post.profiles.badge_type} 
                                  username={post.profiles.username}
                                  fullName={post.profiles.full_name}
                                  className="w-4 h-4" 
                                />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
                            </p>
                          </div>
                          
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-full hover:bg-muted"
                            onClick={() => setOptionsSheet({ open: true, post })}
                          >
                            <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                          </Button>
                        </div>

                        {/* Content */}
                        {post.content && (
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed px-3 py-2 text-foreground">
                            {parseTextWithLinksAndMentions(post.content)}
                          </p>
                        )}

                        {/* Media */}
                        {post.media_urls && post.media_urls.length > 0 && (
                          <div className="relative overflow-hidden">
                            {renderMediaGrid(post.media_urls, post.id)}
                            
                            {post.music_name && (
                              <div className="absolute bottom-3 left-3 right-3">
                                <MusicPlayer 
                                  musicName={post.music_name}
                                  musicArtist={post.music_artist}
                                  musicUrl={post.music_url}
                                  overlay
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Music without media */}
                        {post.music_name && (!post.media_urls || post.media_urls.length === 0) && (
                          <div className="px-3 py-2">
                            <MusicPlayer 
                              musicName={post.music_name}
                              musicArtist={post.music_artist}
                              musicUrl={post.music_url}
                            />
                          </div>
                        )}

                        {/* Facebook Style Actions */}
                        <div className="border-t border-border mx-3 mt-2">
                          <div className="flex items-center justify-between py-1">
                            <button
                              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md hover:bg-muted transition-colors"
                              onClick={() => handleLike(post.id)}
                            >
                              <Heart 
                                className={`h-5 w-5 ${userReaction ? 'text-red-500 fill-red-500' : 'text-muted-foreground'}`} 
                              />
                              <span className={`text-sm font-medium ${userReaction ? 'text-red-500' : 'text-muted-foreground'}`}>
                                Gosto
                              </span>
                            </button>

                            <button
                              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-muted-foreground hover:bg-muted transition-colors"
                              onClick={() => navigate(`/comments/${post.id}`)}
                            >
                              <MessageCircle className="h-5 w-5" />
                              <span className="text-sm font-medium">Comentar</span>
                            </button>

                            <button 
                              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-muted-foreground hover:bg-muted transition-colors"
                              onClick={() => {
                                navigator.share?.({
                                  title: 'Publicação',
                                  text: post.content?.slice(0, 100),
                                  url: `${window.location.origin}/post/${post.id}`
                                }).catch(() => {
                                  navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
                                  toast.success("Link copiado!");
                                });
                              }}
                            >
                              <Share2 className="h-5 w-5" />
                              <span className="text-sm font-medium">Partilhar</span>
                            </button>
                          </div>
                        </div>

                        {/* Likes and comments count */}
                        {(totalReactions > 0 || post.comments.length > 0) && (
                          <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground">
                            {totalReactions > 0 && (
                              <button 
                                className="flex items-center gap-1 hover:underline"
                                onClick={() => navigate(`/post/${post.id}/likes`)}
                              >
                                <span className="text-red-500">❤️</span>
                                {totalReactions}
                              </button>
                            )}
                            {post.comments.length > 0 && (
                              <button 
                                className="hover:underline ml-auto"
                                onClick={() => navigate(`/comments/${post.id}`)}
                              >
                                {post.comments.length} comentário{post.comments.length !== 1 ? 's' : ''}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Post Options Sheet */}
        {optionsSheet.post && (
          <PostOptionsSheet
            open={optionsSheet.open}
            onOpenChange={(open) => setOptionsSheet({ ...optionsSheet, open })}
            postId={optionsSheet.post.id}
            postUserId={optionsSheet.post.user_id}
            currentUserId={currentUserId}
            mediaUrls={optionsSheet.post.media_urls}
          />
        )}

        <CreateStory open={createStoryOpen} onOpenChange={setCreateStoryOpen} />

        {galleryImages && (
          <ImageGalleryViewer
            images={galleryImages}
            initialIndex={galleryIndex}
            onClose={() => setGalleryImages(null)}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
