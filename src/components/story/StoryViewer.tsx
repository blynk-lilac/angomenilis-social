import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, ChevronRight, ChevronLeft, Music } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { showNotification } from '@/utils/pushNotifications';
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
  
  const currentStory = stories[currentIndex];
  const isOwnStory = currentStory.user_id === user?.id;

  useEffect(() => {
    if (!user || !currentStory) return;

    setMusicCover(null);
    setAudioEnabled(false);

    // Record view if not own story
    if (!isOwnStory) {
      recordView();
    }

    // Load view count and user reaction
    loadViewCount();
    loadUserReaction();

    // Carregar dados da música quando o story abre
    if (currentStory.music_name) {
      loadMusicData();
    }

    // Auto progress - 10 segundos para todos os tipos
    const duration = 10000;
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
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [currentIndex, currentStory, user]);

  const loadMusicData = async (): Promise<HTMLAudioElement | null> => {
    try {
      // Parar áudio anterior se estiver a tocar
      if (audio) {
        audio.pause();
        audio.src = '';
        setAudio(null);
      }

      if (!currentStory.music_name) {
        console.log('Story sem música definida');
        return null;
      }

      const searchQuery = `${currentStory.music_artist || ''} ${currentStory.music_name}`.trim();
      console.log('Loading music data for:', searchQuery);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/music-search?query=${encodeURIComponent(searchQuery)}`
      );
      
      const data = await response.json();
      
      if (data.tracks && data.tracks.length > 0) {
        const track = data.tracks[0];
        console.log('Found track with preview:', track.preview);
        
        let newAudio: HTMLAudioElement | null = null;

        // Preparar o áudio mas não tocar ainda (preview de 30s do Deezer)
        if (track.preview) {
          newAudio = new Audio(track.preview);
          newAudio.volume = 0.7;
          newAudio.loop = false; // Preview de 30s não deve dar loop
          
          // Event listener para quando o preview acabar
          newAudio.addEventListener('ended', () => {
            console.log('Preview de 30s terminou');
            setAudioEnabled(false);
          });

          setAudio(newAudio);
          console.log('Audio preparado, pronto para tocar');
        }

        // Armazenar informações da música
        if (track.name && track.artist) {
          console.log('Music info:', { name: track.name, artist: track.artist });
        }

        // Armazenar capa do álbum
        if (track.cover) {
          setMusicCover(track.cover);
        }

        return newAudio;
      } else {
        console.log('No tracks found for query:', searchQuery);
        toast.error('Música não encontrada');
      }
    } catch (error) {
      console.error('Could not load music data:', error);
      toast.error('Erro ao carregar música');
    }

    return null;
  };

  const playMusic = async () => {
    let audioToPlay = audio;

    if (!audioToPlay) {
      toast.error('Música não carregada. A tentar novamente...');
      audioToPlay = await loadMusicData();
      if (!audioToPlay) return;
    }

    try {
      await audioToPlay.play();
      console.log('Audio playing successfully');
      setAudioEnabled(true);
      toast.success('Som ativado!');
    } catch (playError) {
      console.error('Failed to play audio:', playError);
      setAudioEnabled(false);
      toast.error('Erro ao tocar a música. Tente novamente.');
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

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
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
      onClose();
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
    <div className="fixed inset-0 bg-background z-[9999]">
      {/* Navigation - Left Arrow */}
      {currentIndex > 0 && (
        <button
          onClick={handlePrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-all shadow-lg"
        >
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </button>
      )}

      {/* Navigation - Right Arrow */}
      {currentIndex < stories.length - 1 && (
        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-all shadow-lg"
        >
          <ChevronRight className="h-6 w-6 text-foreground" />
        </button>
      )}
      
      {/* Story Card Container */}
      <div className="relative w-full h-full bg-card overflow-hidden">
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 flex gap-1 p-3 z-10">
          {stories.map((_, idx) => (
            <div key={idx} className="flex-1 h-1 bg-muted/40 rounded-full overflow-hidden">
              <div 
                className="h-full bg-foreground transition-all duration-100"
                style={{ 
                  width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%' 
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-4 pb-2 z-10 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
            <Avatar className="h-10 w-10 border-2 border-background flex-shrink-0">
              <AvatarImage src={currentStory.profile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {currentStory.profile.first_name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-background font-bold text-sm truncate">
                {currentStory.profile.first_name}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-background/90 text-xs">
                  {formatTime(currentStory.created_at)}
                </p>
                {currentStory.music_name && (
                  <div className="flex items-center gap-1 text-background text-xs font-medium max-w-[45%]">
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
                className="h-9 w-9 text-background hover:bg-background/20 animate-pulse"
              >
                <Music className="h-5 w-5" />
              </Button>
            )}
            
            {isOwnStory && (
              <>
                <span className="text-background text-xs mr-1">{views}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  className="h-9 w-9 text-background hover:bg-background/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9 text-background hover:bg-background/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Navigation areas - Click to play audio if blocked */}
        <div className="absolute inset-0 flex">
          <button 
            onClick={(e) => {
              // Tentar reproduzir áudio se foi bloqueado
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
              // Tentar reproduzir áudio se foi bloqueado
              if (audio && audio.paused) {
                audio.play().catch(err => console.log('Failed to resume audio:', err));
              }
              handleNext();
            }}
            className="flex-1"
          />
        </div>

        {/* Media content */}
        <div className="relative w-full h-full flex items-center justify-center bg-muted/40">
          <div className="relative max-w-[420px] w-full aspect-[9/16] rounded-2xl overflow-hidden bg-background shadow-2xl flex items-center justify-center">
            {currentStory.media_type === 'image' ? (
              <img
                src={currentStory.media_url}
                alt="Story"
                className="w-full h-full object-contain"
              />
            ) : currentStory.media_type === 'video' ? (
              <video
                key={currentStory.id}
                src={currentStory.media_url}
                className="w-full h-full object-contain"
                autoPlay
                muted={false}
                playsInline
                controls={false}
              />
            ) : null}
          </div>
          
          {/* Botão grande de ativar som no centro */}
          {currentStory.music_name && !audioEnabled && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <Button
                size="lg"
                onClick={playMusic}
                className="pointer-events-auto h-20 w-20 rounded-full bg-background/90 hover:bg-background shadow-2xl animate-pulse"
              >
                <Music className="h-10 w-10 text-foreground" />
              </Button>
            </div>
          )}
        </div>

        {/* Reply and reactions (bottom) */}
        {!isOwnStory && (
          <div className="absolute bottom-0 left-0 right-0 p-4 z-10 bg-gradient-to-t from-black/60 to-transparent">
            <div className="flex flex-col gap-3">
              {/* Reaction buttons with horizontal scroll */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  onClick={() => handleReaction('heart')}
                  className={`flex-shrink-0 h-11 w-11 rounded-full backdrop-blur-md flex items-center justify-center transition-all hover:scale-105 shadow-md ${
                    userReaction === 'heart' ? 'bg-red-500 ring-2 ring-red-400' : 'bg-background/90 border border-border/50'
                  }`}
                >
                  <img src={heartIcon} alt="Heart" className="h-6 w-6" />
                </button>
                
                <button
                  onClick={() => handleReaction('thumbs-up')}
                  className={`flex-shrink-0 h-11 w-11 rounded-full backdrop-blur-md flex items-center justify-center transition-all hover:scale-105 shadow-md ${
                    userReaction === 'thumbs-up' ? 'bg-blue-500 ring-2 ring-blue-400' : 'bg-background/90 border border-border/50'
                  }`}
                >
                  <img src={thumbsUpIcon} alt="Like" className="h-6 w-6" />
                </button>
                
                <button
                  onClick={() => handleReaction('laughing')}
                  className={`flex-shrink-0 h-11 w-11 rounded-full backdrop-blur-md flex items-center justify-center transition-all hover:scale-105 shadow-md ${
                    userReaction === 'laughing' ? 'bg-yellow-500 ring-2 ring-yellow-400' : 'bg-background/90 border border-border/50'
                  }`}
                >
                  <img src={laughingIcon} alt="Laughing" className="h-6 w-6" />
                </button>

                <button
                  onClick={() => handleReaction('sad')}
                  className={`flex-shrink-0 h-11 w-11 rounded-full backdrop-blur-md flex items-center justify-center transition-all hover:scale-105 shadow-md ${
                    userReaction === 'sad' ? 'bg-blue-400 ring-2 ring-blue-300' : 'bg-background/90 border border-border/50'
                  }`}
                >
                  <img src={sadIcon} alt="Sad" className="h-6 w-6" />
                </button>

                <button
                  onClick={() => handleReaction('angry')}
                  className={`flex-shrink-0 h-11 w-11 rounded-full backdrop-blur-md flex items-center justify-center transition-all hover:scale-105 shadow-md ${
                    userReaction === 'angry' ? 'bg-orange-500 ring-2 ring-orange-400' : 'bg-background/90 border border-border/50'
                  }`}
                >
                  <img src={angryIcon} alt="Angry" className="h-6 w-6" />
                </button>

                <button
                  onClick={() => handleReaction('fire')}
                  className={`flex-shrink-0 h-11 w-11 rounded-full backdrop-blur-md flex items-center justify-center transition-all hover:scale-105 shadow-md ${
                    userReaction === 'fire' ? 'bg-orange-600 ring-2 ring-orange-500' : 'bg-background/90 border border-border/50'
                  }`}
                >
                  <span className="text-2xl">🔥</span>
                </button>

                <button
                  onClick={() => handleReaction('clap')}
                  className={`flex-shrink-0 h-11 w-11 rounded-full backdrop-blur-md flex items-center justify-center transition-all hover:scale-105 shadow-md ${
                    userReaction === 'clap' ? 'bg-yellow-400 ring-2 ring-yellow-300' : 'bg-background/90 border border-border/50'
                  }`}
                >
                  <span className="text-2xl">👏</span>
                </button>

                <button
                  onClick={() => handleReaction('love')}
                  className={`flex-shrink-0 h-11 w-11 rounded-full backdrop-blur-md flex items-center justify-center transition-all hover:scale-105 shadow-md ${
                    userReaction === 'love' ? 'bg-pink-500 ring-2 ring-pink-400' : 'bg-background/90 border border-border/50'
                  }`}
                >
                  <span className="text-2xl">😍</span>
                </button>
              </div>

              {/* Reply input */}
              <div className="flex items-center gap-2 bg-background/90 backdrop-blur-md rounded-full px-4 py-2.5 border border-border/50 shadow-lg">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Enviar mensagem..."
                  className="flex-1 bg-transparent text-foreground placeholder-muted-foreground outline-none text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};