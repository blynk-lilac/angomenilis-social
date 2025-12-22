import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EmojiPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (emoji: string) => void;
}

const EMOJIS = [
  "😀","😃","😄","😁","😆","🥹","😂","🤣",
  "😊","😍","😘","😗","😙","😚","😉","😋",
  "😜","🤪","😎","🤩","🥳","😤","😭","😴",
  "👍","👎","👏","🙏","💪","🔥","✨","💯",
  "❤️","🧡","💛","💚","💙","💜","🖤","🤍",
];

export default function EmojiPicker({ open, onOpenChange, onSelect }: EmojiPickerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Emojis</DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-4">
          <ScrollArea className="h-[360px] pr-3">
            <div className="grid grid-cols-8 gap-2">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onSelect(emoji)}
                  className="h-10 w-10 rounded-xl bg-muted/40 hover:bg-muted transition-colors text-xl flex items-center justify-center"
                  aria-label={`Emoji ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
