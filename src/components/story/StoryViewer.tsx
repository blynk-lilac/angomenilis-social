import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, ChevronRight, ChevronLeft, Music, Eye } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { showNotification } from '@/utils/pushNotifications';
import { StoryViewersSheet } from './StoryViewersSheet';
import heartIcon from "@/assets/reactions/heart.png";
import laughingIcon from "@/assets/reactions/laughing.png";
import thumbsUpIcon from "@/assets/reactions/thumbs-up.png";
import sadIcon from "@/assets/reactions/sad.png";
import angryIcon from "@/assets/reactions/angry.png";

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  music_name?: string | null;
  music_artist?: string | null;
  profile: {
    username: string;
    first_name: string;
    avatar_url: string | null;
  };
}

interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
  onDelete?: () => void;
}

export const StoryViewer = ({ stories, initialIndex, onClose, onDelete }: StoryViewerProps) => {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [views, setViews] = useState<number>(0);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [musicCover, setMusicCover] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [viewersSheetOpen, setViewersSheetOpen] = useState(false);
  
  const currentStory = stories[currentIndex];
  const isOwnStory = currentStory.user_id === user?.id;

  useEffect(() => {
    if (!user || !currentStory) return;

    setMusicCover(null);
    setAudioEnabled(false);

    // Limpar áudio anterior completamente
    if (audio) {
      audio.pause();
      audio.src = '';
      audio.load();
      setAudio(null);
    }

    // Record view if not own story
    if (!isOwnStory) {
      recordView();
    }

    // Load view count and user reaction
    loadViewCount();
    loadUserReaction();

    // Carregar música automaticamente quando o story abre
    if (currentStory.music_name) {
      console.log('🎵 Story tem música, carregando automaticamente...');
      loadMusicData().then(async (loadedAudio) => {
        if (loadedAudio) {
          console.log('✅ Música carregada, tentando autoplay...');
          try {
            await loadedAudio.play();
            setAudioEnabled(true);
          } catch (err) {
            console.log('⚠️ Autoplay bloqueado, usuário precisa tocar para ativar:', err);
          }
        }
      });
    }

    // Auto progress - 30 segundos para todos os stories
    const duration = 30000;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + (100 / (duration / 100));
      });
    }, 100);

    return () => {
      clearInterval(interval);
      // pause seguro na troca/fecho (evita áudio continuar a tocar em background)
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [currentIndex, currentStory, user]);

  // Garantir pausa do áudio ao fechar/desmontar (sempre pega o último audio)
  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
        audio.load();
      }
    };
  }, [audio]);

  const loadMusicData = async (): Promise<HTMLAudioElement | null> => {
    try {
      if (!currentStory.music_name) {
        console.log('Story sem música definida');
        return null;
      }

      const searchQuery = `${currentStory.music_artist || ''} ${currentStory.music_name}`.trim();
      console.log('🎵 Buscando música:', searchQuery);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/music-search?query=${encodeURIComponent(searchQuery)}`,
        {
          method: 'GET',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('🎵 API retornou:', data.tracks?.length || 0, 'músicas');
      
      if (data.tracks && data.tracks.length > 0) {
        const track = data.tracks[0];
        
        if (!track.preview) {
          console.warn('❌ Música sem preview:', track.name);
          return null;
        }

        console.log('✅ Música encontrada:', track.name);
        console.log('🔗 Preview URL:', track.preview);
        
        // Criar elemento de áudio
        const newAudio = new Audio();
        newAudio.crossOrigin = "anonymous";
        newAudio.preload = "auto";
        newAudio.volume = 0.7;
        
        // Handlers de eventos
        newAudio.onloadeddata = () => {
          console.log('✅ Áudio carregado e pronto');
        };

        newAudio.onerror = (e) => {
          console.error('❌ Erro ao carregar áudio:', e);
          setAudioEnabled(false);
        };
        
        newAudio.onended = () => {
          console.log('🎵 Preview terminou');
          setAudioEnabled(false);
        };

        newAudio.onplay = () => {
          console.log('▶️ Áudio começou a tocar');
          setAudioEnabled(true);
        };

        newAudio.onpause = () => {
          console.log('⏸️ Áudio pausado');
        };

        // Carregar URL
        newAudio.src = track.preview;
        newAudio.load();
        
        setAudio(newAudio);
        
        // Armazenar capa
        if (track.cover) {
          setMusicCover(track.cover);
        }

        return newAudio;
      } else {
        console.warn('❌ Nenhuma música encontrada');
        return null;
      }
    } catch (error) {
      console.error('❌ Erro ao carregar música:', error);
      return null;
    }
  };

  const playMusic = async () => {
    console.log('🔊 Tentando tocar música...');
    
    if (!audio) {
      console.log('⚠️ Áudio não carregado, carregando agora...');
      const loadedAudio = await loadMusicData();
      
      if (!loadedAudio) {
        console.error('❌ Falha ao carregar áudio');
        toast.error('Não foi possível carregar a música');
        return;
      }
      
      // Usar o áudio recém carregado
      setAudio(loadedAudio);
      
      // Aguardar o áudio estar pronto
      if (loadedAudio.readyState < 2) {
        await new Promise<void>((resolve) => {
          loadedAudio.onloadeddata = () => resolve();
        });
      }
      
      try {
        await loadedAudio.play();
        console.log('✅ Música tocando!');
        setAudioEnabled(true);
        toast.success('🎵 Som ativado!');
      } catch (error) {
        console.error('❌ Erro ao tocar:', error);
        toast.error('Toque novamente para ativar o som');
      }
      
      return;
    }

    // Se já tem áudio carregado
    try {
      // Se estiver pausado, retomar
      if (audio.paused) {
        // Garantir que está carregado
        if (audio.readyState < 2) {
          console.log('⏳ Aguardando áudio carregar...');
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timeout')), 8000);
            
            audio.onloadeddata = () => {
              clearTimeout(timeout);
              resolve();
            };
            
            audio.onerror = () => {
              clearTimeout(timeout);
              reject(new Error('Erro ao carregar'));
            };
          });
        }
        
        await audio.play();
        console.log('✅ Música tocando!');
        setAudioEnabled(true);
        toast.success('🎵 Som ativado!');
      } else {
        // Se já está tocando, pausar
        audio.pause();
        setAudioEnabled(false);
        console.log('⏸️ Música pausada');
      }
    } catch (error) {
      console.error('❌ Erro ao tocar música:', error);
      setAudioEnabled(false);
      
      if (error instanceof Error && error.message.includes('Timeout')) {
        toast.error('Música demorou muito para carregar');
      } else {
        toast.error('Toque novamente para ativar o som');
      }
    }
  };
  const recordView = async () => {
    if (!user) return;
    
    await supabase.from('story_views').insert({
      story_id: currentStory.id,
      viewer_id: user.id,
    }).select().single();
  };

  const loadViewCount = async () => {
    const { count } = await supabase
      .from('story_views')
      .select('*', { count: 'exact', head: true })
      .eq('story_id', currentStory.id);
    
    setViews(count || 0);
  };

  const loadUserReaction = async () => {
    if (!user || isOwnStory) return;
    
    const { data } = await supabase
      .from('story_reactions')
      .select('reaction_type')
      .eq('story_id', currentStory.id)
      .eq('user_id', user.id)
      .single();
    
    setUserReaction(data?.reaction_type || null);
  };

  const handleClose = () => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    onClose();
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      handleClose();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  const handleDelete = async () => {
    if (!isOwnStory) return;

    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', currentStory.id);

      if (error) throw error;

      toast.success('Story deletada!');
      onDelete?.();
      handleClose();
    } catch (error) {
      console.error('Error deleting story:', error);
      toast.error('Erro ao deletar story');
    }
  };

  const handleReaction = async (reactionType: string) => {
    if (!user || isOwnStory) return;

    try {
      // Check if user already reacted
      if (userReaction) {
        // Delete existing reaction
        await supabase
          .from('story_reactions')
          .delete()
          .eq('story_id', currentStory.id)
          .eq('user_id', user.id);
        
        if (userReaction === reactionType) {
          setUserReaction(null);
          return;
        }
      }

      // Insert new reaction
      await supabase
        .from('story_reactions')
        .insert({
          story_id: currentStory.id,
          user_id: user.id,
          reaction_type: reactionType
        });

      setUserReaction(reactionType);

      // Create notification for story owner
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, avatar_url')
        .eq('id', user.id)
        .single();

      await supabase
        .from('notifications')
        .insert({
          user_id: currentStory.user_id,
          type: 'story_reaction',
          title: 'Nova reação no seu story',
          message: `${profile?.first_name || 'Alguém'} reagiu ao seu story`,
          related_id: currentStory.id,
          avatar_url: profile?.avatar_url
        });

      toast.success('Reação enviada!');
    } catch (error) {
      console.error('Error reacting to story:', error);
      toast.error('Erro ao reagir');
    }
  };

  const handleSendMessage = async () => {
    if (!replyText.trim() || !user || isOwnStory) return;

    try {
      // Send message to story owner
      await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: currentStory.user_id,
          content: replyText,
          message_type: 'text'
        });

      // Create notification
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, avatar_url')
        .eq('id', user.id)
        .single();

      await supabase
        .from('notifications')
        .insert({
          user_id: currentStory.user_id,
          type: 'message',
          title: 'Nova mensagem',
          message: `${profile?.first_name || 'Alguém'} respondeu ao seu story`,
          related_id: user.id,
          avatar_url: profile?.avatar_url
        });

      toast.success('Mensagem enviada!');
      setReplyText('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHrs < 1) return 'Agora';
    if (diffHrs === 1) return '1h atrás';
    return `${diffHrs}h atrás`;
  };

  return createPortal(
    <div className="fixed inset-0 bg-black z-[9999] flex items-center justify-center">
      {/* WhatsApp iPhone Style Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-neutral-950 to-black" />
      
      {/* Navigation - Left Arrow */}
      {currentIndex > 0 && (
        <button
          onClick={handlePrevious}
          className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-30 h-10 w-10 md:h-12 md:w-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all shadow-2xl"
        >
          <ChevronLeft className="h-5 w-5 md:h-6 md:w-6 text-white" />
        </button>
      )}

      {/* Navigation - Right Arrow */}
      {currentIndex < stories.length - 1 && (
        <button
          onClick={handleNext}
          className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-30 h-10 w-10 md:h-12 md:w-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all shadow-2xl"
        >
          <ChevronRight className="h-5 w-5 md:h-6 md:w-6 text-white" />
        </button>
      )}
      
      {/* WhatsApp iPhone Style Story Card - Glass Morphism */}
      <div className="relative w-full h-full md:w-[420px] md:h-[90vh] md:max-h-[800px] bg-neutral-900/90 backdrop-blur-2xl md:rounded-3xl overflow-hidden md:shadow-2xl md:border md:border-white/10">
        {/* Progress bars - WhatsApp Style */}
        <div className="absolute top-0 left-0 right-0 flex gap-1.5 px-3 pt-3 pb-2 z-20 bg-gradient-to-b from-black/60 via-black/30 to-transparent">
          {stories.map((_, idx) => (
            <div key={idx} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-100 ease-linear"
                style={{ 
                  width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%' 
                }}
              />
            </div>
          ))}
        </div>

        {/* Header - WhatsApp iPhone Style */}
        <div className="absolute top-6 left-0 right-0 flex items-center justify-between px-4 z-20">
          <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
            <Avatar className="h-11 w-11 ring-2 ring-white/30 shadow-lg flex-shrink-0">
              <AvatarImage src={currentStory.profile.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-white font-bold">
                {currentStory.profile.first_name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate drop-shadow-lg">
                {currentStory.profile.first_name}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-white/80 text-xs drop-shadow">
                  {formatTime(currentStory.created_at)}
                </p>
                {currentStory.music_name && (
                  <div className="flex items-center gap-1.5 text-white text-xs font-medium max-w-[50%] bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                    {musicCover && (
                      <img
                        src={musicCover}
                        alt={currentStory.music_name || 'Música do story'}
                        className="h-4 w-4 rounded-sm object-cover flex-shrink-0"
                      />
                    )}
                    <Music className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      {currentStory.music_artist || currentStory.music_name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Botão de Som */}
            {currentStory.music_name && !audioEnabled && (
              <Button
                variant="ghost"
                size="icon"
                onClick={playMusic}
                className="h-9 w-9 text-white hover:bg-white/20 animate-pulse rounded-full"
              >
                <Music className="h-5 w-5" />
              </Button>
            )}
            
            {isOwnStory && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewersSheetOpen(true)}
                  className="h-9 px-3 text-white hover:bg-white/20 flex items-center gap-1.5 rounded-full bg-black/30 backdrop-blur-sm"
                >
                  <Eye className="h-4 w-4" />
                  <span className="text-sm font-semibold">{views}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  className="h-9 w-9 text-white hover:bg-white/20 rounded-full"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-9 w-9 text-white hover:bg-white/20 rounded-full bg-black/30 backdrop-blur-sm"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Navigation areas - Click to play audio if blocked */}
        <div className="absolute inset-0 flex z-10">
          <button 
            onClick={(e) => {
              if (audio && audio.paused) {
                audio.play().catch(err => console.log('Failed to resume audio:', err));
              }
              handlePrevious();
            }}
            className="flex-1"
            disabled={currentIndex === 0}
          />
          <button 
            onClick={(e) => {
              if (audio && audio.paused) {
                audio.play().catch(err => console.log('Failed to resume audio:', err));
              }
              handleNext();
            }}
            className="flex-1"
          />
        </div>

        {/* Media content - Full screen with blur edge effect */}
        <div className="absolute inset-0 flex items-center justify-center">
          {currentStory.media_type === 'image' ? (
            <img
              src={currentStory.media_url}
              alt="Story"
              className="w-full h-full object-cover"
            />
          ) : currentStory.media_type === 'video' ? (
            <video
              key={currentStory.id}
              src={currentStory.media_url}
              className="w-full h-full object-cover"
              autoPlay
              muted={false}
              playsInline
              controls={false}
            />
          ) : null}
        </div>

        {/* Reply and reactions (bottom) - WhatsApp iPhone Style */}
        {!isOwnStory && (
          <div className="absolute bottom-0 left-0 right-0 p-4 pb-6 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
            <div className="flex flex-col gap-3">
              {/* Reaction buttons - Glass morphism style */}
              <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {[
                  { type: 'heart', icon: heartIcon, bg: 'bg-red-500', ring: 'ring-red-400' },
                  { type: 'thumbs-up', icon: thumbsUpIcon, bg: 'bg-blue-500', ring: 'ring-blue-400' },
                  { type: 'laughing', icon: laughingIcon, bg: 'bg-yellow-500', ring: 'ring-yellow-400' },
                  { type: 'sad', icon: sadIcon, bg: 'bg-blue-400', ring: 'ring-blue-300' },
                  { type: 'angry', icon: angryIcon, bg: 'bg-orange-500', ring: 'ring-orange-400' },
                ].map(({ type, icon, bg, ring }) => (
                  <button
                    key={type}
                    onClick={() => handleReaction(type)}
                    className={`flex-shrink-0 h-12 w-12 rounded-2xl backdrop-blur-xl flex items-center justify-center transition-all hover:scale-110 shadow-xl border ${
                      userReaction === type 
                        ? `${bg} ring-2 ${ring} border-transparent` 
                        : 'bg-white/10 border-white/20 hover:bg-white/20'
                    }`}
                  >
                    <img src={icon} alt={type} className="h-7 w-7" />
                  </button>
                ))}
                {/* Emoji reactions */}
                {[
                  { type: 'fire', emoji: '🔥', bg: 'bg-orange-600', ring: 'ring-orange-500' },
                  { type: 'clap', emoji: '👏', bg: 'bg-yellow-400', ring: 'ring-yellow-300' },
                  { type: 'love', emoji: '😍', bg: 'bg-pink-500', ring: 'ring-pink-400' },
                ].map(({ type, emoji, bg, ring }) => (
                  <button
                    key={type}
                    onClick={() => handleReaction(type)}
                    className={`flex-shrink-0 h-12 w-12 rounded-2xl backdrop-blur-xl flex items-center justify-center transition-all hover:scale-110 shadow-xl border ${
                      userReaction === type 
                        ? `${bg} ring-2 ${ring} border-transparent` 
                        : 'bg-white/10 border-white/20 hover:bg-white/20'
                    }`}
                  >
                    <span className="text-2xl">{emoji}</span>
                  </button>
                ))}
              </div>

              {/* Reply input - Glass morphism */}
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xl rounded-2xl px-4 py-3 border border-white/20 shadow-xl">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Enviar mensagem..."
                  className="flex-1 bg-transparent text-white placeholder-white/60 outline-none text-sm"
                />
                {replyText.trim() && (
                  <button
                    onClick={handleSendMessage}
                    className="h-8 w-8 rounded-full bg-primary flex items-center justify-center transition-transform hover:scale-105"
                  >
                    <ChevronRight className="h-5 w-5 text-primary-foreground" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Story Viewers Sheet */}
      <StoryViewersSheet
        open={viewersSheetOpen}
        onOpenChange={setViewersSheetOpen}
        storyId={currentStory.id}
        viewCount={views}
      />
    </div>,
    document.body
  );
};