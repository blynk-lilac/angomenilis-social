import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { 
  Bookmark, 
  Repeat2, 
  QrCode, 
  Star, 
  UserMinus, 
  Download, 
  Languages, 
  Subtitles, 
  Info, 
  EyeOff, 
  User, 
  AlertTriangle,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PostOptionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postUserId: string;
  currentUserId: string;
  mediaUrls?: string[];
}

export default function PostOptionsSheet({ 
  open, 
  onOpenChange, 
  postId, 
  postUserId, 
  currentUserId,
  mediaUrls 
}: PostOptionsSheetProps) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const isOwnPost = postUserId === currentUserId;

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('saved_posts')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (existing) {
        await supabase.from('saved_posts').delete().eq('id', existing.id);
        toast.success('Removido dos guardados');
      } else {
        await supabase.from('saved_posts').insert({ post_id: postId, user_id: currentUserId });
        toast.success('Guardado!');
      }
    } catch (error) {
      toast.error('Erro ao guardar');
    }
    setSaving(false);
  };

  const handleDownload = async () => {
    if (!mediaUrls || mediaUrls.length === 0) {
      toast.error('Sem mídia para baixar');
      return;
    }

    for (const url of mediaUrls) {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = url.split('/').pop() || 'download';
        a.click();
        window.URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error('Download error:', error);
      }
    }
    toast.success('Download iniciado');
    onOpenChange(false);
  };

  const handleRepost = async () => {
    try {
      const { data: originalPost } = await supabase
        .from('posts')
        .select('content, media_urls')
        .eq('id', postId)
        .single();

      if (originalPost) {
        await supabase.from('posts').insert({
          user_id: currentUserId,
          content: `🔄 Republicado: ${originalPost.content || ''}`,
          media_urls: originalPost.media_urls
        });
        toast.success('Republicado!');
        onOpenChange(false);
      }
    } catch (error) {
      toast.error('Erro ao republicar');
    }
  };

  const handleUnfollow = async () => {
    try {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', postUserId);
      toast.success('Deixaste de seguir');
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao deixar de seguir');
    }
  };

  const handleReport = () => {
    navigate(`/report?type=post&id=${postId}`);
    onOpenChange(false);
  };

  const options = [
    {
      icon: Bookmark,
      label: 'Guardar',
      action: handleSave,
      show: true
    },
    {
      icon: Repeat2,
      label: 'Remisturar',
      action: handleRepost,
      show: true
    },
    {
      icon: QrCode,
      label: 'Código QR',
      action: () => toast.info('QR Code em breve'),
      show: true
    }
  ];

  const menuItems = [
    {
      icon: Star,
      label: 'Adicionar aos favoritos',
      action: handleSave,
      show: true
    },
    {
      icon: UserMinus,
      label: 'Não seguir',
      action: handleUnfollow,
      show: !isOwnPost
    },
    {
      icon: Download,
      label: 'Download',
      action: handleDownload,
      show: mediaUrls && mediaUrls.length > 0
    },
    {
      icon: Languages,
      label: 'Traduções',
      action: () => toast.info('Tradução em breve'),
      show: true
    },
    {
      icon: Subtitles,
      label: 'Legendagem opcional',
      action: () => toast.info('Legendas em breve'),
      show: true
    },
    {
      icon: Info,
      label: 'Porque é que estás a ver esta publicação',
      action: () => toast.info('Algoritmo de recomendação'),
      show: true
    },
    {
      icon: EyeOff,
      label: 'Ocultar',
      action: () => toast.success('Publicação ocultada'),
      show: true
    },
    {
      icon: User,
      label: 'Sobre esta conta',
      action: () => navigate(`/profile/${postUserId}`),
      show: !isOwnPost
    },
    {
      icon: AlertTriangle,
      label: 'Denunciar',
      action: handleReport,
      show: !isOwnPost,
      destructive: true
    }
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0">
        <div className="p-4">
          {/* Drag Handle */}
          <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />

          {/* Quick Actions */}
          <div className="flex justify-around py-4 border-b">
            {options.filter(o => o.show).map((option, index) => (
              <button
                key={index}
                onClick={option.action}
                className="flex flex-col items-center gap-2"
              >
                <div className="h-14 w-14 rounded-full border-2 border-foreground flex items-center justify-center">
                  <option.icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium">{option.label}</span>
              </button>
            ))}
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {menuItems.filter(item => item.show).map((item, index) => (
              <button
                key={index}
                onClick={item.action}
                className={`w-full flex items-center gap-4 px-4 py-4 hover:bg-muted/50 transition-colors ${
                  item.destructive ? 'text-destructive' : ''
                }`}
              >
                <item.icon className="h-6 w-6" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
