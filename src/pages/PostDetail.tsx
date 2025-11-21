import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageSquare, Share2, ArrowLeft } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { MainNav } from "@/components/MainNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import VerificationBadge from "@/components/VerificationBadge";
import PostMenu from "@/components/PostMenu";
import ReactionPicker, { reactions } from "@/components/ReactionPicker";

export default function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [showReactions, setShowReactions] = useState(false);

  useEffect(() => {
    loadPost();
    loadUser();
  }, [postId]);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadPost = async () => {
    try {
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
          post_reactions (
            user_id,
            reaction_type
          ),
          comments (
            id
          )
        `)
        .eq("id", postId)
        .single();

      if (error) throw error;
      setPost(data);
    } catch (error: any) {
      toast.error("Erro ao carregar publicação");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (reaction?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existingReaction } = await supabase
        .from("post_reactions")
        .select("*")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .single();

      if (existingReaction) {
        if (reaction && existingReaction.reaction_type !== reaction) {
          await supabase
            .from("post_reactions")
            .update({ reaction_type: reaction })
            .eq("id", existingReaction.id);
        } else if (!reaction) {
          await supabase
            .from("post_reactions")
            .delete()
            .eq("id", existingReaction.id);
        }
      } else if (reaction) {
        await supabase.from("post_reactions").insert({
          post_id: postId,
          user_id: user.id,
          reaction_type: reaction,
        });
      } else {
        await supabase.from("post_reactions").insert({
          post_id: postId,
          user_id: user.id,
          reaction_type: "heart",
        });
      }

      loadPost();
      setShowReactions(false);
    } catch (error: any) {
      toast.error("Erro ao reagir");
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <TopBar />
          <MainNav />
          <div className="container mx-auto max-w-2xl px-4 py-6 pt-20">
            <p className="text-center text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!post) return null;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-20">
        <TopBar />
        <MainNav />

        <div className="container mx-auto max-w-2xl px-4 py-6 pt-20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <Card className="overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={post.profiles?.avatar_url} />
                    <AvatarFallback>
                      {post.profiles?.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-sm">
                        {post.profiles?.full_name || post.profiles?.username}
                      </span>
                      {post.profiles?.verified && (
                        <VerificationBadge
                          badgeType={post.profiles?.badge_type}
                          className="w-4 h-4"
                        />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                </div>
                <PostMenu
                  postId={post.id}
                  postUserId={post.user_id}
                  currentUserId={currentUserId}
                  onUpdate={loadPost}
                />
              </div>

              {post.content && (
                <p className="mb-3 text-sm">{post.content}</p>
              )}
            </div>

            {post.media_urls && post.media_urls.length > 0 && (
              <div className="grid grid-cols-1 gap-1">
                {post.media_urls.map((url: string, idx: number) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Media ${idx + 1}`}
                    className="w-full object-cover max-h-[600px]"
                  />
                ))}
              </div>
            )}

            <div className="p-4 border-t">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  {post.post_reactions && post.post_reactions.length > 0 && (
                    <>
                      <div className="flex items-center -space-x-1">
                        {Array.from(new Set(post.post_reactions.map((r: any) => r.reaction_type)))
                          .slice(0, 3)
                          .map((type: string) => {
                            const reaction = reactions.find(r => r.type === type);
                            return reaction ? (
                              <div 
                                key={type}
                                className="w-5 h-5 rounded-full border-2 border-card bg-card overflow-hidden"
                              >
                                <img 
                                  src={reaction.icon} 
                                  alt={type} 
                                  className="w-full h-full"
                                />
                              </div>
                            ) : null;
                          })}
                      </div>
                      <span>{post.post_reactions.length}</span>
                    </>
                  )}
                </div>
                <span>{post.comments?.length || 0} comentários</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => handleLike()}
                    onMouseDown={() => setTimeout(() => setShowReactions(true), 500)}
                    onMouseUp={() => setShowReactions(false)}
                    onMouseLeave={() => setShowReactions(false)}
                  >
                    {post.post_reactions?.find((r: any) => r.user_id === currentUserId) ? (
                      <img
                        src={reactions.find(r => r.type === post.post_reactions.find((re: any) => re.user_id === currentUserId)?.reaction_type)?.icon}
                        alt="reaction"
                        className="h-5 w-5 mr-2"
                      />
                    ) : (
                      <Heart className="h-5 w-5 mr-2" />
                    )}
                    Gosto
                  </Button>
                  <ReactionPicker
                    show={showReactions}
                    onSelect={(reaction) => handleLike(reaction)}
                    onClose={() => setShowReactions(false)}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate(`/comments/${post.id}`)}
                >
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Comentar
                </Button>
                <Button variant="ghost" size="sm" className="flex-1">
                  <Share2 className="h-5 w-5 mr-2" />
                  Partilhar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
