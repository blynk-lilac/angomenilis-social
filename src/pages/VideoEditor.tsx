import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronLeft,
  Sparkles,
  Sliders,
  Play,
  Pause,
  RotateCw,
  Scissors,
  Type,
  Music,
  Sticker,
  Layers,
  Wand2,
  Sun,
  Contrast,
  Droplets,
  Thermometer,
  Maximize,
  FlipHorizontal,
  FlipVertical,
} from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { motion } from 'framer-motion';

interface VideoFilter {
  name: string;
  style: string;
}

const videoFilters: VideoFilter[] = [
  { name: 'Original', style: '' },
  { name: 'Clarendon', style: 'contrast(1.2) saturate(1.35)' },
  { name: 'Gingham', style: 'brightness(1.05) hue-rotate(-10deg)' },
  { name: 'Moon', style: 'grayscale(1) contrast(1.1) brightness(1.1)' },
  { name: 'Lark', style: 'contrast(0.9) brightness(1.1) saturate(0.9)' },
  { name: 'Reyes', style: 'sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)' },
  { name: 'Juno', style: 'sepia(0.35) contrast(1.15) brightness(1.15) saturate(1.8)' },
  { name: 'Aden', style: 'hue-rotate(-20deg) contrast(0.9) saturate(0.85) brightness(1.2)' },
  { name: 'Crema', style: 'sepia(0.5) contrast(1.25) brightness(1.15) saturate(0.9)' },
  { name: 'Ludwig', style: 'brightness(1.05) saturate(1.1)' },
  { name: 'Nashville', style: 'sepia(0.2) contrast(1.2) brightness(1.05) saturate(1.2)' },
  { name: 'Perpetua', style: 'contrast(1.1) brightness(1.25) saturate(1.1)' },
];

const editTools = [
  { id: 'filters', label: 'Filtros', icon: Sparkles },
  { id: 'adjust', label: 'Ajustar', icon: Sliders },
  { id: 'trim', label: 'Cortar', icon: Scissors },
  { id: 'text', label: 'Texto', icon: Type },
  { id: 'music', label: 'Música', icon: Music },
  { id: 'stickers', label: 'Stickers', icon: Sticker },
  { id: 'effects', label: 'Efeitos', icon: Wand2 },
  { id: 'layers', label: 'Camadas', icon: Layers },
];

export default function VideoEditor() {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const videoUrl = location.state?.videoUrl || '';
  const onSave = location.state?.onSave;
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<VideoFilter>(videoFilters[0]);
  const [activeTool, setActiveTool] = useState<string>('filters');
  
  // Adjustments
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [temperature, setTemperature] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  const getFilterStyle = () => {
    let style = selectedFilter.style;
    const adjustments = [];
    
    if (brightness !== 100) adjustments.push(`brightness(${brightness / 100})`);
    if (contrast !== 100) adjustments.push(`contrast(${contrast / 100})`);
    if (saturation !== 100) adjustments.push(`saturate(${saturation / 100})`);
    if (temperature !== 0) adjustments.push(`sepia(${Math.abs(temperature) / 200})`);
    
    return `${style} ${adjustments.join(' ')}`.trim();
  };

  const getTransformStyle = () => {
    const transforms = [];
    if (rotation !== 0) transforms.push(`rotate(${rotation}deg)`);
    if (flipH) transforms.push('scaleX(-1)');
    if (flipV) transforms.push('scaleY(-1)');
    return transforms.join(' ');
  };

  const togglePlayback = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSave = () => {
    const editSettings = {
      filter: selectedFilter,
      brightness,
      contrast,
      saturation,
      temperature,
      rotation,
      flipH,
      flipV,
    };
    
    if (onSave) {
      onSave(editSettings);
    }
    navigate(-1);
  };

  const resetAdjustments = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setTemperature(0);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setSelectedFilter(videoFilters[0]);
  };

  return (
    <ProtectedRoute>
      <div className="fixed inset-0 bg-black flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/10"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-white font-bold text-lg">Editar</h1>
          <Button
            onClick={handleSave}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-white rounded-full px-6"
          >
            Concluído
          </Button>
        </div>

        {/* Video Preview */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
          <div 
            className="relative max-w-full max-h-full aspect-[9/16] bg-black rounded-2xl overflow-hidden"
            style={{ transform: getTransformStyle() }}
          >
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain"
                style={{ filter: getFilterStyle() }}
                loop
                playsInline
                onClick={togglePlayback}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/50">
                Nenhum vídeo selecionado
              </div>
            )}
            
            {/* Play/Pause Overlay */}
            {!isPlaying && (
              <button
                onClick={togglePlayback}
                className="absolute inset-0 flex items-center justify-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
                >
                  <Play className="h-10 w-10 text-white fill-white ml-1" />
                </motion.div>
              </button>
            )}
          </div>
        </div>

        {/* Tool Tabs */}
        <div className="bg-black/80 backdrop-blur-sm border-t border-white/10">
          <ScrollArea className="w-full">
            <div className="flex items-center gap-1 p-2">
              {editTools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                    activeTool === tool.id
                      ? 'bg-white/20 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <tool.icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{tool.label}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Tool Content */}
        <div className="bg-black/80 backdrop-blur-sm pb-safe min-h-[200px]">
          {activeTool === 'filters' && (
            <ScrollArea className="w-full">
              <div className="flex gap-3 p-4">
                {videoFilters.map((filter) => (
                  <button
                    key={filter.name}
                    onClick={() => setSelectedFilter(filter)}
                    className={`flex-shrink-0 flex flex-col items-center gap-2 transition-all ${
                      selectedFilter.name === filter.name ? 'opacity-100' : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div 
                      className={`w-16 h-16 rounded-xl bg-gradient-to-br from-pink-400 to-purple-600 ${
                        selectedFilter.name === filter.name ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''
                      }`}
                      style={{ filter: filter.style || 'none' }}
                    />
                    <span className="text-xs text-white font-medium">{filter.name}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          {activeTool === 'adjust' && (
            <div className="p-4 space-y-4">
              {/* Quick actions */}
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <RotateCw className="h-4 w-4 mr-2" />
                  Girar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFlipH(!flipH)}
                  className={`flex-1 border-white/20 text-white hover:bg-white/20 ${flipH ? 'bg-white/30' : 'bg-white/10'}`}
                >
                  <FlipHorizontal className="h-4 w-4 mr-2" />
                  Flip H
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFlipV(!flipV)}
                  className={`flex-1 border-white/20 text-white hover:bg-white/20 ${flipV ? 'bg-white/30' : 'bg-white/10'}`}
                >
                  <FlipVertical className="h-4 w-4 mr-2" />
                  Flip V
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetAdjustments}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Reset
                </Button>
              </div>

              {/* Sliders */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Sun className="h-4 w-4 text-white/60" />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-white/80">Brilho</span>
                      <span className="text-xs text-white/60">{brightness}%</span>
                    </div>
                    <Slider
                      value={[brightness]}
                      onValueChange={([v]) => setBrightness(v)}
                      min={50}
                      max={150}
                      className="[&_[role=slider]]:bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Contrast className="h-4 w-4 text-white/60" />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-white/80">Contraste</span>
                      <span className="text-xs text-white/60">{contrast}%</span>
                    </div>
                    <Slider
                      value={[contrast]}
                      onValueChange={([v]) => setContrast(v)}
                      min={50}
                      max={150}
                      className="[&_[role=slider]]:bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Droplets className="h-4 w-4 text-white/60" />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-white/80">Saturação</span>
                      <span className="text-xs text-white/60">{saturation}%</span>
                    </div>
                    <Slider
                      value={[saturation]}
                      onValueChange={([v]) => setSaturation(v)}
                      min={0}
                      max={200}
                      className="[&_[role=slider]]:bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Thermometer className="h-4 w-4 text-white/60" />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-white/80">Temperatura</span>
                      <span className="text-xs text-white/60">{temperature}</span>
                    </div>
                    <Slider
                      value={[temperature]}
                      onValueChange={([v]) => setTemperature(v)}
                      min={-100}
                      max={100}
                      className="[&_[role=slider]]:bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTool === 'trim' && (
            <div className="p-4 text-center text-white/60">
              <Scissors className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Arraste as bordas para cortar o vídeo</p>
            </div>
          )}

          {activeTool === 'text' && (
            <div className="p-4 text-center text-white/60">
              <Type className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Toque no vídeo para adicionar texto</p>
            </div>
          )}

          {activeTool === 'music' && (
            <div className="p-4 text-center text-white/60">
              <Music className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Adicione música ao seu vídeo</p>
              <Button
                variant="outline"
                className="mt-4 bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => navigate(-1)}
              >
                Escolher música
              </Button>
            </div>
          )}

          {activeTool === 'stickers' && (
            <div className="p-4 text-center text-white/60">
              <Sticker className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Adicione stickers ao seu vídeo</p>
            </div>
          )}

          {activeTool === 'effects' && (
            <div className="p-4 text-center text-white/60">
              <Wand2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Efeitos especiais em breve</p>
            </div>
          )}

          {activeTool === 'layers' && (
            <div className="p-4 text-center text-white/60">
              <Layers className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Camadas e sobreposições em breve</p>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
