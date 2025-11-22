import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import nuvexLogo from "@/assets/nuvex-logo.png";
import { useAdBoost } from "@/hooks/useAdBoost";

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

  // Ativar boost automático de likes
  useAdBoost(ad.id, true);

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
          // Buscar contador atualizado
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

  const handleLike = async () => {
    if (!userId) {
      toast.error("Faça login para curtir");
      return;
    }

    try {
      if (liked) {
        await supabase
          .from("ad_likes")
          .delete()
          .eq("ad_id", ad.id)
          .eq("user_id", userId);
        setLikes(likes - 1);
        setLiked(false);
      } else {
        await supabase
          .from("ad_likes")
          .insert({ ad_id: ad.id, user_id: userId });
        setLikes(likes + 1);
        setLiked(true);
      }
    } catch (error) {
      console.error("Erro ao curtir anúncio:", error);
      toast.error("Erro ao curtir anúncio");
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
    <Card className="bg-card border border-border/30 rounded-lg sm:rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 my-4">
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
      </div>

      {/* Actions */}
      <div className="p-2 flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          className={`flex-1 gap-2 ${liked ? "text-red-500" : ""}`}
          onClick={handleLike}
        >
          <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} />
          <span>Curtir</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 gap-2"
          onClick={() => window.open(ad.link_url, "_blank")}
        >
          <MessageCircle className="h-5 w-5" />
          <span>Comentar</span>
        </Button>
        <Button variant="ghost" size="sm" className="flex-1 gap-2" onClick={handleShare}>
          <Share2 className="h-5 w-5" />
          <span>Partilhar</span>
        </Button>
      </div>
    </Card>
  );
};
