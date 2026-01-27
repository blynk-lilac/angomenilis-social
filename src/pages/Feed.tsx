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

            {/* Create Post Card - Modern Instagram Style */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-3 mb-4"
            >
              <div className="bg-card border border-border/60 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow duration-300">
                <div className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-12 w-12 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                        <AvatarImage src={myProfile?.avatar_url} className="object-cover" />
                        <AvatarFallback className="bg-gradient-to-br from-primary/30 to-accent/30 font-bold text-lg">
                          {myProfile?.first_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-green-500 rounded-full border-2 border-card" />
                    </div>
                    <button
                      onClick={() => navigate("/create")}
                      className="flex-1 h-12 px-5 bg-muted/40 hover:bg-muted/60 rounded-full text-left text-muted-foreground transition-all duration-200 font-medium"
                    >
                      Em que estás a pensar?
                    </button>
                  </div>
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
                      {/* Enhanced Post Card */}
                      <div className="bg-card border-b border-border/40 py-4 hover:bg-muted/5 transition-colors duration-200">
                        {/* Header */}
                        <div className="flex items-start gap-3 px-4">
                          <Avatar 
                            className="h-11 w-11 cursor-pointer ring-2 ring-border/50 hover:ring-primary/40 transition-all duration-200"
                            onClick={() => navigate(`/profile/${post.profiles.id}`)}
                          >
                            <AvatarImage src={post.profiles.avatar_url} className="object-cover" />
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-bold">
                              {post.profiles.first_name?.[0] || post.profiles.username?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div 
                                className="flex items-center gap-1.5 cursor-pointer group"
                                onClick={() => navigate(`/profile/${post.profiles.id}`)}
                              >
                                <span className="font-bold text-[15px] group-hover:text-primary transition-colors">
                                  {post.profiles.username || post.profiles.first_name}
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
                                <span className="text-muted-foreground/80 text-sm font-normal">
                                  · {formatDistanceToNow(new Date(post.created_at), { addSuffix: false, locale: ptBR })}
                                </span>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-full -mr-2 hover:bg-muted/60"
                                onClick={() => setOptionsSheet({ open: true, post })}
                              >
                                <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                              </Button>
                            </div>

                            {/* Content */}
                            {post.content && (
                              <p className="text-[15px] whitespace-pre-wrap break-words leading-[1.6] mt-2 text-foreground/90">
                                {parseTextWithLinksAndMentions(post.content)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Media - Enhanced */}
                        {post.media_urls && post.media_urls.length > 0 && (
                          <div className="relative mt-4 mx-3 rounded-2xl overflow-hidden shadow-sm border border-border/30">
                            {renderMediaGrid(post.media_urls, post.id)}
                            
                            {/* Music overlay on media */}
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
                          <div className="px-4 mt-3">
                            <MusicPlayer 
                              musicName={post.music_name}
                              musicArtist={post.music_artist}
                              musicUrl={post.music_url}
                            />
                          </div>
                        )}

                        {/* Actions - Enhanced Instagram Style */}
                        <div className="flex items-center gap-0.5 px-3 mt-4 ml-14">
                          <motion.button
                            whileTap={{ scale: 0.85 }}
                            className="flex items-center gap-2 py-2.5 px-4 rounded-xl hover:bg-muted/60 transition-all duration-200"
                            onClick={() => handleLike(post.id)}
                          >
                            <Heart 
                              className={`h-[22px] w-[22px] transition-all duration-200 ${userReaction ? 'text-red-500 fill-red-500 scale-110' : 'text-muted-foreground'}`} 
                            />
                            {totalReactions > 0 && (
                              <span className={`text-sm font-semibold ${userReaction ? 'text-red-500' : 'text-muted-foreground'}`}>
                                {totalReactions}
                              </span>
                            )}
                          </motion.button>

                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            className="flex items-center gap-2 py-2.5 px-4 rounded-xl text-muted-foreground hover:bg-muted/60 transition-all duration-200"
                            onClick={() => navigate(`/comments/${post.id}`)}
                          >
                            <MessageCircle className="h-[22px] w-[22px]" />
                            {post.comments.length > 0 && (
                              <span className="text-sm font-semibold">{post.comments.length}</span>
                            )}
                          </motion.button>

                          <motion.button 
                            whileTap={{ scale: 0.9 }}
                            className="flex items-center gap-2 py-2.5 px-4 rounded-xl text-muted-foreground hover:bg-muted/60 transition-all duration-200"
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
                            <Share2 className="h-[22px] w-[22px]" />
                          </motion.button>

                          <div className="flex-1" />

                          <motion.button 
                            whileTap={{ scale: 0.9 }}
                            className={`p-2.5 rounded-xl transition-all duration-200 ${isSaved ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-muted/60'}`}
                            onClick={() => handleSave(post.id)}
                          >
                            <Bookmark className={`h-[22px] w-[22px] ${isSaved ? 'fill-current' : ''}`} />
                          </motion.button>
                        </div>

                        {/* Likes count */}
                        {totalReactions > 0 && (
                          <button 
                            className="px-4 mt-2 ml-12 text-sm text-muted-foreground hover:underline"
                            onClick={() => navigate(`/post/${post.id}/likes`)}
                          >
                            {totalReactions} gosto{totalReactions !== 1 ? 's' : ''}
                          </button>
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
