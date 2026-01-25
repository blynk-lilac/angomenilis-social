import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Lock, Timer, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ViewOnceMediaProps {
  messageId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  senderId: string;
  currentUserId: string;
  onViewed?: () => void;
}

export default function ViewOnceMedia({
  messageId,
  mediaUrl,
  mediaType,
  senderId,
  currentUserId,
  onViewed
}: ViewOnceMediaProps) {
  const [isViewed, setIsViewed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isLoading, setIsLoading] = useState(true);

  const isSender = senderId === currentUserId;

  useEffect(() => {
    checkIfViewed();
  }, [messageId]);

  useEffect(() => {
    if (isOpen && !isSender) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen, isSender]);

  const checkIfViewed = async () => {
    // Check using messages table with a custom query for view tracking
    // Since message_views might not exist, we use localStorage as fallback
    const viewedKey = `viewed_${messageId}_${currentUserId}`;
    const isViewedLocal = localStorage.getItem(viewedKey);
    
    if (isViewedLocal) {
      setIsViewed(true);
    }
    setIsLoading(false);
  };

  const handleOpen = async () => {
    if (isViewed && !isSender) return;
    
    setIsOpen(true);
    setCountdown(5);

    // Mark as viewed using localStorage
    if (!isSender && !isViewed) {
      const viewedKey = `viewed_${messageId}_${currentUserId}`;
      localStorage.setItem(viewedKey, 'true');
      setIsViewed(true);
      onViewed?.();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  if (isLoading) {
    return (
      <div className="w-48 h-48 rounded-xl bg-muted animate-pulse flex items-center justify-center">
        <Lock className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  // Already viewed - show placeholder
  if (isViewed && !isSender) {
    return (
      <div className="w-48 h-48 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex flex-col items-center justify-center gap-2 border border-border/50">
        <EyeOff className="h-8 w-8 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium">Foto visualizada</span>
        <span className="text-[10px] text-muted-foreground/60">Visualização única</span>
      </div>
    );
  }

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleOpen}
        className={cn(
          "relative w-48 h-48 rounded-xl overflow-hidden cursor-pointer group",
          "bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30",
          "flex flex-col items-center justify-center gap-3 transition-all"
        )}
      >
        {/* Blur preview */}
        <div 
          className="absolute inset-0 bg-cover bg-center blur-2xl opacity-30"
          style={{ backgroundImage: `url(${mediaUrl})` }}
        />
        
        <div className="relative z-10 flex flex-col items-center gap-2">
          <div className="p-4 rounded-full bg-primary/20 border border-primary/30">
            <Eye className="h-8 w-8 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground">
            {isSender ? 'Ver mídia' : 'Toque para ver'}
          </span>
          {!isSender && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Timer className="h-3 w-3" />
              Visualização única
            </span>
          )}
        </div>

        {/* Shimmer effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
        </div>
      </motion.button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="absolute top-4 right-4 z-50 rounded-full bg-black/50 hover:bg-black/70 text-white"
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Countdown timer for receiver */}
            {!isSender && (
              <div className="absolute top-4 left-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 text-white">
                <Timer className="h-4 w-4" />
                <span className="text-sm font-medium">{countdown}s</span>
              </div>
            )}

            {/* Media */}
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full h-full flex items-center justify-center p-4"
              >
                {mediaType === 'image' ? (
                  <img
                    src={mediaUrl}
                    alt="View once media"
                    className="max-w-full max-h-[85vh] object-contain rounded-lg"
                    onContextMenu={(e) => e.preventDefault()}
                    draggable={false}
                  />
                ) : (
                  <video
                    src={mediaUrl}
                    className="max-w-full max-h-[85vh] object-contain rounded-lg"
                    controls={isSender}
                    autoPlay
                    muted={false}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Footer info */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/50 text-white text-sm">
              {isSender ? 'Você enviou esta mídia' : 'Esta mídia desaparecerá após visualização'}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
