import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { MessageNotification } from "@/components/MessageNotification";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageSquare, Share2, Globe, MoreHorizontal, Send, Bookmark, Play } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import StoriesBar from "@/components/StoriesBar";
import CreateStory from "@/components/CreateStory";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import VerificationBadge from "@/components/VerificationBadge";
import ReactionPicker, { reactions } from "@/components/ReactionPicker";
import PostMenu from "@/components/PostMenu";
import { FeedSkeleton } from "@/components/loading/FeedSkeleton";
import { parseTextWithLinksAndMentions } from "@/utils/textUtils";
import { SponsoredAd } from "@/components/SponsoredAd";
import { ImageGalleryViewer } from "@/components/ImageGalleryViewer";
import { TranslateButton } from "@/components/TranslateButton";
import { UserSuggestions } from "@/components/UserSuggestions";
import { motion, AnimatePresence } from "framer-motion";

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
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profile) setMyProfile(profile);
      }
      
      await Promise.all([loadPosts(), loadSponsoredAds()]);
      setTimeout(() => setLoading(false), 2000);
    };
    loadData();

    const channel = supabase
      .channel("posts-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => loadPosts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

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

  const VideoPlayer = ({ url }: { url: string }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const togglePlay = () => {
      if (videoRef.current) {
        if (videoRef.current.paused) {
          videoRef.current.play();
          setIsPlaying(true);
        } else {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      }
    };

    return (
      <div className="relative bg-black rounded-lg overflow-hidden" onClick={togglePlay}>
        <video 
          ref={videoRef}
          src={url} 
          className="w-full max-h-[500px] object-contain cursor-pointer"
          playsInline
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-16 w-16 rounded-full bg-black/50 flex items-center justify-center">
              <Play className="h-8 w-8 text-white fill-white ml-1" />
            </div>
          </div>
        )}
        <div className="absolute bottom-2 right-2 flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/70"
            onClick={(e) => {
              e.stopPropagation();
              if (videoRef.current) {
                videoRef.current.muted = !videoRef.current.muted;
              }
            }}
          >
            <span className="text-white text-xs">🔊</span>
          </Button>
        </div>
      </div>
    );
  };

  const renderMediaGrid = (mediaUrls: string[]) => {
    if (!mediaUrls || mediaUrls.length === 0) return null;

    if (mediaUrls.length === 1) {
      const url = mediaUrls[0];
      return (
        <div className="relative">
          {isVideo(url) ? (
            <VideoPlayer url={url} />
          ) : (
            <img 
              src={url} 
              alt="Post" 
              className="w-full max-h-[500px] object-cover rounded-lg cursor-pointer" 
              onClick={() => setGalleryImages(mediaUrls)}
            />
          )}
        </div>
      );
    }

    return (
      <div className={`grid gap-0.5 rounded-lg overflow-hidden ${mediaUrls.length === 2 ? 'grid-cols-2' : mediaUrls.length >= 3 ? 'grid-cols-2' : ''}`}>
        {mediaUrls.slice(0, 4).map((url, idx) => (
          <div 
            key={idx} 
            className={`relative cursor-pointer ${mediaUrls.length === 3 && idx === 0 ? 'row-span-2' : ''} ${idx >= 4 ? 'hidden' : ''}`}
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
            <div className="space-y-4 px-4">
              {posts.map((post, index) => {
                const userReaction = getUserReaction(post);
                const reactionIcon = reactions.find(r => r.type === userReaction);
                const totalReactions = post.post_reactions?.length || 0;

                // Insert sponsored ad every 5 posts
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
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="bg-card border shadow-sm rounded-xl overflow-hidden">
                        {/* Post Header */}
                        <div className="p-4 pb-3">
                          <div className="flex items-center justify-between">
                            <div 
                              className="flex items-center gap-3 cursor-pointer"
                              onClick={() => navigate(`/profile/${post.profiles.id}`)}
                            >
                              <Avatar className="h-11 w-11 ring-2 ring-transparent hover:ring-primary/20 transition-all">
                                <AvatarImage src={post.profiles.avatar_url} />
                                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 font-semibold">
                                  {post.profiles.first_name?.[0] || post.profiles.username?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-[15px] hover:underline">
                                    {post.profiles.full_name || post.profiles.first_name || post.profiles.username}
                                  </span>
                                  {post.profiles.verified && (
                                    <VerificationBadge verified={post.profiles.verified} badgeType={post.profiles.badge_type} className="w-4 h-4" />
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}</span>
                                  <span>•</span>
                                  <Globe className="h-3 w-3" />
                                </div>
                              </div>
                            </div>
                            <PostMenu 
                              postId={post.id} 
                              postUserId={post.user_id} 
                              currentUserId={currentUserId}
                            />
                          </div>
                        </div>

                        {/* Post Content */}
                        {post.content && (
                          <div className="px-4 pb-3">
                            <p className="text-[15px] whitespace-pre-wrap break-words leading-relaxed">
                              {parseTextWithLinksAndMentions(post.content)}
                            </p>
                          </div>
                        )}

                        {/* Media */}
                        {post.media_urls && post.media_urls.length > 0 && (
                          <div className="px-4 pb-3">
                            {renderMediaGrid(post.media_urls)}
                          </div>
                        )}

                        {/* Reactions Count */}
                        {(totalReactions > 0 || post.comments.length > 0) && (
                          <div className="px-4 py-2 flex items-center justify-between text-sm text-muted-foreground border-t border-border/50">
                            <div 
                              className="flex items-center gap-1 cursor-pointer hover:underline"
                              onClick={() => navigate(`/post/${post.id}/likes`)}
                            >
                              {totalReactions > 0 && (
                                <>
                                  <div className="flex -space-x-1">
                                    {post.post_reactions?.slice(0, 3).map((reaction, i) => {
                                      const emoji = reaction.reaction_type === 'heart' ? '❤️' : 
                                                   reaction.reaction_type === 'laughing' ? '😂' : 
                                                   reaction.reaction_type === 'sad' ? '😢' : 
                                                   reaction.reaction_type === 'angry' ? '😡' : 
                                                   reaction.reaction_type === 'thumbs-up' ? '👍' : '❤️';
                                      return <span key={i} className="text-sm">{emoji}</span>;
                                    })}
                                  </div>
                                  <span className="ml-1">{totalReactions}</span>
                                </>
                              )}
                            </div>
                            {post.comments.length > 0 && (
                              <span 
                                className="cursor-pointer hover:underline"
                                onClick={() => navigate(`/comments/${post.id}`)}
                              >
                                {post.comments.length} comentários
                              </span>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="px-2 py-1 border-t border-border/50 flex items-center justify-around relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`flex-1 gap-2 rounded-lg ${userReaction ? 'text-primary' : ''}`}
                            onMouseDown={() => handleLongPress(post.id)}
                            onMouseUp={handlePressEnd}
                            onMouseLeave={handlePressEnd}
                            onTouchStart={() => handleLongPress(post.id)}
                            onTouchEnd={handlePressEnd}
                            onClick={() => !showReactions && handleLike(post.id)}
                          >
                            {reactionIcon ? (
                              <img src={reactionIcon.icon} alt={reactionIcon.type} className="w-5 h-5" />
                            ) : (
                              <Heart className="h-5 w-5" />
                            )}
                            <span className="font-medium text-sm">Gosto</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 gap-2 rounded-lg"
                            onClick={() => navigate(`/comments/${post.id}`)}
                          >
                            <MessageSquare className="h-5 w-5" />
                            <span className="font-medium text-sm">Comentar</span>
                          </Button>

                          <Button variant="ghost" size="sm" className="flex-1 gap-2 rounded-lg">
                            <Send className="h-5 w-5" />
                            <span className="font-medium text-sm">Enviar</span>
                          </Button>
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