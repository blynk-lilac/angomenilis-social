import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  MoreHorizontal, 
  Bookmark, 
  Share2, 
  EyeOff, 
  AlertCircle,
  Bell,
  Copy,
  PlusCircle,
  MinusCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PostMenuProps {
  postId: string;
  postUserId: string;
  currentUserId: string;
  isSaved?: boolean;
  hasNotifications?: boolean;
  onUpdate?: () => void;
}

export default function PostMenu({ 
  postId, 
  postUserId, 
  currentUserId,
  isSaved = false,
  hasNotifications = false,
  onUpdate 
}: PostMenuProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleSavePost = async () => {
    try {
      if (isSaved) {
        await supabase
          .from("saved_posts")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", currentUserId);
        toast.success("Post removido dos salvos");
      } else {
        await supabase
          .from("saved_posts")
          .insert({ post_id: postId, user_id: currentUserId });
        toast.success("Post salvo com sucesso");
      }
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message);
    }
    setOpen(false);
  };

  const handleInterested = async () => {
    try {
      await supabase
        .from("post_preferences")
        .upsert({ 
          post_id: postId, 
          user_id: currentUserId,
          preference_type: 'interested'
        });
      toast.success("Marcado como interessante");
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message);
    }
    setOpen(false);
  };

  const handleNotInterested = async () => {
    try {
      await supabase
        .from("post_preferences")
        .upsert({ 
          post_id: postId, 
          user_id: currentUserId,
          preference_type: 'not_interested'
        });
      toast.success("Preferência atualizada");
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message);
    }
    setOpen(false);
  };

  const handleHidePost = async () => {
    try {
      await supabase
        .from("post_preferences")
        .upsert({ 
          post_id: postId, 
          user_id: currentUserId,
          preference_type: 'hide'
        });
      toast.success("Post ocultado");
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message);
    }
    setOpen(false);
  };

  const handleToggleNotifications = async () => {
    try {
      if (hasNotifications) {
        await supabase
          .from("post_notifications")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", currentUserId);
        toast.success("Notificações desativadas");
      } else {
        await supabase
          .from("post_notifications")
          .insert({ 
            post_id: postId, 
            user_id: currentUserId,
            enabled: true
          });
        toast.success("Notificações ativadas");
      }
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message);
    }
    setOpen(false);
  };

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/post/${postId}`;
    await navigator.clipboard.writeText(link);
    toast.success("Link copiado para a área de transferência");
    setOpen(false);
  };

  const handleShare = () => {
    const link = `${window.location.origin}/post/${postId}`;
    if (navigator.share) {
      navigator.share({
        title: "Compartilhar publicação",
        url: link,
      });
    } else {
      handleCopyLink();
    }
    setOpen(false);
  };

  const handleReport = () => {
    navigate(`/report?type=post&id=${postId}`);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0 hover:bg-muted rounded-full"
        >
          <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuItem onClick={handleInterested} className="py-3 cursor-pointer">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-muted rounded-full">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Com interesse</p>
              <p className="text-xs text-muted-foreground">
                As publicações que te apresentarmos serão mais parecidas com esta.
              </p>
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleNotInterested} className="py-3 cursor-pointer">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-muted rounded-full">
              <MinusCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Sem interesse</p>
              <p className="text-xs text-muted-foreground">
                As publicações que te apresentarmos serão menos parecidas com esta.
              </p>
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleSavePost} className="py-3 cursor-pointer">
          <div className="flex items-center gap-3">
            <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-current' : ''}`} />
            <div>
              <p className="font-semibold text-sm">
                {isSaved ? "Remover dos guardados" : "Guardar publicação"}
              </p>
              {!isSaved && (
                <p className="text-xs text-muted-foreground">
                  Adiciona isto aos teus itens guardados.
                </p>
              )}
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleShare} className="py-3 cursor-pointer">
          <div className="flex items-center gap-3">
            <Share2 className="h-5 w-5" />
            <p className="font-semibold text-sm">Partilhar</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleHidePost} className="py-3 cursor-pointer">
          <div className="flex items-center gap-3">
            <EyeOff className="h-5 w-5" />
            <p className="font-semibold text-sm">Não quero ver isto</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleReport} className="py-3 cursor-pointer">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-semibold text-sm">Denunciar publicação</p>
              <p className="text-xs text-muted-foreground">
                Não vamos informar quem fez a denúncia.
              </p>
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleToggleNotifications} className="py-3 cursor-pointer">
          <div className="flex items-center gap-3">
            <Bell className={`h-5 w-5 ${hasNotifications ? 'fill-current' : ''}`} />
            <p className="font-semibold text-sm">
              {hasNotifications ? "Desativar" : "Ativar"} notificações para esta publicação
            </p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleCopyLink} className="py-3 cursor-pointer">
          <div className="flex items-center gap-3">
            <Copy className="h-5 w-5" />
            <p className="font-semibold text-sm">Copiar ligação</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
