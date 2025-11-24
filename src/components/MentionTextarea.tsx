import { useState, useRef, useEffect, TextareaHTMLAttributes } from "react";
import { Textarea } from "@/components/ui/textarea";
import MentionAutocomplete from "./MentionAutocomplete";

interface MentionTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

export default function MentionTextarea({
  value,
  onChange,
  ...props
}: MentionTextareaProps) {
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleInput = () => {
      const cursorPosition = textarea.selectionStart;
      const textBeforeCursor = value.substring(0, cursorPosition);
      
      // Detectar @ para menções
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
      
      if (mentionMatch) {
        setMentionQuery(mentionMatch[1]);
        setShowMentions(true);
        
        // Calcular posição do autocomplete
        const rect = textarea.getBoundingClientRect();
        setMentionPosition({
          top: rect.top - 200,
          left: rect.left,
        });
      } else {
        setShowMentions(false);
        setMentionQuery("");
      }
    };

    textarea.addEventListener('input', handleInput);
    textarea.addEventListener('click', handleInput);

    return () => {
      textarea.removeEventListener('input', handleInput);
      textarea.removeEventListener('click', handleInput);
    };
  }, [value]);

  const handleMentionSelect = (username: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    
    // Substituir @query por @username
    const newTextBefore = textBeforeCursor.replace(/@\w*$/, `@${username} `);
    const newValue = newTextBefore + textAfterCursor;
    
    onChange(newValue);
    setShowMentions(false);
    setMentionQuery("");
    
    // Focar de volta no textarea
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = newTextBefore.length;
    }, 0);
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
      
      {showMentions && (
        <MentionAutocomplete
          query={mentionQuery}
          onSelect={handleMentionSelect}
          position={mentionPosition}
        />
      )}
    </div>
  );
}