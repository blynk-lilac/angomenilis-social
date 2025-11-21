import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageSquare, Bookmark, UserPlus, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { parseTextWithLinksAndMentions } from "@/utils/textUtils";
import VerificationBadge from "@/components/VerificationBadge";
import { FeedSkeleton } from "@/components/loading/FeedSkeleton";

interface Post {
  id: string;
  content: string;
  media_urls: string[];
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string;
    verified: boolean;
    badge_type: string | null;
  };
  post_likes: { user_id: string }[];
  comments: { id: string }[];
}

interface HashtagData {
  id: string;
  name: string;
  post_count: number;
  created_at: string;
}

export default function Hashtag() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [hashtag, setHashtag] = useState<HashtagData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrentUser();
    loadHashtagData();
  }, [name]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadHashtagData = async () => {
    if (!name) return;

    try {
      // Buscar dados da hashtag
      const { data: hashtagData } = await supabase
        .from("hashtags")
        .select("*")
        .eq("name", name.toLowerCase())
        .single();

      if (hashtagData) {
        setHashtag(hashtagData);

        // Verificar se está seguindo
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: followData } = await supabase
            .from("hashtag_followers")
            .select("id")
            .eq("hashtag_id", hashtagData.id)
            .eq("user_id", user.id)
            .single();

          setIsFollowing(!!followData);
        }

        // Buscar posts com essa hashtag
        const { data: postHashtags } = await supabase
          .from("post_hashtags")
          .select(`
            post_id,
            posts (
              id,
              content,
              media_urls,
              created_at,
              user_id,
              profiles (
                username,
                avatar_url,
                verified,
                badge_type
              ),
              post_likes (user_id),
              comments:post_comments (id)
            )
          `)
          .eq("hashtag_id", hashtagData.id)
          .order("created_at", { ascending: false });

        if (postHashtags) {
          const postsData = postHashtags
            .map(ph => ph.posts)
            .filter(p => p !== null) as any[];
          setPosts(postsData);
        }
      }
    } catch (error) {
      console.error("Error loading hashtag:", error);
      toast.error("Erro ao carregar hashtag");
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!hashtag || !currentUserId) return;

    try {
      if (isFollowing) {
        await supabase
          .from("hashtag_followers")
          .delete()
          .eq("hashtag_id", hashtag.id)
          .eq("user_id", currentUserId);
        
        setIsFollowing(false);
        toast.success("Deixaste de seguir esta hashtag");
      } else {
        await supabase
          .from("hashtag_followers")
          .insert({
            hashtag_id: hashtag.id,
            user_id: currentUserId,
          });
        
        setIsFollowing(true);
        toast.success("A seguir esta hashtag");
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast.error("Erro ao atualizar seguimento");
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const post = posts.find(p => p.id === postId);
      const hasLiked = post?.post_likes?.some(like => like.user_id === currentUserId);

      if (hasLiked) {
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", currentUserId);
      } else {
        await supabase
          .from("post_likes")
          .insert({ post_id: postId, user_id: currentUserId });
      }

      loadHashtagData();
    } catch (error) {
      toast.error("Erro ao curtir publicação");
    }
  };

  if (loading) {
    return (
      <MainLayout title={`#${name}`}>
        <FeedSkeleton />
      </MainLayout>
    );
  }

  if (!hashtag) {
    return (
      <MainLayout title="Hashtag não encontrada">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Esta hashtag ainda não existe</p>
          <Button onClick={() => navigate("/")}>Voltar ao feed</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={`#${hashtag.name}`}>
      <div className="max-w-2xl mx-auto">
        {/* Header da Hashtag */}
        <div className="bg-card border-b p-6 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">#{hashtag.name}</h1>
              <p className="text-muted-foreground">
                {hashtag.post_count} {hashtag.post_count === 1 ? "publicação" : "publicações"}
              </p>
            </div>
            {currentUserId && (
              <Button
                onClick={handleFollowToggle}
                variant={isFollowing ? "outline" : "default"}
                className="gap-2"
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="h-4 w-4" />
                    A seguir
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Seguir
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Posts */}
        {posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma publicação com esta hashtag ainda
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="bg-card border rounded-lg p-4">
                {/* Header do Post */}
                <div className="flex items-center gap-3 mb-3">
                  <Link to={`/profile/${post.user_id}`}>
                    <Avatar className="h-10 w-10 cursor-pointer">
                      <AvatarImage src={post.profiles.avatar_url} />
                      <AvatarFallback>
                        {post.profiles.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <Link
                        to={`/profile/${post.user_id}`}
                        className="font-semibold hover:underline"
                      >
                        {post.profiles.username}
                      </Link>
                      {post.profiles.verified && (
                        <VerificationBadge
                          verified={post.profiles.verified}
                          badgeType={post.profiles.badge_type}
                          className="w-4 h-4"
                        />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(post.created_at).toLocaleDateString("pt-PT")}
                    </p>
                  </div>
                </div>

                {/* Conteúdo */}
                <div className="mb-3 whitespace-pre-wrap break-words">
                  {parseTextWithLinksAndMentions(post.content)}
                </div>

                {/* Mídia */}
                {post.media_urls && post.media_urls.length > 0 && (
                  <div className={`grid gap-2 mb-3 ${
                    post.media_urls.length === 1 ? "grid-cols-1" :
                    post.media_urls.length === 2 ? "grid-cols-2" :
                    "grid-cols-2"
                  }`}>
                    {post.media_urls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt="Post media"
                        className="w-full rounded-lg object-cover"
                        style={{ maxHeight: post.media_urls.length === 1 ? "500px" : "300px" }}
                      />
                    ))}
                  </div>
                )}

                {/* Ações */}
                <div className="flex items-center gap-4 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(post.id)}
                    className="gap-2"
                  >
                    <Heart
                      className={`h-5 w-5 ${
                        post.post_likes?.some(l => l.user_id === currentUserId)
                          ? "fill-red-500 text-red-500"
                          : ""
                      }`}
                    />
                    {post.post_likes?.length || 0}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/post/${post.id}`)}
                    className="gap-2"
                  >
                    <MessageSquare className="h-5 w-5" />
                    {post.comments?.length || 0}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 ml-auto"
                  >
                    <Bookmark className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
