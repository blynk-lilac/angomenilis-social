import { useState, useEffect } from 'react';
import { Copy, Share2, Reply as ReplyIcon, AlertTriangle, Trash2 } from 'lucide-react';
import heartIcon from '@/assets/reactions/heart.png';
import laughingIcon from '@/assets/reactions/laughing.png';
import angryIcon from '@/assets/reactions/angry.png';
import sadIcon from '@/assets/reactions/sad.png';
import thumbsUpIcon from '@/assets/reactions/thumbs-up.png';

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  position: { x: number; y: number };
  currentReaction?: string;
  onCopy?: () => void;
  onForward?: () => void;
  onReply?: () => void;
  onReport?: () => void;
  onDelete?: () => void;
}

const REACTIONS = [
  { emoji: '❤️', icon: heartIcon },
  { emoji: '😂', icon: laughingIcon },
  { emoji: '😮', icon: angryIcon },
  { emoji: '😢', icon: sadIcon },
  { emoji: '👍', icon: thumbsUpIcon },
];

export const ReactionPicker = ({ onSelect, onClose, position, currentReaction, onCopy, onForward, onReply, onReport, onDelete }: ReactionPickerProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    setTimeout(() => setVisible(true), 10);
  }, []);

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setVisible(false);
    setTimeout(onClose, 200);
  };

  return (
    <>
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 z-50 backdrop-blur-md bg-black/30 animate-fade-in"
        onClick={onClose}
      />
      
      {/* Reaction picker */}
      <div
        className={`fixed z-50 transition-all duration-300 ${
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}
        style={{
          left: '50%',
          top: '96px',
          transform: 'translateX(-50%)',
        }}
      >
        <div className="bg-card rounded-full shadow-2xl border border-border px-4 py-2 flex gap-2 justify-center items-center animate-bounce-in">
          {REACTIONS.map((reaction) => (
            <button
              key={reaction.emoji}
              onClick={() => handleSelect(reaction.emoji)}
              className={`
                relative h-12 w-12 rounded-full flex items-center justify-center
                transition-all duration-200 hover:scale-125 active:scale-95
                ${currentReaction === reaction.emoji ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-muted'}
              `}
            >
              <img
                src={reaction.icon}
                alt={reaction.emoji}
                className="h-8 w-8 object-contain"
              />
              {currentReaction === reaction.emoji && (
                <div className="absolute -bottom-1 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-3 bg-card rounded-2xl shadow-xl border border-border py-1">
          <button
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-accent transition-colors"
            onClick={() => {
              onCopy?.();
              onClose();
            }}
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <Copy className="h-4 w-4" />
            </span>
            <span>Copiar</span>
          </button>

          <button
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-accent transition-colors"
            onClick={() => {
              onForward?.();
              onClose();
            }}
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <Share2 className="h-4 w-4" />
            </span>
            <span>Reencaminhar</span>
          </button>

          <button
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-accent transition-colors"
            onClick={() => {
              onReply?.();
              onClose();
            }}
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <ReplyIcon className="h-4 w-4" />
            </span>
            <span>Responder</span>
          </button>

          <button
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-accent transition-colors"
            onClick={() => {
              onReport?.();
              onClose();
            }}
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <span>Denunciar</span>
          </button>

          <button
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-accent transition-colors text-destructive"
            onClick={() => {
              onDelete?.();
              onClose();
            }}
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <Trash2 className="h-4 w-4" />
            </span>
            <span>Eliminar para mim</span>
          </button>
        </div>
      </div>
    </>
  );
};
