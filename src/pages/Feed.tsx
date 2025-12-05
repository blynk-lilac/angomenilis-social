import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { MessageNotification } from "@/components/MessageNotification";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageSquare, Share2, Globe, Users, Radio, ThumbsUp, X } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import StoriesBar from "@/components/StoriesBar";
import CreateStory from "@/components/CreateStory";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import VerificationBadge from "@/components/VerificationBadge";
import { Separator } from "@/components/ui/separator";
import ReactionPicker, { reactions } from "@/components/ReactionPicker";
import PostMenu from "@/components/PostMenu";

import { FeedSkeleton } from "@/components/loading/FeedSkeleton";
import { parseTextWithLinksAndMentions } from "@/utils/textUtils";
import { SponsoredAd } from "@/components/SponsoredAd";
import { ImageGalleryViewer } from "@/components/ImageGalleryViewer";
import { TranslateButton } from "@/components/TranslateButton";
import { UserSuggestions } from "@/components/UserSuggestions";

interface LiveStream {
  id: string;
  title: string;
  user_id: string;
  viewer_count: number;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    verified: boolean;
    badge_type: string | null;
  };
}

interface Post {
  id: string;
  content: string;
  user_id: string;
  image_url?: string;
  video_url?: string;
  media_urls?: string[];
  created_at: string;
  profiles: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    verified?: boolean;
    badge_type?: string | null;
  };
  post_likes: { user_id: string }[];
  post_reactions: { user_id: string; reaction_type: string }[];
  comments: { id: string }[];
}

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [createStoryOpen, setCreateStoryOpen] = useState(false);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sponsoredAds, setSponsoredAds] = useState<any[]>([]);
  const [adLikes, setAdLikes] = useState<Record<string, { count: number; isLiked: boolean }>>({});
  const [galleryImages, setGalleryImages] = useState<string[] | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [translatedPosts, setTranslatedPosts] = useState<Record<string, string>>({});
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    const loadData = async () => {
      await loadUser();
      await Promise.all([loadPosts(), loadLiveStreams(), loadSponsoredAds()]);
      
      // Garantir no mínimo 3 segundos de loading
      setTimeout(() => {
        setLoading(false);
      }, 3000);
    };
    loadData();

    const postsChannel = supabase
      .channel("posts-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
        },
        () => {
          loadPosts();
        }
      )
      .subscribe();

    const streamsChannel = supabase
      .channel("streams-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_streams",
        },
        () => {
          loadLiveStreams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(streamsChannel);
    };
  }, []);

  const loadPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select(`
        *,
        profiles (
          id,
          username,
          full_name,
          avatar_url,
          verified,
          badge_type
        ),
        post_likes (
          user_id
        ),
        post_reactions (
          user_id,
          reaction_type
        ),
        comments (
          id
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar posts");
      return;
    }

    setPosts(data || []);
  };

  const loadLiveStreams = async () => {
    const { data, error } = await supabase
      .from("live_streams")
      .select(`
        *,
        profiles (
          id,
          username,
          full_name,
          avatar_url,
          verified,
          badge_type
        )
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Erro ao carregar streams:", error);
      return;
    }

    setLiveStreams(data || []);
  };

  const loadSponsoredAds = async () => {
    const { data: ads, error } = await supabase
      .from("sponsored_ads")
      .select("*")
      .eq("is_active", true);

    if (error) {
      console.error("Erro ao carregar anúncios:", error);
      return;
    }

    setSponsoredAds(ads || []);

    // Buscar curtidas dos anúncios
    if (ads && ads.length > 0 && currentUserId) {
      const adIds = ads.map(ad => ad.id);
      const { data: likesData } = await supabase
        .from("ad_likes")
        .select("ad_id, user_id");

      const likesMap: Record<string, { count: number; isLiked: boolean }> = {};
      ads.forEach(ad => {
        const adLikesCount = likesData?.filter(l => l.ad_id === ad.id).length || 0;
        const userLiked = likesData?.some(l => l.ad_id === ad.id && l.user_id === currentUserId) || false;
        likesMap[ad.id] = { count: adLikesCount, isLiked: userLiked };
      });
      setAdLikes(likesMap);
    }
  };

  const handleLike = async (postId: string, reaction?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user already has a reaction
      const { data: existingReaction } = await supabase
        .from("post_reactions")
        .select("*")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .single();

      if (existingReaction) {
        if (reaction && existingReaction.reaction_type !== reaction) {
          // Update to new reaction
          await supabase
            .from("post_reactions")
            .update({ reaction_type: reaction })
            .eq("id", existingReaction.id);
        } else if (!reaction) {
          // Remove reaction (simple click without long press)
          await supabase
            .from("post_reactions")
            .delete()
            .eq("id", existingReaction.id);
        }
      } else if (reaction) {
        // Add new reaction
        await supabase.from("post_reactions").insert({
          post_id: postId,
          user_id: user.id,
          reaction_type: reaction,
        });
      } else {
        // Add default "heart" reaction if no reaction selected
        await supabase.from("post_reactions").insert({
          post_id: postId,
          user_id: user.id,
          reaction_type: "heart",
        });
      }

      // Reload posts
      loadPosts();
    } catch (error) {
      console.error("Erro ao reagir:", error);
    }
  };

  const handleLongPress = (postId: string) => {
    longPressTimer.current = setTimeout(() => {
      setShowReactions(postId);
    }, 500);
  };

  const handlePressStart = (postId: string) => {
    handleLongPress(postId);
  };

  const handlePressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleRepost = async (postId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const post = posts.find(p => p.id === postId);
      if (!post) return;

      await supabase.from("posts").insert({
        content: post.content,
        user_id: user.id,
        media_urls: post.media_urls,
      });

      toast.success("Post compartilhado!");
      loadPosts();
    } catch (error) {
      console.error("Erro ao compartilhar:", error);
      toast.error("Erro ao compartilhar");
    }
  };

  const renderMediaGrid = (mediaUrls: string[]) => {
    if (!mediaUrls || mediaUrls.length === 0) return null;

    const isVideo = (url: string) => {
      return url.includes(".mp4") || url.includes(".webm") || url.includes(".mov");
    };

    const handleImageClick = (index: number) => {
      setGalleryImages(mediaUrls);
      setGalleryIndex(index);
    };

    if (mediaUrls.length === 1) {
      const url = mediaUrls[0];
      return (
        <div 
          className="w-full cursor-pointer" 
          onClick={() => !isVideo(url) && handleImageClick(0)}
        >
          {isVideo(url) ? (
            <video 
              src={url} 
              controls 
              className="w-full max-h-[600px] object-contain bg-black"
            />
          ) : (
            <img 
              src={url} 
              alt="Post" 
              className="w-full max-h-[600px] object-contain bg-muted" 
            />
          )}
        </div>
      );
    }

    if (mediaUrls.length === 2) {
      return (
        <div className="grid grid-cols-2 gap-0.5">
          {mediaUrls.map((url, idx) => (
            <div 
              key={idx} 
              className="aspect-square overflow-hidden cursor-pointer"
              onClick={() => handleImageClick(idx)}
            >
              {isVideo(url) ? (
                <video src={url} className="w-full h-full object-cover" />
              ) : (
                <img src={url} alt="Post" className="w-full h-full object-cover" />
              )}
            </div>
          ))}
        </div>
      );
    }

    if (mediaUrls.length === 3) {
      return (
        <div className="grid grid-cols-2 gap-0.5">
          <div 
            className="row-span-2 cursor-pointer"
            onClick={() => handleImageClick(0)}
          >
            {isVideo(mediaUrls[0]) ? (
              <video src={mediaUrls[0]} className="w-full h-full object-cover" />
            ) : (
              <img src={mediaUrls[0]} alt="Post" className="w-full h-full object-cover" />
            )}
          </div>
          {mediaUrls.slice(1).map((url, idx) => (
            <div 
              key={idx} 
              className="aspect-square overflow-hidden cursor-pointer"
              onClick={() => handleImageClick(idx + 1)}
            >
              {isVideo(url) ? (
                <video src={url} className="w-full h-full object-cover" />
              ) : (
                <img src={url} alt="Post" className="w-full h-full object-cover" />
              )}
            </div>
          ))}
        </div>
      );
    }

    if (mediaUrls.length === 4) {
      return (
        <div className="grid grid-cols-2 gap-0.5">
          {mediaUrls.map((url, idx) => (
            <div 
              key={idx} 
              className="aspect-square overflow-hidden cursor-pointer"
              onClick={() => handleImageClick(idx)}
            >
              {isVideo(url) ? (
                <video src={url} className="w-full h-full object-cover" />
              ) : (
                <img src={url} alt="Post" className="w-full h-full object-cover" />
              )}
            </div>
          ))}
        </div>
      );
    }

    if (mediaUrls.length >= 5) {
      return (
        <div className="grid grid-cols-2 gap-0.5">
          <div 
            className="col-span-2 aspect-video cursor-pointer"
            onClick={() => handleImageClick(0)}
          >
            {isVideo(mediaUrls[0]) ? (
              <video src={mediaUrls[0]} className="w-full h-full object-cover" />
            ) : (
              <img src={mediaUrls[0]} alt="Post" className="w-full h-full object-cover" />
            )}
          </div>
          {mediaUrls.slice(1, 5).map((url, idx) => {
            const actualIdx = idx + 1;
            const isLast = actualIdx === 4 && mediaUrls.length > 5;
            return (
              <div 
                key={idx} 
                className="aspect-square overflow-hidden relative cursor-pointer"
                onClick={() => handleImageClick(actualIdx)}
              >
                {isVideo(url) ? (
                  <video src={url} className="w-full h-full object-cover" />
                ) : (
                  <img src={url} alt="Post" className="w-full h-full object-cover" />
                )}
                {isLast && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                    <span className="text-white text-3xl font-bold">+{mediaUrls.length - 5}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }
  };

  return (
    <ProtectedRoute>
      <MessageNotification />
      <div className="min-h-screen bg-background flex flex-col">
        <TopBar />

        <div className="flex-1 overflow-y-auto pb-20">
          <div className="container mx-auto max-w-2xl px-0 sm:px-4 py-4 pt-20">
            {/* Stories Bar */}
            <div className="px-4 sm:px-0">
              <StoriesBar onCreateStory={() => setCreateStoryOpen(true)} />
            </div>

            {/* What's on your mind? Input */}
            <div className="px-4 sm:px-0 mt-4">
              <Card className="bg-card border-0 sm:border sm:border-border rounded-none sm:rounded-xl overflow-hidden shadow-none sm:shadow-sm">
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        U
                      </AvatarFallback>
                    </Avatar>
                    <button
                      onClick={() => navigate("/create")}
                      className="flex-1 h-10 px-4 bg-muted/40 hover:bg-muted/60 rounded-full text-left text-muted-foreground transition-colors cursor-pointer"
                    >
                      Em que estás a pensar?
                    </button>
                </div>
              </div>
            </Card>
          </div>

          {/* User Suggestions */}
          <div className="px-4 sm:px-0 mt-4">
            <UserSuggestions />
          </div>

          {/* Live Streams Section */}
          {liveStreams.length > 0 && (
            <div className="px-4 sm:px-0 mt-4">
              <Card className="bg-card border-0 sm:border sm:border-border rounded-none sm:rounded-xl overflow-hidden shadow-none sm:shadow-sm">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Radio className="w-5 h-5 text-red-600" />
                      <h2 className="font-semibold text-foreground">Ao Vivo Agora</h2>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/live")}
                      className="text-primary hover:text-primary"
                    >
                      Ver todos
                    </Button>
                  </div>

                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {liveStreams.map((stream) => (
                      <div
                        key={stream.id}
                        onClick={() => navigate(`/live-watch/${stream.id}`)}
                        className="flex-shrink-0 w-40 cursor-pointer group"
                      >
                        <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-gradient-to-br from-red-500 to-pink-600 mb-2">
                          <Avatar className="w-full h-full">
                            <AvatarImage src={stream.profiles.avatar_url} className="object-cover" />
                            <AvatarFallback className="text-4xl text-white">
                              {stream.profiles.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          
                          <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600 px-2 py-0.5 rounded text-xs text-white font-semibold">
                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            AO VIVO
                          </div>

                          <div className="absolute bottom-2 left-2 right-2">
                            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-white text-xs">
                              <Users className="w-3 h-3" />
                              <span>{stream.viewer_count}</span>
                            </div>
                          </div>
                        </div>

                        <div className="px-1">
                          <p className="text-sm font-medium line-clamp-1 text-foreground group-hover:text-primary">
                            {stream.profiles.full_name || stream.profiles.username}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {stream.title}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Feed - Design Facebook */}
          <div className="space-y-4 mt-4">
            {loading ? (
              <FeedSkeleton />
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <p className="text-muted-foreground text-center">
                  Nenhuma publicação ainda
                </p>
              </div>
            ) : (
              <>
                {posts.map((post, index) => (
                  <div key={`post-${post.id}`}>
                     <Card className="bg-card border-0 sm:border sm:border-border/30 rounded-none sm:rounded-xl overflow-hidden shadow-none sm:shadow-sm">
                       {/* Header do Post */}
                       <div className="p-3 sm:p-4">
                         <div className="flex items-center gap-3">
                           <Avatar 
                             className="h-10 w-10 cursor-pointer border-2 border-border"
                             onClick={() => navigate(`/profile/${post.profiles?.username}`)}
                           >
                             <AvatarImage src={post.profiles?.avatar_url} />
                             <AvatarFallback className="bg-muted text-foreground font-semibold">
                               {post.profiles?.username?.[0]?.toUpperCase()}
                             </AvatarFallback>
                           </Avatar>

                           <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-1">
                               <span 
                                 className="font-semibold text-[15px] text-foreground cursor-pointer hover:underline"
                                 onClick={() => navigate(`/profile/${post.profiles?.username}`)}
                               >
                                 {post.profiles?.full_name || post.profiles?.username}
                               </span>
                               {post.profiles?.verified && (
                                 <VerificationBadge 
                                   verified={post.profiles?.verified}
                                   badgeType={post.profiles?.badge_type} 
                                   className="w-[18px] h-[18px] flex-shrink-0" 
                                 />
                               )}
                             </div>
                             <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
                               <span>
                                 {formatDistanceToNow(new Date(post.created_at), {
                                   addSuffix: true,
                                   locale: ptBR,
                                 })}
                               </span>
                               <span>•</span>
                               <Globe className="h-3 w-3" />
                             </div>
                           </div>

                           <div className="flex items-center gap-1">
                             <PostMenu
                               postId={post.id}
                               postUserId={post.user_id}
                               currentUserId={currentUserId}
                               onUpdate={loadPosts}
                             />
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               className="h-8 w-8 p-0 hover:bg-muted rounded-full text-muted-foreground"
                             >
                               <X className="h-5 w-5" />
                             </Button>
                           </div>
                         </div>

                         {/* Conteúdo do Post */}
                         {post.content && (
                           <div className="space-y-2">
                             <div className="mt-3 text-[15px] text-foreground leading-relaxed whitespace-pre-wrap break-words">
                               {parseTextWithLinksAndMentions(translatedPosts[post.id] || post.content)}
                             </div>
                             <TranslateButton
                               text={post.content}
                               onTranslated={(translated) => {
                                 setTranslatedPosts(prev => ({ ...prev, [post.id]: translated }));
                               }}
                             />
                           </div>
                         )}
                       </div>

                       {/* Mídia */}
                       {post.media_urls && post.media_urls.length > 0 && (
                         <div className="w-full">
                           {renderMediaGrid(post.media_urls)}
                         </div>
                       )}

                       {/* Stats */}
                       <div className="px-3 sm:px-4 py-2">
                         <div className="flex items-center justify-between text-[15px]">
                           <div className="flex items-center gap-1">
                             {post.post_reactions && post.post_reactions.length > 0 && (
                               <>
                                 <div className="flex -space-x-1">
                                   {Array.from(new Set(post.post_reactions.map(r => r.reaction_type)))
                                     .slice(0, 3)
                                     .map((type, idx) => {
                                       const reaction = reactions.find(r => r.type === type);
                                       return reaction ? (
                                         <div 
                                           key={idx}
                                           className="w-[18px] h-[18px] rounded-full bg-background flex items-center justify-center border border-card shadow-sm"
                                         >
                                           <img src={reaction.icon} alt={reaction.type} className="w-full h-full object-contain" />
                                         </div>
                                       ) : null;
                                     })}
                                 </div>
                                 <span className="ml-1 text-muted-foreground hover:underline cursor-pointer">
                                   {post.post_reactions.length > 999 
                                     ? `${(post.post_reactions.length / 1000).toFixed(1)} m`
                                     : post.post_reactions.length
                                   }
                                 </span>
                               </>
                             )}
                           </div>
                           <div className="flex items-center gap-3 text-muted-foreground">
                             {post.comments && post.comments.length > 0 && (
                               <span className="hover:underline cursor-pointer">
                                 {post.comments.length > 999 
                                   ? `${(post.comments.length / 1000).toFixed(1)} m`
                                   : post.comments.length
                                 } {post.comments.length === 1 ? 'comentário' : 'comentários'}
                               </span>
                             )}
                           </div>
                         </div>
                       </div>

                       <Separator className="bg-border/50" />

                       {/* Actions */}
                       <div className="px-1 py-1 flex items-center justify-around">
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           className={`flex-1 justify-center gap-2 hover:bg-muted/50 rounded-md h-10 font-semibold ${
                             post.post_reactions?.some(r => r.user_id === currentUserId) ? "text-primary" : "text-muted-foreground"
                           }`}
                           onClick={() => handleLike(post.id)}
                           onTouchStart={() => handlePressStart(post.id)}
                           onTouchEnd={handlePressEnd}
                           onMouseDown={() => handlePressStart(post.id)}
                           onMouseUp={handlePressEnd}
                           onMouseLeave={handlePressEnd}
                         >
                           <ThumbsUp className={`h-[18px] w-[18px] ${
                             post.post_reactions?.some(r => r.user_id === currentUserId) ? "fill-current" : ""
                           }`} />
                           <span className="text-[15px]">Curtir</span>
                         </Button>
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           className="flex-1 justify-center gap-2 hover:bg-muted/50 rounded-md h-10 font-semibold text-muted-foreground"
                           onClick={() => navigate(`/comments/${post.id}`)}
                         >
                           <MessageSquare className="h-[18px] w-[18px]" />
                           <span className="text-[15px]">Comentar</span>
                         </Button>
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           className="flex-1 justify-center gap-2 hover:bg-muted/50 rounded-md h-10 font-semibold text-muted-foreground"
                           onClick={() => handleRepost(post.id)}
                         >
                           <Share2 className="h-[18px] w-[18px]" />
                           <span className="text-[15px]">Partilhar</span>
                         </Button>
                       </div>
                    </Card>
                    
                    {/* Reaction Picker Modal */}
                    {showReactions === post.id && (
                      <ReactionPicker
                        show={true}
                        onSelect={(reaction) => {
                          handleLike(post.id, reaction);
                          setShowReactions(null);
                        }}
                        onClose={() => setShowReactions(null)}
                      />
                    )}

                    {/* Inserir anúncio após o terceiro post */}
                    {index === 2 && sponsoredAds.length > 0 && sponsoredAds.map(ad => (
                      <SponsoredAd
                        key={ad.id}
                        ad={ad}
                        likesCount={adLikes[ad.id]?.count || 0}
                        isLiked={adLikes[ad.id]?.isLiked || false}
                        userId={currentUserId}
                      />
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>
          </div>
        </div>

        {/* Create Story Dialog */}
        <CreateStory open={createStoryOpen} onOpenChange={setCreateStoryOpen} />
        
        {/* Image Gallery Viewer */}
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
