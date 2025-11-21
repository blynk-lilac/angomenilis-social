import { useState, useEffect } from 'react';
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
  
  const currentStory = stories[currentIndex];
  const isOwnStory = currentStory.user_id === user?.id;

  useEffect(() => {
    if (!user || !currentStory) return;

    setMusicCover(null);

    // Record view if not own story
    if (!isOwnStory) {
      recordView();
    }

    // Load view count and user reaction
    loadViewCount();
    loadUserReaction();

    // Play music if available
    if (currentStory.music_name) {
      playMusic();
    }

    // Auto progress
    const duration = currentStory.media_type === 'video' ? 15000 : 5000;
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

  const playMusic = async () => {
    try {
      // Stop previous audio if playing
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }

      // Try to play preview from iTunes
      const searchQuery = `${currentStory.music_artist} ${currentStory.music_name}`;
      const response = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&media=music&entity=song&limit=1&country=AO`
      );
      const data = await response.json();

      if (data.results && data.results[0]?.previewUrl) {
        const track = data.results[0];
        const newAudio = new Audio(track.previewUrl);
        newAudio.volume = 0.5;
        newAudio.play().catch(err => console.log('Audio play failed:', err));
        setAudio(newAudio);

        const cover = track.artworkUrl100?.replace('100x100', '300x300') || track.artworkUrl60?.replace('60x60', '300x300');
        if (cover) {
          setMusicCover(cover);
        }
      }
    } catch (error) {
      console.log('Could not play music:', error);
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
        .select('first_name')
        .eq('id', user.id)
        .single();

      await supabase
        .from('notifications')
        .insert({
          user_id: currentStory.user_id,
          type: 'story_reaction',
          title: 'Nova reação no seu story',
          message: `${profile?.first_name || 'Alguém'} reagiu ao seu story`,
          related_id: currentStory.id
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
        .select('first_name')
        .eq('id', user.id)
        .single();

      await supabase
        .from('notifications')
        .insert({
          user_id: currentStory.user_id,
          type: 'message',
          title: 'Nova mensagem',
          message: `${profile?.first_name || 'Alguém'} respondeu ao seu story`,
          related_id: user.id
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

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Navigation - Left Arrow */}
      {currentIndex > 0 && (
        <button
          onClick={handlePrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-14 w-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-all"
        >
          <ChevronLeft className="h-8 w-8 text-white" />
        </button>
      )}

      {/* Navigation - Right Arrow */}
      {currentIndex < stories.length - 1 && (
        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-14 w-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-all"
        >
          <ChevronRight className="h-8 w-8 text-white" />
        </button>
      )}
      
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
        {stories.map((_, idx) => (
          <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-100"
              style={{ 
                width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%' 
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
          <Avatar className="h-10 w-10 border-2 border-white flex-shrink-0">
            <AvatarImage src={currentStory.profile.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {currentStory.profile.first_name[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base truncate">
              {currentStory.profile.first_name}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-white/90 text-xs">
                {formatTime(currentStory.created_at)}
              </p>
              {currentStory.music_name && (
                <div className="flex items-center gap-1 text-white text-xs font-medium max-w-[55%]">
                  {musicCover && (
                    <img
                      src={musicCover}
                      alt={currentStory.music_name || 'Música do story'}
                      className="h-5 w-5 rounded-sm object-cover flex-shrink-0"
                    />
                  )}
                  <Music className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">
                    {currentStory.music_artist || currentStory.music_name}
                  </span>
                  <ChevronRight className="h-3 w-3 flex-shrink-0" />
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isOwnStory && (
            <>
              <span className="text-white text-sm">{views} visualizações</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="text-white hover:bg-white/20"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Navigation areas */}
      <div className="absolute inset-0 flex">
        <button 
          onClick={handlePrevious}
          className="flex-1"
          disabled={currentIndex === 0}
        />
        <button 
          onClick={handleNext}
          className="flex-1"
        />
      </div>

      {/* Media content */}
      <div className="relative w-full h-full flex items-center justify-center">
        {currentStory.media_type === 'image' ? (
          <img
            src={currentStory.media_url}
            alt="Story"
            className="max-w-full max-h-full object-contain"
          />
        ) : currentStory.media_type === 'video' ? (
          <video
            key={currentStory.id}
            src={currentStory.media_url}
            className="max-w-full max-h-full object-contain"
            autoPlay
            muted={false}
            playsInline
            controls={false}
          />
        ) : null}
      </div>

      {/* Reply and reactions (bottom) */}
      {!isOwnStory && (
        <div className="absolute bottom-6 left-4 right-4 z-10">
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-4 py-3 border border-white/10">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Enviar mensagem..."
                className="flex-1 bg-transparent text-white placeholder-white/60 outline-none text-sm"
              />
            </div>
            
            {/* Reaction buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleReaction('heart')}
                className={`h-12 w-12 rounded-full backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 ${
                  userReaction === 'heart' ? 'bg-red-500/80' : 'bg-black/60 border border-white/10'
                }`}
              >
                <img src={heartIcon} alt="Heart" className="h-6 w-6" />
              </button>
              
              <button
                onClick={() => handleReaction('thumbs-up')}
                className={`h-12 w-12 rounded-full backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 ${
                  userReaction === 'thumbs-up' ? 'bg-blue-500/80' : 'bg-black/60 border border-white/10'
                }`}
              >
                <img src={thumbsUpIcon} alt="Like" className="h-6 w-6" />
              </button>
              
              <button
                onClick={() => handleReaction('laughing')}
                className={`h-12 w-12 rounded-full backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 ${
                  userReaction === 'laughing' ? 'bg-yellow-500/80' : 'bg-black/60 border border-white/10'
                }`}
              >
                <img src={laughingIcon} alt="Laughing" className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};