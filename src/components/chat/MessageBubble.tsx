import { format } from 'date-fns';
import { Play, ImageOff } from 'lucide-react';

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    message_type?: string;
    media_url?: string;
    duration?: number;
  };
  isSent: boolean;
  hideMedia?: boolean;
}

export default function MessageBubble({ message, isSent, hideMedia = false }: MessageBubbleProps) {
  const renderMedia = () => {
    // If media visibility is disabled, show placeholder
    if (hideMedia && (message.message_type === 'image' || message.message_type === 'video')) {
      return (
        <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl mb-2">
          <ImageOff className="h-5 w-5 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            Mídia oculta por configurações de privacidade
          </div>
        </div>
      );
    }

    if (message.message_type === 'image' && message.media_url) {
      return (
        <img
          src={message.media_url}
          alt="Imagem"
          className="max-w-sm rounded-xl mb-2 hover:scale-[1.02] transition-transform cursor-pointer"
        />
      );
    }

    if (message.message_type === 'video' && message.media_url) {
      return (
        <video
          src={message.media_url}
          controls
          className="max-w-sm rounded-xl mb-2"
        />
      );
    }

    if (message.message_type === 'audio' && message.media_url) {
      return (
        <div className="flex items-center gap-3 mb-2 p-2 bg-background/50 rounded-lg">
          <Play className="h-5 w-5" />
          <audio src={message.media_url} controls className="max-w-[250px]" />
          {message.duration && (
            <span className="text-sm">{message.duration}s</span>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm transition-all hover:shadow-md ${
        isSent
          ? 'bg-primary/10 text-foreground rounded-br-sm'
          : 'bg-card text-foreground rounded-bl-sm'
      }`}
    >
      {renderMedia()}
      {message.content && (
        <p className="text-base break-words leading-relaxed">{message.content}</p>
      )}
      <p className="text-[11px] text-muted-foreground/70 mt-1">
        {format(new Date(message.created_at), 'HH:mm')}
      </p>
    </div>
  );
}
