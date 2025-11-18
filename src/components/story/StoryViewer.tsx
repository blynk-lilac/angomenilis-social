import { useState, useEffect } from 'react';
import { X, Trash2, Heart } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  created_at: string;
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
  
  const currentStory = stories[currentIndex];
  const isOwnStory = currentStory.user_id === user?.id;

  useEffect(() => {
    if (!user || !currentStory) return;

    // Record view if not own story
    if (!isOwnStory) {
      recordView();
    }

    // Load view count
    loadViewCount();

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

    return () => clearInterval(interval);
  }, [currentIndex, currentStory]);

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
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-white">
            <AvatarImage src={currentStory.profile.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {currentStory.profile.first_name[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white font-semibold text-sm">
              {currentStory.profile.first_name}
            </p>
            <p className="text-white/80 text-xs">
              {formatTime(currentStory.created_at)}
            </p>
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
        ) : (
          <video
            src={currentStory.media_url}
            className="max-w-full max-h-full object-contain"
            autoPlay
            loop
            playsInline
          />
        )}
      </div>

      {/* Reply button (bottom) */}
      {!isOwnStory && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full p-3">
            <input
              type="text"
              placeholder="Responder"
              className="flex-1 bg-transparent text-white placeholder-white/60 outline-none"
            />
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20 rounded-full"
            >
              <Heart className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};