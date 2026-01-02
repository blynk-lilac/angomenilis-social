import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import VerificationBadge from "./VerificationBadge";
import { TranslateButton } from "./TranslateButton";
import { useState, useRef, useEffect } from "react";
import { Play, Pause, ThumbsUp, Heart } from "lucide-react";

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
    <div className="flex items-center gap-2 bg-muted rounded-2xl px-3 py-2 min-w-[200px] max-w-[260px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlay}
        className="h-9 w-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 flex-shrink-0"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </Button>
      <div className="flex-1 flex flex-col gap-0.5">
        {/* Waveform visualization */}
        <div className="flex items-center gap-[2px] h-6">
          {Array.from({ length: 20 }).map((_, i) => {
            const height = Math.random() * 100;
            const isActive = (i / 20) * 100 <= progress;
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-colors ${
                  isActive ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
                style={{ height: `${Math.max(20, height)}%` }}
              />
            );
          })}
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
    <div className={`flex gap-2 ${isReply ? "ml-10 mt-3" : ""}`}>
      <Avatar 
        className={`${isReply ? 'h-8 w-8' : 'h-10 w-10'} flex-shrink-0 cursor-pointer ring-2 ring-transparent hover:ring-primary/20 transition-all`}
        onClick={handleProfileClick}
      >
        <AvatarImage src={comment.profiles.avatar_url} />
        <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-sm font-semibold">
          {comment.profiles.username?.[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        {/* Comment Bubble - Facebook Style */}
        <div className="relative inline-block max-w-[90%]">
          <div className="bg-muted rounded-2xl px-3 py-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span 
                className="font-bold text-[13px] cursor-pointer hover:underline"
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

          {/* Reaction bubble on comment - Facebook style */}
          {likesCount > 0 && (
            <div className="absolute -bottom-1 -right-1 flex items-center gap-0.5 bg-card shadow-md rounded-full px-1.5 py-0.5 border border-border/50">
              <div className="flex -space-x-1">
                <div className="h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center border border-card">
                  <ThumbsUp className="h-2 w-2 text-white fill-white" />
                </div>
                {likesCount > 1 && (
                  <div className="h-4 w-4 rounded-full bg-red-500 flex items-center justify-center border border-card">
                    <Heart className="h-2 w-2 text-white fill-white" />
                  </div>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">{likesCount}</span>
            </div>
          )}
        </div>

        {/* Actions - Facebook Style */}
        <div className="flex items-center gap-4 mt-1 px-1">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), {
              addSuffix: false,
              locale: ptBR,
            }).replace('cerca de ', '')}
          </span>
          <button
            onClick={() => onLike(comment.id)}
            className={`text-xs font-bold hover:underline transition-colors ${
              comment.user_liked ? "text-blue-500" : "text-muted-foreground"
            }`}
          >
            Gosto
          </button>
          <button
            onClick={() => onReply(comment.id)}
            className="text-xs font-bold text-muted-foreground hover:underline"
          >
            Responder
          </button>
        </div>

        {/* Reply link */}
        {comment.replies && comment.replies.length > 0 && !isReply && (
          <div className="mt-2 ml-1">
            <span className="text-xs text-primary font-semibold">
              {comment.profiles.username} respondeu · {comment.replies.length} resposta{comment.replies.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 space-y-3">
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