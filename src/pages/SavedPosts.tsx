import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageSquare, Share2, Bookmark } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { MainNav } from "@/components/MainNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import VerificationBadge from "@/components/VerificationBadge";
import { BottomNav } from "@/components/layout/BottomNav";

export default function SavedPosts() {
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSavedPosts();
  }, []);

  const fetchSavedPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("saved_posts")
        .select(`
          id,
          created_at,
          post_id,
          posts!inner (
            id,
            content,
            media_urls,
            created_at,
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
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSavedPosts(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar posts salvos");
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (savedPostId: string) => {
    try {
      await supabase
        .from("saved_posts")
        .delete()
        .eq("id", savedPostId);
      
      toast.success("Post removido dos salvos");
      fetchSavedPosts();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const renderMediaGrid = (mediaUrls: string[]) => {
    if (!mediaUrls || mediaUrls.length === 0) return null;

    if (mediaUrls.length === 1) {
      return (
        <div className="w-full bg-black/5">
          <img src={mediaUrls[0]} alt="Post" className="w-full max-h-[400px] object-cover" />
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-1">
        {mediaUrls.slice(0, 4).map((url, idx) => (
          <div key={idx} className="relative">
            <img src={url} alt={`Media ${idx + 1}`} className="w-full h-[200px] object-cover" />
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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-20">
        <TopBar />
        <MainNav />

        <div className="container mx-auto max-w-2xl px-4 py-6 pt-20">
          <h1 className="text-2xl font-bold mb-6">Publicações Guardadas</h1>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : savedPosts.length === 0 ? (
            <Card className="p-8 text-center">
              <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Nenhum post guardado</h2>
              <p className="text-muted-foreground">
                Quando guardares publicações, elas aparecerão aqui
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {savedPosts.map((saved) => {
                const post = saved.posts;
                return (
                  <Card key={saved.id} className="overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnsave(saved.id)}
                        >
                          <Bookmark className="h-5 w-5 fill-current" />
                        </Button>
                      </div>

                      {post.content && (
                        <p className="mb-3 text-sm">{post.content}</p>
                      )}
                    </div>

                    {renderMediaGrid(post.media_urls)}

                    <div className="p-4 border-t">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                        <span>{post.post_reactions?.length || 0} reações</span>
                        <span>{post.comments?.length || 0} comentários</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate(`/comments/${post.id}`)}
                        >
                          <Heart className="h-4 w-4 mr-2" />
                          Gosto
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate(`/comments/${post.id}`)}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Comentar
                        </Button>
                        <Button variant="ghost" size="sm" className="flex-1">
                          <Share2 className="h-4 w-4 mr-2" />
                          Partilhar
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
