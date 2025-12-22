import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Copy, Trash2, Edit3, Clock, Reply, Forward } from 'lucide-react';
import { motion } from 'framer-motion';
import heartIcon from "@/assets/reactions/heart.png";
import laughingIcon from "@/assets/reactions/laughing.png";
import thumbsUpIcon from "@/assets/reactions/thumbs-up.png";
import sadIcon from "@/assets/reactions/sad.png";
import angryIcon from "@/assets/reactions/angry.png";

interface MessageActionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: {
    id: string;
    content: string;
    isOwn: boolean;
  } | null;
  onCopy: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onReact: (emoji: string) => void;
  onReply?: () => void;
}

const reactions = [
  { emoji: '❤️', icon: heartIcon, name: 'heart' },
  { emoji: '👍', icon: thumbsUpIcon, name: 'thumbs-up' },
  { emoji: '😂', icon: laughingIcon, name: 'laughing' },
  { emoji: '😢', icon: sadIcon, name: 'sad' },
  { emoji: '😡', icon: angryIcon, name: 'angry' },
  { emoji: '🔥', icon: null, name: 'fire' },
];

export default function MessageActionsSheet({
  open,
  onOpenChange,
  message,
  onCopy,
  onDelete,
  onEdit,
  onReact,
  onReply,
}: MessageActionsSheetProps) {
  if (!message) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto rounded-t-3xl bg-card/95 backdrop-blur-xl border-t border-border/50">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-center text-sm font-medium text-muted-foreground">
            Opções da mensagem
          </SheetTitle>
        </SheetHeader>

        {/* Reactions Row with Blur Background */}
        <div className="flex justify-center gap-2 py-4 px-2 mb-2 bg-muted/30 backdrop-blur-sm rounded-2xl">
          {reactions.map((reaction, idx) => (
            <motion.button
              key={reaction.name}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: idx * 0.05, type: 'spring', stiffness: 400 }}
              onClick={() => {
                onReact(reaction.name);
                onOpenChange(false);
              }}
              className="h-12 w-12 rounded-full bg-background hover:bg-muted flex items-center justify-center transition-all hover:scale-110 shadow-lg"
            >
              {reaction.icon ? (
                <img src={reaction.icon} alt={reaction.name} className="h-7 w-7" />
              ) : (
                <span className="text-2xl">{reaction.emoji}</span>
              )}
            </motion.button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="space-y-1">
          {onReply && (
            <Button
              variant="ghost"
              className="w-full justify-start h-12 px-4 rounded-xl hover:bg-muted"
              onClick={() => {
                onReply();
                onOpenChange(false);
              }}
            >
              <Reply className="h-5 w-5 mr-3 text-muted-foreground" />
              <span>Responder</span>
            </Button>
          )}

          <Button
            variant="ghost"
            className="w-full justify-start h-12 px-4 rounded-xl hover:bg-muted"
            onClick={() => {
              onCopy();
              onOpenChange(false);
            }}
          >
            <Copy className="h-5 w-5 mr-3 text-muted-foreground" />
            <span>Copiar mensagem</span>
          </Button>

          {message.isOwn && (
            <>
              <Button
                variant="ghost"
                className="w-full justify-start h-12 px-4 rounded-xl hover:bg-muted"
                onClick={() => {
                  onEdit();
                  onOpenChange(false);
                }}
              >
                <Edit3 className="h-5 w-5 mr-3 text-muted-foreground" />
                <span>Editar mensagem</span>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start h-12 px-4 rounded-xl hover:bg-muted"
              >
                <Clock className="h-5 w-5 mr-3 text-muted-foreground" />
                <span>Mensagem temporária</span>
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            className="w-full justify-start h-12 px-4 rounded-xl hover:bg-muted"
          >
            <Forward className="h-5 w-5 mr-3 text-muted-foreground" />
            <span>Reencaminhar</span>
          </Button>

          {message.isOwn && (
            <Button
              variant="ghost"
              className="w-full justify-start h-12 px-4 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                onDelete();
                onOpenChange(false);
              }}
            >
              <Trash2 className="h-5 w-5 mr-3" />
              <span>Eliminar mensagem</span>
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
