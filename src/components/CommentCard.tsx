import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import VerificationBadge from "./VerificationBadge";
import { TranslateButton } from "./TranslateButton";
import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface CommentCardProps {
  comment: {
    id: string;
    content: string;
    created_at: string;
    audio_url?: string;
    profiles: {
      id?: string;
      username: string;
      avatar_url: string;
      verified?: boolean;
      badge_type?: string | null;
    };
    likes: { count: number }[];
    user_liked?: boolean;
    replies?: any[];
  };
  onLike: (commentId: string) => void;
  onReply: (commentId: string) => void;
  isReply?: boolean;
}

const AudioPlayer = ({ src }: { src: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 bg-primary/10 rounded-full px-3 py-2 min-w-[180px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlay}
        className="h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 flex-shrink-0"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </Button>
      <div className="flex-1 flex flex-col gap-1">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground">
          {formatTime(audioRef.current?.currentTime || 0)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
};

export const CommentCard = ({ comment, onLike, onReply, isReply = false }: CommentCardProps) => {
  const navigate = useNavigate();
  const likesCount = comment.likes[0]?.count || 0;
  const [translatedContent, setTranslatedContent] = useState(comment.content);

  const handleProfileClick = () => {
    if (comment.profiles.id) {
      navigate(`/profile/${comment.profiles.id}`);
    } else {
      navigate(`/profile/${comment.profiles.username}`);
    }
  };

  return (
    <div className={`flex gap-2 ${isReply ? "ml-12 mt-2" : ""}`}>
      <Avatar 
        className="h-10 w-10 flex-shrink-0 cursor-pointer ring-2 ring-transparent hover:ring-primary/20 transition-all"
        onClick={handleProfileClick}
      >
        <AvatarImage src={comment.profiles.avatar_url} />
        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-sm font-semibold">
          {comment.profiles.username?.[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        {/* Comment Bubble */}
        <div className="bg-muted/80 backdrop-blur-sm rounded-2xl px-3 py-2 inline-block max-w-[85%]">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span 
              className="font-semibold text-[13px] cursor-pointer hover:underline"
              onClick={handleProfileClick}
            >
              {comment.profiles.username}
            </span>
            {comment.profiles.verified && (
              <VerificationBadge
                verified={comment.profiles.verified}
                badgeType={comment.profiles.badge_type}
                className="w-3.5 h-3.5"
              />
            )}
          </div>
          
          {comment.audio_url ? (
            <AudioPlayer src={comment.audio_url} />
          ) : (
            <>
              <p className="text-[15px] text-foreground break-words leading-snug">
                {translatedContent}
              </p>
              {!isReply && (
                <div className="mt-1">
                  <TranslateButton 
                    text={comment.content} 
                    onTranslated={setTranslatedContent}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-1 px-3">
          <button
            onClick={() => onLike(comment.id)}
            className={`text-xs font-semibold hover:underline transition-colors ${
              comment.user_liked ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Gosto
            {likesCount > 0 && ` · ${likesCount}`}
          </button>
          <button
            onClick={() => onReply(comment.id)}
            className="text-xs font-semibold text-muted-foreground hover:underline"
          >
            Responder
          </button>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), {
              addSuffix: false,
              locale: ptBR,
            }).replace('cerca de ', '')}
          </span>
        </div>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 space-y-2">
            {comment.replies.map((reply: any) => (
              <CommentCard
                key={reply.id}
                comment={reply}
                onLike={onLike}
                onReply={onReply}
                isReply={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};