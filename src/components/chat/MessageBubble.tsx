import { format } from 'date-fns';
import { Play } from 'lucide-react';

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
}

export default function MessageBubble({ message, isSent }: MessageBubbleProps) {
  const renderMedia = () => {
    if (message.message_type === 'image' && message.media_url) {
      return (
        <img
          src={message.media_url}
          alt="Imagem"
          className="max-w-xs rounded-lg mb-1"
        />
      );
    }

    if (message.message_type === 'video' && message.media_url) {
      return (
        <video
          src={message.media_url}
          controls
          className="max-w-xs rounded-lg mb-1"
        />
      );
    }

    if (message.message_type === 'audio' && message.media_url) {
      return (
        <div className="flex items-center gap-2 mb-1">
          <Play className="h-4 w-4" />
          <audio src={message.media_url} controls className="max-w-[200px]" />
          {message.duration && (
            <span className="text-xs">{message.duration}s</span>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className={`max-w-[75%] rounded-2xl px-4 py-2 ${
        isSent
          ? 'bg-chat-sent text-foreground rounded-br-sm'
          : 'bg-chat-received text-foreground rounded-bl-sm'
      }`}
    >
      {renderMedia()}
      {message.content && (
        <p className="text-sm break-words">{message.content}</p>
      )}
      <p className="text-xs text-muted-foreground mt-1">
        {format(new Date(message.created_at), 'HH:mm')}
      </p>
    </div>
  );
}
