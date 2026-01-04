import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, Share2, ZoomIn, ZoomOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface ImageViewerProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  senderName?: string;
}

export function ImageViewer({ open, onClose, imageUrl, senderName }: ImageViewerProps) {
  const [scale, setScale] = useState(1);

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `imagem-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Imagem guardada!');
    } catch (error) {
      toast.error('Erro ao guardar imagem');
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Imagem',
          url: imageUrl,
        });
      } else {
        await navigator.clipboard.writeText(imageUrl);
        toast.success('Link copiado!');
      }
    } catch (error) {
      console.log('Share cancelled');
    }
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.5, 0.5));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-full max-h-full h-screen w-screen p-0 border-0 bg-black/95">
        <AnimatePresence>
          {open && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative w-full h-full flex flex-col"
            >
              {/* Header */}
              <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
                    onClick={onClose}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                  {senderName && (
                    <span className="text-white font-medium">{senderName}</span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
                    onClick={handleZoomOut}
                  >
                    <ZoomOut className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
                    onClick={handleZoomIn}
                  >
                    <ZoomIn className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Image */}
              <div className="flex-1 flex items-center justify-center overflow-hidden">
                <motion.img
                  src={imageUrl}
                  alt="Full size"
                  className="max-w-full max-h-full object-contain cursor-grab active:cursor-grabbing"
                  style={{ transform: `scale(${scale})` }}
                  drag
                  dragConstraints={{ left: -200, right: 200, top: -200, bottom: 200 }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: scale, opacity: 1 }}
                  transition={{ type: 'spring', damping: 20 }}
                />
              </div>

              {/* Footer Actions */}
              <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-6 p-6 bg-gradient-to-t from-black/80 to-transparent">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-14 w-14 rounded-full bg-white/20 text-white hover:bg-white/30"
                  onClick={handleShare}
                >
                  <Share2 className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-14 w-14 rounded-full bg-primary text-white hover:bg-primary/90"
                  onClick={handleDownload}
                >
                  <Download className="h-6 w-6" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
