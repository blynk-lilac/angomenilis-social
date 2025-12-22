import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { MessageNotification } from "@/components/MessageNotification";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Send, Bookmark, Play, Volume2, VolumeX, MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import StoriesBar from "@/components/StoriesBar";
import CreateStory from "@/components/CreateStory";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import VerificationBadge from "@/components/VerificationBadge";
import ReactionPicker, { reactions } from "@/components/ReactionPicker";
import { FeedSkeleton } from "@/components/loading/FeedSkeleton";
import { parseTextWithLinksAndMentions } from "@/utils/textUtils";
import { SponsoredAd } from "@/components/SponsoredAd";
import { ImageGalleryViewer } from "@/components/ImageGalleryViewer";
import { UserSuggestions } from "@/components/UserSuggestions";
import { motion, AnimatePresence } from "framer-motion";
import PostOptionsSheet from "@/components/PostOptionsSheet";

interface Post {
  id: string;
  content: string;
  user_id: string;
  media_urls?: string[];
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [createStoryOpen, setCreateStoryOpen] = useState(false);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sponsoredAds, setSponsoredAds] = useState<any[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[] | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [savedPosts, setSavedPosts] = useState<string[]>([]);
  const [optionsSheet, setOptionsSheet] = useState<{ open: boolean; post: Post | null }>({ open: false, post: null });
  const [mutedVideos, setMutedVideos] = useState<{ [key: string]: boolean }>({});
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedVideosRef = useRef<Set<HTMLVideoElement>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profile) setMyProfile(profile);
        
        // Load saved posts
        const { data: saved } = await supabase.from('saved_posts').select('post_id').eq('user_id', user.id);
        if (saved) setSavedPosts(saved.map(s => s.post_id));
      }
      
      await Promise.all([loadPosts(), loadSponsoredAds()]);
      setTimeout(() => setLoading(false), 1500);
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
            // Pause all other videos
            observedVideosRef.current.forEach((v) => {
              if (v !== video && !v.paused) v.pause();
            });

            video.play().catch((err) => {
              // Autoplay can be blocked depending on device/audio state
              console.log('[Feed] autoplay blocked:', err);
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
      .limit(50);

    if (data) setPosts(data);
  };

  const loadSponsoredAds = async () => {
    const { data } = await supabase.from("sponsored_ads").select("*").eq("is_active", true);
    if (data) setSponsoredAds(data);
  };

  const handleLike = async (postId: string, reaction?: string) => {
    if (!currentUserId) return;

    const { data: existingReaction } = await supabase
      .from("post_reactions")
      .select("*")
      .eq("post_id", postId)
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (existingReaction) {
      if (reaction && existingReaction.reaction_type !== reaction) {
        await supabase.from("post_reactions").update({ reaction_type: reaction }).eq("id", existingReaction.id);
      } else {
        await supabase.from("post_reactions").delete().eq("id", existingReaction.id);
      }
    } else {
      await supabase.from("post_reactions").insert({ post_id: postId, user_id: currentUserId, reaction_type: reaction || "heart" });
    }

    loadPosts();
    setShowReactions(null);
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

  const handleLongPress = (postId: string) => {
    longPressTimer.current = setTimeout(() => setShowReactions(postId), 500);
  };

  const handlePressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
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
    const isMuted = mutedVideos[postId] !== false;

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
          if (video.paused) video.play();
          else video.pause();
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
            {/* Stories Bar */}
            <div className="px-4 py-3">
              <StoriesBar onCreateStory={() => setCreateStoryOpen(true)} />
            </div>

            {/* Create Post Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-4 mb-4"
            >
              <Card className="bg-card border shadow-sm rounded-xl overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 ring-2 ring-primary/10">
                      <AvatarImage src={myProfile?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 font-semibold">
                        {myProfile?.first_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      onClick={() => navigate("/create")}
                      className="flex-1 h-11 px-4 bg-muted/50 hover:bg-muted/70 rounded-full text-left text-muted-foreground transition-colors"
                    >
                      Em que estás a pensar?
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* User Suggestions */}
            <div className="px-4 mb-4">
              <UserSuggestions />
            </div>

            {/* Posts Feed */}
            <div className="space-y-0">
              {posts.map((post, index) => {
                const userReaction = getUserReaction(post);
                const reactionIcon = reactions.find(r => r.type === userReaction);
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
                      transition={{ delay: index * 0.03 }}
                    >
                      <Card className="bg-card border-0 border-b border-border/30 rounded-none overflow-hidden">
                        {/* Post Header - Instagram Style */}
                        <div className="flex items-center justify-between px-4 py-3">
                          <div 
                            className="flex items-center gap-3 cursor-pointer"
                            onClick={() => navigate(`/profile/${post.profiles.id}`)}
                          >
                            <Avatar className="h-9 w-9 ring-2 ring-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 ring-offset-2 ring-offset-background">
                              <AvatarImage src={post.profiles.avatar_url} />
                              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 font-semibold text-sm">
                                {post.profiles.first_name?.[0] || post.profiles.username?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-1">
                                <span className="font-semibold text-sm">
                                  {post.profiles.username}
                                </span>
                                {post.profiles.verified && (
                                  <VerificationBadge verified={post.profiles.verified} badgeType={post.profiles.badge_type} className="w-3.5 h-3.5" />
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(post.created_at), { addSuffix: false, locale: ptBR })}
                              </span>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => setOptionsSheet({ open: true, post })}
                          >
                            <MoreHorizontal className="h-5 w-5" />
                          </Button>
                        </div>

                        {/* Media */}
                        {post.media_urls && post.media_urls.length > 0 && (
                          <div className="relative">
                            {renderMediaGrid(post.media_urls, post.id)}
                          </div>
                        )}

                        {/* Actions - Instagram Style */}
                        <div className="px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <button
                                className="hover:opacity-60 transition-opacity"
                                onMouseDown={() => handleLongPress(post.id)}
                                onMouseUp={handlePressEnd}
                                onMouseLeave={handlePressEnd}
                                onTouchStart={() => handleLongPress(post.id)}
                                onTouchEnd={handlePressEnd}
                                onClick={() => !showReactions && handleLike(post.id)}
                              >
                                {reactionIcon ? (
                                  <img src={reactionIcon.icon} alt={reactionIcon.type} className="w-7 h-7" />
                                ) : (
                                  <Heart className={`h-7 w-7 ${userReaction ? 'fill-red-500 text-red-500' : ''}`} />
                                )}
                              </button>

                              <button
                                className="hover:opacity-60 transition-opacity"
                                onClick={() => navigate(`/comments/${post.id}`)}
                              >
                                <MessageCircle className="h-7 w-7" />
                              </button>

                              <button 
                                className="hover:opacity-60 transition-opacity"
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
                                <Send className="h-6 w-6" />
                              </button>
                            </div>

                            <button 
                              className="hover:opacity-60 transition-opacity"
                              onClick={() => handleSave(post.id)}
                            >
                              <Bookmark className={`h-7 w-7 ${isSaved ? 'fill-current' : ''}`} />
                            </button>
                          </div>

                          {/* Likes Count */}
                          {totalReactions > 0 && (
                            <button 
                              className="mt-2 font-semibold text-sm"
                              onClick={() => navigate(`/post/${post.id}/likes`)}
                            >
                              {totalReactions} gosto{totalReactions !== 1 ? 's' : ''}
                            </button>
                          )}

                          {/* Caption */}
                          {post.content && (
                            <div className="mt-1">
                              <span className="text-sm">
                                <span className="font-semibold mr-1">{post.profiles.username}</span>
                                {parseTextWithLinksAndMentions(post.content)}
                              </span>
                            </div>
                          )}

                          {/* Comments Link */}
                          {post.comments.length > 0 && (
                            <button 
                              className="mt-1 text-sm text-muted-foreground"
                              onClick={() => navigate(`/comments/${post.id}`)}
                            >
                              Ver {post.comments.length > 1 ? `todos os ${post.comments.length} comentários` : '1 comentário'}
                            </button>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Reaction Picker Modal */}
        <ReactionPicker
          show={showReactions !== null}
          onSelect={(reaction) => {
            if (showReactions) {
              handleLike(showReactions, reaction);
            }
          }}
          onClose={() => setShowReactions(null)}
        />

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
