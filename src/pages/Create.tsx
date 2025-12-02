import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Image as ImageIcon, Video, Users, Smile, MapPin, Radio, Palette, Camera, X, ChevronLeft } from "lucide-react";
import MentionTextarea from "@/components/MentionTextarea";
import { useNavigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useHashtagsAndMentions } from "@/hooks/useHashtagsAndMentions";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { useAuth } from "@/contexts/AuthContext";

export default function Create() {
  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { processPostHashtagsAndMentions } = useHashtagsAndMentions();
  const { activeProfile } = useActiveProfile();
  const { user } = useAuth();

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalFiles = mediaFiles.length + files.length;
    
    if (totalFiles > 10) {
      toast.error("Máximo de 10 mídias por post");
      return;
    }

    const images = files.filter(f => f.type.startsWith('image/'));
    const videos = files.filter(f => f.type.startsWith('video/'));
    const currentImages = mediaFiles.filter(f => f.type.startsWith('image/')).length;
    const currentVideos = mediaFiles.filter(f => f.type.startsWith('video/')).length;

    if (currentImages + images.length > 5) {
      toast.error("Máximo de 5 fotos por post");
      return;
    }

    if (currentVideos + videos.length > 5) {
      toast.error("Máximo de 5 vídeos por post");
      return;
    }

    const newFiles = [...mediaFiles, ...files];
    setMediaFiles(newFiles);

    const previews = files.map(file => URL.createObjectURL(file));
    setMediaPreviews([...mediaPreviews, ...previews]);
  };

  const removeMedia = (index: number) => {
    const newFiles = mediaFiles.filter((_, i) => i !== index);
    const newPreviews = mediaPreviews.filter((_, i) => i !== index);
    setMediaFiles(newFiles);
    setMediaPreviews(newPreviews);
  };

  const handleCreatePost = async () => {
    if (!content.trim() && mediaFiles.length === 0) {
      toast.error("Digite algo ou adicione uma mídia");
      return;
    }

    setLoading(true);
    try {
      if (!user) throw new Error("Usuário não autenticado");

      // Usar perfil ativo ou usuário principal
      const postUserId = activeProfile?.type === 'page' ? activeProfile.id : user.id;

      const mediaUrls: string[] = [];

      for (const file of mediaFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(fileName);

        mediaUrls.push(publicUrl);
      }

      const { data: newPost, error } = await supabase.from("posts").insert({
        user_id: postUserId,
        content,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
      }).select().single();

      if (error) throw error;

      // Processar hashtags e menções
      if (newPost) {
        await processPostHashtagsAndMentions(newPost.id, content, postUserId);
      }

      toast.success("Post criado!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar post");
    } finally {
      setLoading(false);
    }
  };

  const displayProfile = activeProfile || user;
  const avatarUrl = activeProfile ? activeProfile.avatar_url : user?.user_metadata?.avatar_url;
  const displayName = activeProfile 
    ? (activeProfile.type === 'page' ? activeProfile.name : user?.user_metadata?.first_name || user?.email?.split('@')[0])
    : (user?.user_metadata?.first_name || user?.email?.split('@')[0]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate(-1)}
                className="h-9 w-9"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold">Criar publicação</h1>
            </div>
            <Button
              onClick={handleCreatePost}
              disabled={loading || (!content.trim() && mediaFiles.length === 0)}
              size="sm"
              className="bg-primary hover:bg-primary/90 font-semibold px-6 rounded-full"
            >
              {loading ? "Publicando..." : "Seguinte"}
            </Button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* User Info */}
          <div className="flex items-center gap-3 px-4 py-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {displayName?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold text-[15px]">
                {displayName || 'User'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 px-3 rounded-md text-xs font-semibold bg-primary/10 border-primary/30 text-primary"
                >
                  Público
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 px-3 rounded-md text-xs font-semibold bg-muted/60 border-border/60"
                >
                  + Álbum
                </Button>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 mt-1 text-xs font-semibold text-primary hover:bg-primary/10"
              >
                📷 Desativado
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 mt-1 text-xs font-semibold text-primary hover:bg-primary/10"
              >
                + Etiqueta de IA desativada
              </Button>
            </div>
          </div>

          {/* Content Input */}
          <div className="px-4">
            <MentionTextarea
              placeholder="Em que estás a pensar?"
              value={content}
              onChange={setContent}
              rows={8}
              className="min-h-[200px] bg-transparent border-0 text-foreground text-[17px] resize-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
            />

            {mediaPreviews.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {mediaPreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square">
                    {mediaFiles[index]?.type.startsWith('video/') ? (
                      <video src={preview} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-8 w-8 p-0 bg-black/60 hover:bg-black/80 rounded-full"
                      onClick={() => removeMedia(index)}
                    >
                      <X className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-2 bg-muted/30 my-4" />

          {/* Action Options */}
          <div className="px-4 pb-4">
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleMediaChange}
              className="hidden"
              id="media-upload"
              multiple
            />
            
            <label htmlFor="media-upload">
              <div className="flex items-center gap-3 p-4 hover:bg-muted/30 rounded-lg cursor-pointer transition-colors">
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <ImageIcon className="h-5 w-5 text-green-600" />
                </div>
                <span className="font-medium text-[15px]">Foto/vídeo</span>
              </div>
            </label>

            <div className="flex items-center gap-3 p-4 hover:bg-muted/30 rounded-lg cursor-pointer transition-colors opacity-60">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <span className="font-medium text-[15px]">Identificar pessoas</span>
            </div>

            <div className="flex items-center gap-3 p-4 hover:bg-muted/30 rounded-lg cursor-pointer transition-colors opacity-60">
              <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Smile className="h-5 w-5 text-yellow-600" />
              </div>
              <span className="font-medium text-[15px]">A sentir-me/Atividade</span>
            </div>

            <div className="flex items-center gap-3 p-4 hover:bg-muted/30 rounded-lg cursor-pointer transition-colors opacity-60">
              <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-red-600" />
              </div>
              <span className="font-medium text-[15px]">Visitar</span>
            </div>

            <div className="flex items-center gap-3 p-4 hover:bg-muted/30 rounded-lg cursor-pointer transition-colors opacity-60">
              <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Radio className="h-5 w-5 text-red-600" />
              </div>
              <span className="font-medium text-[15px]">Vídeo em direto</span>
            </div>

            <div className="flex items-center gap-3 p-4 hover:bg-muted/30 rounded-lg cursor-pointer transition-colors opacity-60">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Palette className="h-5 w-5 text-foreground" />
              </div>
              <span className="font-medium text-[15px]">Cor de fundo</span>
            </div>

            <div className="flex items-center gap-3 p-4 hover:bg-muted/30 rounded-lg cursor-pointer transition-colors opacity-60">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Camera className="h-5 w-5 text-blue-600" />
              </div>
              <span className="font-medium text-[15px]">Câmara</span>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
