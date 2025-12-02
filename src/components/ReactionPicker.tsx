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

export const reactions = [
  { type: "heart", icon: heartIcon, label: "Adoro" },
  { type: "laughing", icon: laughingIcon, label: "Risos" },
  { type: "sad", icon: sadIcon, label: "Triste" },
  { type: "angry", icon: angryIcon, label: "Grr" },
  { type: "thumbs-up", icon: thumbsUpIcon, label: "Gosto" },
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

  return (
    <>
      <div 
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-lg"
        onClick={onClose}
      />
      <div 
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101]"
      >
        <div 
          className={`flex gap-3 bg-card border-2 border-border rounded-full px-6 py-3 shadow-2xl transition-all duration-200 ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          }`}
        >
          {reactions.map((reaction) => (
            <button
              key={reaction.type}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(reaction.type);
                onClose();
              }}
              className="w-12 h-12 hover:scale-125 transition-transform duration-150 active:scale-110 flex items-center justify-center rounded-full"
              title={reaction.label}
            >
              <img src={reaction.icon} alt={reaction.type} className="w-full h-full object-contain" />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
