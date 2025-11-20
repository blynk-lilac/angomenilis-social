import { useState, useEffect } from 'react';
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
}

const REACTIONS = [
  { emoji: '❤️', icon: heartIcon },
  { emoji: '😂', icon: laughingIcon },
  { emoji: '😮', icon: angryIcon },
  { emoji: '😢', icon: sadIcon },
  { emoji: '👍', icon: thumbsUpIcon },
];

export const ReactionPicker = ({ onSelect, onClose, position, currentReaction }: ReactionPickerProps) => {
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
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -100%) translateY(-16px)',
        }}
      >
        <div className="bg-card rounded-full shadow-2xl border border-border p-2 flex gap-1 animate-bounce-in">
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
      </div>
    </>
  );
};
