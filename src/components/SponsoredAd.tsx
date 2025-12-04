import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import nuvexLogo from "@/assets/nuvex-logo.png";
import { useAdBoost } from "@/hooks/useAdBoost";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AdComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profile?: {
    username: string;
    avatar_url: string;
    full_name: string;
  };
}

interface SponsoredAdProps {
  ad: {
    id: string;
    company_name: string;
    company_logo: string;
    content: string;
    link_url: string;
    link_title: string | null;
    link_description: string | null;
    link_image: string | null;
  };
  likesCount: number;
  isLiked: boolean;
  userId: string | null;
}

export const SponsoredAd = ({ ad, likesCount, isLiked, userId }: SponsoredAdProps) => {
  const [liked, setLiked] = useState(isLiked);
  const [likes, setLikes] = useState(likesCount);
  const [comments, setComments] = useState<AdComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  // Ativar boost automático de likes
  useAdBoost(ad.id, true);

  useEffect(() => {
    loadComments();
  }, [ad.id]);

  // Atualizar contador de likes em tempo real
  useEffect(() => {
    const channel = supabase
      .channel(`ad-likes-${ad.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ad_likes',
          filter: `ad_id=eq.${ad.id}`,
        },
        async () => {
          const { data, error } = await supabase
            .from('ad_likes')
            .select('id')
            .eq('ad_id', ad.id);
          
          if (!error && data) {
            setLikes(data.length);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ad.id]);

  // Realtime comments
  useEffect(() => {
    const channel = supabase
      .channel(`ad-comments-${ad.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ad_comments',
          filter: `ad_id=eq.${ad.id}`,
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ad.id]);

  const loadComments = async () => {
    const { data, error } = await supabase
      .from('ad_comments')
      .select('*')
      .eq('ad_id', ad.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, full_name')
        .in('id', userIds);

      const commentsWithProfiles = data.map(comment => ({
        ...comment,
        profile: profiles?.find(p => p.id === comment.user_id)
      }));

      setComments(commentsWithProfiles);
    }
  };

  const handleLike = async () => {
    if (!userId) {
      toast.error("Faça login para curtir");
      return;
    }

    if (isLiking) return;
    setIsLiking(true);

    try {
      // Verificar se já curtiu
      const { data: existingLike } = await supabase
        .from("ad_likes")
        .select("id")
        .eq("ad_id", ad.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingLike) {
        // Remover like
        const { error } = await supabase
          .from("ad_likes")
          .delete()
          .eq("id", existingLike.id);
        
        if (error) throw error;
        
        setLikes(prev => Math.max(0, prev - 1));
        setLiked(false);
        toast.success("Gosto removido");
      } else {
        // Adicionar like
        const { error } = await supabase
          .from("ad_likes")
          .insert({ ad_id: ad.id, user_id: userId });
        
        if (error) throw error;
        
        setLikes(prev => prev + 1);
        setLiked(true);
        toast.success("Gostou do anúncio!");
      }
    } catch (error: any) {
      console.error("Erro ao curtir anúncio:", error);
      toast.error("Erro ao processar curtida");
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!userId) {
      toast.error("Faça login para comentar");
      return;
    }

    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('ad_comments')
        .insert({
          ad_id: ad.id,
          user_id: userId,
          content: newComment.trim()
        });

      if (error) throw error;

      setNewComment("");
      toast.success("Comentário adicionado!");
    } catch (error: any) {
      console.error("Erro ao comentar:", error);
      toast.error("Erro ao comentar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: ad.link_title || ad.company_name,
        text: ad.content,
        url: ad.link_url,
      });
    } else {
      navigator.clipboard.writeText(ad.link_url);
      toast.success("Link copiado!");
    }
  };

  return (
    <Card className="bg-card border border-border/30 rounded-lg sm:rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 my-4 animate-in fade-in slide-in-from-bottom-2">
      {/* Header */}
      <div className="p-3 sm:p-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <img
            src={nuvexLogo}
            alt={ad.company_name}
            className="h-11 w-11 rounded-full object-contain bg-white p-1"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{ad.company_name}</span>
            </div>
            <span className="text-xs text-muted-foreground">Patrocinado</span>
          </div>
        </div>
        <p className="text-foreground text-lg font-bold mb-3">{ad.content}</p>
      </div>

      {/* Link Preview */}
      <a
        href={ad.link_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block border-t border-b border-border/50 hover:bg-accent/5 transition-colors"
      >
        {ad.link_image && (
          <div className="w-full aspect-[1.91/1] bg-muted">
            <img
              src={ad.link_image}
              alt={ad.link_title || ad.company_name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-3 bg-muted/30">
          <div className="text-xs text-muted-foreground uppercase mb-1">
            {new URL(ad.link_url).hostname}
          </div>
          {ad.link_title && (
            <div className="text-foreground font-semibold line-clamp-2 mb-1">
              {ad.link_title}
            </div>
          )}
          {ad.link_description && (
            <div className="text-sm text-muted-foreground line-clamp-2">
              {ad.link_description}
            </div>
          )}
        </div>
      </a>

      {/* Stats */}
      <div className="px-4 py-2 flex items-center justify-between text-sm text-muted-foreground border-b border-border/50">
        <span>{likes} curtidas</span>
        <button 
          onClick={() => setShowComments(!showComments)}
          className="hover:underline"
        >
          {comments.length} comentários
        </button>
      </div>

      {/* Actions */}
      <div className="p-2 flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          className={`flex-1 gap-2 transition-all duration-200 ${liked ? "text-red-500" : ""}`}
          onClick={handleLike}
          disabled={isLiking}
        >
          <Heart className={`h-5 w-5 transition-transform ${liked ? "fill-current scale-110" : ""}`} />
          <span className="hidden sm:inline">Curtir</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 gap-2"
          onClick={() => setShowComments(!showComments)}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">Comentar</span>
        </Button>
        <Button variant="ghost" size="sm" className="flex-1 gap-2" onClick={handleShare}>
          <Share2 className="h-5 w-5" />
          <span className="hidden sm:inline">Partilhar</span>
        </Button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-border/50 p-3 sm:p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          {/* Comment Input */}
          <form onSubmit={handleComment} className="flex gap-2 items-center">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escreva um comentário..."
              className="flex-1 h-10 text-sm rounded-full"
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 rounded-full"
              disabled={isSubmitting || !newComment.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>

          {/* Comments List */}
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-2 animate-in fade-in duration-200">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={comment.profile?.avatar_url} />
                  <AvatarFallback className="text-xs bg-primary/10">
                    {comment.profile?.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="bg-muted/50 rounded-xl px-3 py-2">
                    <p className="text-sm font-semibold text-foreground">
                      {comment.profile?.full_name || comment.profile?.username || 'Usuário'}
                    </p>
                    <p className="text-sm text-foreground break-words">{comment.content}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 px-2">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">
                Nenhum comentário ainda. Seja o primeiro!
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};