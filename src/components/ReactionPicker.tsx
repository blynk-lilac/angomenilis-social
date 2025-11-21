import { useState, useEffect } from "react";
import heartIcon from "@/assets/reactions/heart.png";
import laughingIcon from "@/assets/reactions/laughing.png";
import sadIcon from "@/assets/reactions/sad.png";
import angryIcon from "@/assets/reactions/angry.png";
import thumbsUpIcon from "@/assets/reactions/thumbs-up.png";

interface ReactionPickerProps {
  onSelect: (reaction: string) => void;
  onClose: () => void;
  show: boolean;
}

const REACTIONS = [
  { emoji: "❤️", icon: thumbsUpIcon, label: "Gosto" },
  { emoji: "😂", icon: heartIcon, label: "Adoro" },
  { emoji: "😮", icon: laughingIcon, label: "Risos" },
  { emoji: "😢", icon: sadIcon, label: "Triste" },
  { emoji: "😡", icon: angryIcon, label: "Grr" },
];

export default function ReactionPicker({ onSelect, onClose, show }: ReactionPickerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [show]);

  if (!show) return null;

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setIsVisible(false);
    setTimeout(onClose, 150);
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      <div 
        className={`absolute bottom-full left-0 mb-2 transition-all duration-200 z-50 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
      >
        <div className="bg-card border border-border rounded-full shadow-2xl px-2 py-2 flex items-center gap-1">
          {REACTIONS.map(({ emoji, icon, label }) => (
            <button
              key={emoji}
              onClick={() => handleSelect(emoji)}
              className="group relative hover:scale-125 transition-transform"
              title={label}
            >
              <img 
                src={icon} 
                alt={label} 
                className="w-10 h-10 hover:scale-110 transition-transform"
              />
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}