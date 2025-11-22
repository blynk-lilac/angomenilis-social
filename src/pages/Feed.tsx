import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { MessageNotification } from "@/components/MessageNotification";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageSquare, Share2, Globe, Users, Radio } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { MainNav } from "@/components/MainNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import StoriesBar from "@/components/StoriesBar";
import CreateStory from "@/components/CreateStory";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import VerificationBadge from "@/components/VerificationBadge";
import { Separator } from "@/components/ui/separator";
import ReactionPicker, { reactions } from "@/components/ReactionPicker";
import PostMenu from "@/components/PostMenu";
import { BottomNav } from "@/components/layout/BottomNav";
import { FeedSkeleton } from "@/components/loading/FeedSkeleton";
import { parseTextWithLinksAndMentions } from "@/utils/textUtils";
import { SponsoredAd } from "@/components/SponsoredAd";

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
      setLoading(false);
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

      loadPosts();
      setShowReactions(null);
    } catch (error: any) {
      toast.error("Erro ao reagir ao post");
    }
  };

  const handleLongPress = (postId: string) => {
    setShowReactions(postId);
  };

  const handlePressStart = (postId: string) => {
    longPressTimer.current = setTimeout(() => {
      handleLongPress(postId);
    }, 500);
  };

  const handlePressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };


  const handleRepost = async (postId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const post = posts.find(p => p.id === postId);
      if (!post) return;

      const { error } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          content: post.content,
          media_urls: post.media_urls,
          image_url: post.image_url,
          video_url: post.video_url,
        });

      if (error) throw error;

      toast.success("Publicação compartilhada!");
      loadPosts();
    } catch (error: any) {
      toast.error("Erro ao compartilhar");
    }
  };

  const renderMediaGrid = (mediaUrls: string[]) => {
    const count = mediaUrls.length;

    if (count === 1) {
      const isVideo = mediaUrls[0].includes('.mp4') || mediaUrls[0].includes('.webm') || mediaUrls[0].includes('.mov');
      return (
        <div className="w-full bg-black/5">
          {isVideo ? (
            <video src={mediaUrls[0]} controls className="w-full max-h-[600px] object-contain" />
          ) : (
            <img src={mediaUrls[0]} alt="Post" className="w-full max-h-[600px] object-cover" />
          )}
        </div>
      );
    }

    if (count === 2) {
      return (
        <div className="grid grid-cols-2 gap-0.5 bg-black/5">
          {mediaUrls.map((url, idx) => {
            const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('.mov');
            return isVideo ? (
              <video key={idx} src={url} controls className="w-full h-[300px] object-cover" />
            ) : (
              <img key={idx} src={url} alt="Post" className="w-full h-[300px] object-cover" />
            );
          })}
        </div>
      );
    }

    if (count === 3) {
      // Layout: 1 grande à esquerda, 2 pequenas à direita
      return (
        <div className="grid grid-cols-2 gap-0.5 bg-black/5 h-[400px]">
          <div className="row-span-2">
            {mediaUrls[0].includes('.mp4') || mediaUrls[0].includes('.webm') || mediaUrls[0].includes('.mov') ? (
              <video src={mediaUrls[0]} controls className="w-full h-full object-cover" />
            ) : (
              <img src={mediaUrls[0]} alt="Post" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="space-y-0.5">
            {mediaUrls.slice(1).map((url, idx) => {
              const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('.mov');
              return isVideo ? (
                <video key={idx} src={url} controls className="w-full h-[199px] object-cover" />
              ) : (
                <img key={idx} src={url} alt="Post" className="w-full h-[199px] object-cover" />
              );
            })}
          </div>
        </div>
      );
    }

    if (count === 4) {
      return (
        <div className="grid grid-cols-2 gap-0.5 bg-black/5">
          {mediaUrls.map((url, idx) => {
            const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('.mov');
            return isVideo ? (
              <video key={idx} src={url} controls className="w-full h-[250px] object-cover" />
            ) : (
              <img key={idx} src={url} alt="Post" className="w-full h-[250px] object-cover" />
            );
          })}
        </div>
      );
    }

    if (count >= 5) {
      // Layout: 2 em cima, 3 embaixo (ou +3 embaixo com indicador)
      return (
        <div className="bg-black/5">
          <div className="grid grid-cols-2 gap-0.5 mb-0.5">
            {mediaUrls.slice(0, 2).map((url, idx) => {
              const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('.mov');
              return isVideo ? (
                <video key={idx} src={url} controls className="w-full h-[200px] object-cover" />
              ) : (
                <img key={idx} src={url} alt="Post" className="w-full h-[200px] object-cover" />
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-0.5">
            {mediaUrls.slice(2, 5).map((url, idx) => {
              const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('.mov');
              const isLast = idx === 2 && count > 5;
              return (
                <div key={idx} className="relative">
                  {isVideo ? (
                    <video src={url} controls className="w-full h-[150px] object-cover" />
                  ) : (
                    <img src={url} alt="Post" className="w-full h-[150px] object-cover" />
                  )}
                  {isLast && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">+{count - 5}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  };

  return (
    <ProtectedRoute>
      <MessageNotification />
      <div className="min-h-screen bg-background pb-20">
        <TopBar />
        <MainNav />

        <div className="container mx-auto max-w-2xl px-0 sm:px-4 py-4 pt-20">
          {/* Stories Bar */}
          <div className="px-4 sm:px-0">
            <StoriesBar onCreateStory={() => setCreateStoryOpen(true)} />
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

          {/* Feed - Design Moderno e Limpo */}
          <div className="space-y-3 mt-4">
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
                    <Card className="bg-card border-0 sm:border sm:border-border/50 rounded-none sm:rounded-2xl overflow-hidden shadow-none sm:shadow-sm hover:sm:shadow-lg hover:sm:border-border transition-all duration-200">
...
                    </Card>

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

        {/* Create Story Dialog */}
        <CreateStory open={createStoryOpen} onOpenChange={setCreateStoryOpen} />
        
        {/* Bottom Navigation */}
        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}