import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import VerificationBadge from "./VerificationBadge";
import { TranslateButton } from "./TranslateButton";
import { useState } from "react";

interface CommentCardProps {
  comment: {
    id: string;
    content: string;
    created_at: string;
    audio_url?: string;
    profiles: {
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

export const CommentCard = ({ comment, onLike, onReply, isReply = false }: CommentCardProps) => {
  const navigate = useNavigate();
  const likesCount = comment.likes[0]?.count || 0;
  const [translatedContent, setTranslatedContent] = useState(comment.content);

  return (
    <div className={`flex gap-2 ${isReply ? "ml-12 mt-2" : ""}`}>
      <Avatar 
        className="h-10 w-10 flex-shrink-0 cursor-pointer"
        onClick={() => navigate(`/profile/${comment.profiles.username}`)}
      >
        <AvatarImage src={comment.profiles.avatar_url} />
        <AvatarFallback className="bg-muted text-sm">
          {comment.profiles.username?.[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        {/* Comment Bubble */}
        <div className="bg-muted rounded-2xl px-3 py-2 inline-block max-w-[85%]">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span 
              className="font-semibold text-[13px] cursor-pointer hover:underline"
              onClick={() => navigate(`/profile/${comment.profiles.username}`)}
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
            <audio controls className="max-w-full h-8 mt-1" src={comment.audio_url} />
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
            className={`text-xs font-semibold hover:underline ${
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
