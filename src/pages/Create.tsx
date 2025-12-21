import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Image as ImageIcon, 
  Video, 
  Users, 
  MapPin, 
  Music, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  Sliders,
  Play,
  Pause,
  Volume2,
  VolumeX
} from "lucide-react";
import MentionTextarea from "@/components/MentionTextarea";
import { useNavigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useHashtagsAndMentions } from "@/hooks/useHashtagsAndMentions";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import MusicSearch from "@/components/MusicSearch";

interface VideoFilter {
  name: string;
  style: string;
}

const videoFilters: VideoFilter[] = [
  { name: 'Normal', style: '' },
  { name: 'Clarendon', style: 'contrast(1.2) saturate(1.35)' },
  { name: 'Gingham', style: 'brightness(1.05) hue-rotate(-10deg)' },
  { name: 'Moon', style: 'grayscale(1) contrast(1.1) brightness(1.1)' },
  { name: 'Lark', style: 'contrast(0.9) brightness(1.1) saturate(0.9)' },
  { name: 'Reyes', style: 'sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)' },
  { name: 'Juno', style: 'sepia(0.35) contrast(1.15) brightness(1.15) saturate(1.8)' },
  { name: 'Aden', style: 'hue-rotate(-20deg) contrast(0.9) saturate(0.85) brightness(1.2)' },
  { name: 'Crema', style: 'sepia(0.5) contrast(1.25) brightness(1.15) saturate(0.9)' },
  { name: 'Ludwig', style: 'brightness(1.05) saturate(1.1)' },
];

export default function Create() {
  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'compose' | 'edit' | 'music'>('compose');
  const [selectedFilter, setSelectedFilter] = useState<VideoFilter>(videoFilters[0]);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [selectedMusic, setSelectedMusic] = useState<{ name: string; artist: string; url: string } | null>(null);
  const [musicVolume, setMusicVolume] = useState(50);
  const [videoVolume, setVideoVolume] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [musicDialogOpen, setMusicDialogOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const navigate = useNavigate();
  const { processPostHashtagsAndMentions } = useHashtagsAndMentions();
  const { activeProfile } = useActiveProfile();
  const { user } = useAuth();

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);

    const supported = picked.filter((f) => {
      if (f.type.startsWith("image/")) {
        return ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(f.type);
      }
      if (f.type.startsWith("video/")) {
        return ["video/mp4", "video/webm"].includes(f.type);
      }
      return false;
    });

    if (supported.length !== picked.length) {
      toast.error("Alguns ficheiros não são suportados. Use JPG/PNG/WEBP ou MP4/WebM.");
    }

    const files = supported;
    const totalFiles = mediaFiles.length + files.length;

    if (totalFiles > 10) {
      toast.error("Máximo de 10 mídias por post");
      return;
    }

    const images = files.filter((f) => f.type.startsWith("image/"));
    const videos = files.filter((f) => f.type.startsWith("video/"));
    const currentImages = mediaFiles.filter((f) => f.type.startsWith("image/")).length;
    const currentVideos = mediaFiles.filter((f) => f.type.startsWith("video/")).length;

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

    const previews = files.map((file) => URL.createObjectURL(file));
    setMediaPreviews([...mediaPreviews, ...previews]);
  };

  const removeMedia = (index: number) => {
    const newFiles = mediaFiles.filter((_, i) => i !== index);
    const newPreviews = mediaPreviews.filter((_, i) => i !== index);
    setMediaFiles(newFiles);
    setMediaPreviews(newPreviews);
  };

  const hasVideo = mediaFiles.some(f => f.type.startsWith('video/'));

  const getFilterStyle = () => {
    let style = selectedFilter.style;
    if (brightness !== 100 || contrast !== 100 || saturation !== 100) {
      style += ` brightness(${brightness / 100}) contrast(${contrast / 100}) saturate(${saturation / 100})`;
    }
    return style.trim();
  };

  const togglePlayback = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        audioRef.current?.pause();
      } else {
        videoRef.current.play();
        audioRef.current?.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMusicSelect = (music: { name: string; artist: string; preview?: string }) => {
    if (music.preview) {
      setSelectedMusic({ name: music.name, artist: music.artist, url: music.preview });
    }
    setMusicDialogOpen(false);
  };

  const handleCreatePost = async () => {
    if (!content.trim() && mediaFiles.length === 0) {
      toast.error("Digite algo ou adicione uma mídia");
      return;
    }

    setLoading(true);
    try {
      if (!user) throw new Error("Usuário não autenticado");

      const postUserId = activeProfile?.type === 'page' ? activeProfile.id : user.id;
      const mediaUrls: string[] = [];

      for (const file of mediaFiles) {
        const fileExt = file.name.split(".").pop()?.toLowerCase();
        const fileName = `${user.id}/${Date.now()}-${Math.random()}.${fileExt}`;

        const contentType =
          file.type ||
          (fileExt === "mp4"
            ? "video/mp4"
            : fileExt === "webm"
              ? "video/webm"
              : fileExt === "jpg" || fileExt === "jpeg"
                ? "image/jpeg"
                : fileExt === "png"
                  ? "image/png"
                  : fileExt === "gif"
                    ? "image/gif"
                    : fileExt === "webp"
                      ? "image/webp"
                      : "application/octet-stream");

        const { error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
            contentType,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from("post-images").getPublicUrl(fileName);
        mediaUrls.push(publicUrl);
      }

      const { data: newPost, error } = await supabase.from("posts").insert({
        user_id: postUserId,
        content,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
      }).select().single();

      if (error) throw error;

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
                onClick={() => {
                  if (step === 'edit') setStep('compose');
                  else if (step === 'music') setStep('edit');
                  else navigate(-1);
                }}
                className="h-9 w-9"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold">
                {step === 'compose' ? 'Criar publicação' : step === 'edit' ? 'Editar' : 'Música'}
              </h1>
            </div>
            {step === 'compose' && hasVideo ? (
              <Button
                onClick={() => setStep('edit')}
                size="sm"
                className="font-semibold px-6 rounded-full"
              >
                Seguinte <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : step === 'edit' ? (
              <Button
                onClick={() => setStep('music')}
                size="sm"
                className="font-semibold px-6 rounded-full"
              >
                Seguinte <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleCreatePost}
                disabled={loading || (!content.trim() && mediaFiles.length === 0)}
                size="sm"
                className="bg-primary hover:bg-primary/90 font-semibold px-6 rounded-full"
              >
                {loading ? "Publicando..." : "Publicar"}
              </Button>
            )}
          </div>
        </div>

        {step === 'compose' && (
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
                <p className="font-bold text-[15px]">{displayName || 'User'}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 px-3 rounded-md text-xs font-semibold mt-1"
                >
                  Público
                </Button>
              </div>
            </div>

            {/* Content Input */}
            <div className="px-4">
              <MentionTextarea
                placeholder="Em que estás a pensar?"
                value={content}
                onChange={setContent}
                rows={6}
                className="min-h-[150px] bg-transparent border-0 text-foreground text-[17px] resize-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
              />

              {mediaPreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {mediaPreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square">
                      {mediaFiles[index]?.type.startsWith('video/') ? (
                        <video src={preview} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 h-8 w-8 p-0 bg-black/60 hover:bg-black/80 rounded-full"
                        onClick={() => removeMedia(index)}
                      >
                        <X className="h-4 w-4 text-white" />
                      </Button>
                      {mediaFiles[index]?.type.startsWith('video/') && (
                        <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-white text-xs flex items-center gap-1">
                          <Video className="h-3 w-3" />
                          Vídeo
                        </div>
                      )}
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
                <div className="flex items-center gap-3 p-4 hover:bg-muted/30 rounded-xl cursor-pointer transition-colors">
                  <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-green-600" />
                  </div>
                  <span className="font-medium text-[15px]">Foto/vídeo</span>
                </div>
              </label>

              <div 
                className="flex items-center gap-3 p-4 hover:bg-muted/30 rounded-xl cursor-pointer transition-colors"
                onClick={() => setMusicDialogOpen(true)}
              >
                <div className="h-10 w-10 rounded-full bg-pink-500/10 flex items-center justify-center">
                  <Music className="h-5 w-5 text-pink-600" />
                </div>
                <div className="flex-1">
                  <span className="font-medium text-[15px]">Adicionar música</span>
                  {selectedMusic && (
                    <p className="text-sm text-muted-foreground">{selectedMusic.name} - {selectedMusic.artist}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 hover:bg-muted/30 rounded-xl cursor-pointer transition-colors opacity-60">
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <span className="font-medium text-[15px]">Identificar pessoas</span>
              </div>

              <div className="flex items-center gap-3 p-4 hover:bg-muted/30 rounded-xl cursor-pointer transition-colors opacity-60">
                <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-red-600" />
                </div>
                <span className="font-medium text-[15px]">Adicionar local</span>
              </div>
            </div>
          </div>
        )}

        {/* Video Editor Step */}
        {step === 'edit' && mediaPreviews.length > 0 && (
          <div className="max-w-2xl mx-auto">
            {/* Video Preview */}
            <div className="relative bg-black aspect-[9/16] max-h-[60vh] mx-4 mt-4 rounded-2xl overflow-hidden">
              {mediaFiles[0]?.type.startsWith('video/') ? (
                <video
                  ref={videoRef}
                  src={mediaPreviews[0]}
                  className="w-full h-full object-contain"
                  style={{ filter: getFilterStyle() }}
                  loop
                  playsInline
                  muted={videoVolume === 0}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              ) : (
                <img
                  src={mediaPreviews[0]}
                  alt="Preview"
                  className="w-full h-full object-contain"
                  style={{ filter: getFilterStyle() }}
                />
              )}
              
              {/* Play/Pause Overlay */}
              <button
                className="absolute inset-0 flex items-center justify-center"
                onClick={togglePlayback}
              >
                {!isPlaying && (
                  <div className="h-16 w-16 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="h-8 w-8 text-foreground fill-foreground ml-1" />
                  </div>
                )}
              </button>
            </div>

            {/* Filters */}
            <div className="px-4 mt-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Filtros
              </h3>
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-2">
                  {videoFilters.map((filter) => (
                    <button
                      key={filter.name}
                      onClick={() => setSelectedFilter(filter)}
                      className={`flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                        selectedFilter.name === filter.name ? 'bg-primary/20 ring-2 ring-primary' : 'bg-muted/50 hover:bg-muted'
                      }`}
                    >
                      <div 
                        className="w-16 h-16 rounded-lg bg-gradient-to-br from-pink-400 to-purple-600"
                        style={{ filter: filter.style || 'none' }}
                      />
                      <span className="text-xs font-medium">{filter.name}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Adjustments */}
            <div className="px-4 mt-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Sliders className="h-4 w-4" /> Ajustes
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Brilho</span>
                    <span className="text-sm text-muted-foreground">{brightness}%</span>
                  </div>
                  <Slider
                    value={[brightness]}
                    onValueChange={([v]) => setBrightness(v)}
                    min={50}
                    max={150}
                    step={1}
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Contraste</span>
                    <span className="text-sm text-muted-foreground">{contrast}%</span>
                  </div>
                  <Slider
                    value={[contrast]}
                    onValueChange={([v]) => setContrast(v)}
                    min={50}
                    max={150}
                    step={1}
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Saturação</span>
                    <span className="text-sm text-muted-foreground">{saturation}%</span>
                  </div>
                  <Slider
                    value={[saturation]}
                    onValueChange={([v]) => setSaturation(v)}
                    min={0}
                    max={200}
                    step={1}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Music Step */}
        {step === 'music' && (
          <div className="max-w-2xl mx-auto p-4">
            {/* Video Preview */}
            <div className="relative bg-black aspect-[9/16] max-h-[50vh] rounded-2xl overflow-hidden mb-6">
              {mediaFiles[0]?.type.startsWith('video/') ? (
                <video
                  ref={videoRef}
                  src={mediaPreviews[0]}
                  className="w-full h-full object-contain"
                  style={{ filter: getFilterStyle() }}
                  loop
                  playsInline
                />
              ) : (
                <img
                  src={mediaPreviews[0]}
                  alt="Preview"
                  className="w-full h-full object-contain"
                  style={{ filter: getFilterStyle() }}
                />
              )}

              {selectedMusic && (
                <audio ref={audioRef} src={selectedMusic.url} loop />
              )}
            </div>

            {/* Music Selection */}
            <Card className="p-4">
              <button
                onClick={() => setMusicDialogOpen(true)}
                className="w-full flex items-center gap-3 p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
              >
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                  <Music className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  {selectedMusic ? (
                    <>
                      <p className="font-semibold">{selectedMusic.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedMusic.artist}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold">Adicionar música</p>
                      <p className="text-sm text-muted-foreground">Escolha uma música para o seu vídeo</p>
                    </>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>

              {selectedMusic && (
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm flex items-center gap-2">
                        <Music className="h-4 w-4" /> Volume da música
                      </span>
                      <span className="text-sm text-muted-foreground">{musicVolume}%</span>
                    </div>
                    <Slider
                      value={[musicVolume]}
                      onValueChange={([v]) => {
                        setMusicVolume(v);
                        if (audioRef.current) audioRef.current.volume = v / 100;
                      }}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm flex items-center gap-2">
                        <Volume2 className="h-4 w-4" /> Volume do vídeo
                      </span>
                      <span className="text-sm text-muted-foreground">{videoVolume}%</span>
                    </div>
                    <Slider
                      value={[videoVolume]}
                      onValueChange={([v]) => {
                        setVideoVolume(v);
                        if (videoRef.current) videoRef.current.volume = v / 100;
                      }}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setSelectedMusic(null)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remover música
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Music Dialog */}
        <Dialog open={musicDialogOpen} onOpenChange={setMusicDialogOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden p-0">
            <DialogHeader className="p-4 border-b">
              <DialogTitle>Escolher música</DialogTitle>
            </DialogHeader>
            <MusicSearch onSelect={handleMusicSelect} />
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
