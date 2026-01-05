import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { X, Crop, Eye, Send, RotateCw, ZoomIn } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatPhotoEditorProps {
  open: boolean;
  onClose: () => void;
  imageFile: File | null;
  onSend: (file: File, singleView: boolean) => void;
}

export default function ChatPhotoEditor({ open, onClose, imageFile, onSend }: ChatPhotoEditorProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [singleView, setSingleView] = useState(false);
  const [zoom, setZoom] = useState([1]);
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [imageFile]);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleSend = async () => {
    if (!imageFile) return;
    
    // For now, send original file - cropping would require canvas manipulation
    onSend(imageFile, singleView);
    onClose();
    resetState();
  };

  const resetState = () => {
    setZoom([1]);
    setRotation(0);
    setSingleView(false);
  };

  const handleClose = () => {
    onClose();
    resetState();
  };

  if (!imageFile) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-black border-0">
        <DialogHeader className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" className="text-white" onClick={handleClose}>
              <X className="h-6 w-6" />
            </Button>
            <DialogTitle className="text-white">Editar Foto</DialogTitle>
            <div className="w-10" />
          </div>
        </DialogHeader>

        {/* Image Preview */}
        <div className="relative aspect-square bg-black flex items-center justify-center overflow-hidden">
          <motion.img
            src={imageUrl}
            alt="Preview"
            className="max-w-full max-h-full object-contain"
            style={{
              transform: `scale(${zoom[0]}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s ease',
            }}
          />
          
          {singleView && (
            <div className="absolute top-4 right-4 bg-primary/90 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
              <Eye className="h-3 w-3" />
              Visualização única
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 bg-card space-y-4">
          {/* Zoom Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <ZoomIn className="h-4 w-4" /> Zoom
              </span>
              <span className="font-medium">{Math.round(zoom[0] * 100)}%</span>
            </div>
            <Slider
              value={zoom}
              onValueChange={setZoom}
              min={1}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRotate}
              className="flex-1 gap-2"
            >
              <RotateCw className="h-4 w-4" />
              Rodar
            </Button>
            <Button
              variant={singleView ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSingleView(!singleView)}
              className="flex-1 gap-2"
            >
              <Eye className="h-4 w-4" />
              {singleView ? 'Única ativada' : 'Visualização única'}
            </Button>
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            className="w-full h-12 text-base font-semibold gap-2"
          >
            <Send className="h-5 w-5" />
            Enviar Foto
          </Button>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
