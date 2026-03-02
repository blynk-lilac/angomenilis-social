import { useState, useRef, useCallback, useEffect } from "react";
import { X, Type, Pencil, AtSign, Palette, Undo2, Check, Music, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  fontWeight: string;
  bgColor: string | null;
}

interface StoryEditorProps {
  mediaFile: File;
  mediaPreview: string;
  onConfirm: (editedData: {
    textOverlays: TextOverlay[];
    drawings: string | null;
    filter: string;
    mentions: string[];
  }) => void;
  onCancel: () => void;
}

const FILTERS = [
  { name: "Normal", css: "" },
  { name: "Clarendon", css: "contrast(1.2) saturate(1.35)" },
  { name: "Gingham", css: "brightness(1.05) hue-rotate(-10deg)" },
  { name: "Moon", css: "grayscale(1) contrast(1.1) brightness(1.1)" },
  { name: "Lark", css: "contrast(0.9) brightness(1.1) saturate(1.2)" },
  { name: "Reyes", css: "sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)" },
  { name: "Juno", css: "contrast(1.15) saturate(1.8) hue-rotate(-10deg)" },
  { name: "Aden", css: "hue-rotate(-20deg) contrast(0.9) saturate(0.85) brightness(1.2)" },
  { name: "Ludwig", css: "saturate(0.6) contrast(1.3) brightness(1.05)" },
  { name: "Crema", css: "sepia(0.5) contrast(0.8) brightness(1.1) saturate(0.6)" },
];

const TEXT_COLORS = [
  "#FFFFFF", "#000000", "#FF3B30", "#FF9500", "#FFCC00",
  "#34C759", "#007AFF", "#AF52DE", "#FF2D55", "#5856D6",
];

const BRUSH_COLORS = [
  "#FF3B30", "#FF9500", "#FFCC00", "#34C759", "#007AFF",
  "#AF52DE", "#FF2D55", "#FFFFFF", "#000000", "#5856D6",
];

export function StoryEditor({ mediaFile, mediaPreview, onConfirm, onCancel }: StoryEditorProps) {
  const [activeMode, setActiveMode] = useState<"none" | "text" | "draw" | "mention" | "filter">("none");
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [currentTextColor, setCurrentTextColor] = useState("#FFFFFF");
  const [currentFontSize, setCurrentFontSize] = useState(24);
  const [currentBgColor, setCurrentBgColor] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState(FILTERS[0]);
  const [mentions, setMentions] = useState<string[]>([]);
  const [mentionInput, setMentionInput] = useState("");
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState("#FF3B30");
  const [brushSize, setBrushSize] = useState(4);
  const [drawingPaths, setDrawingPaths] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isVideo = mediaFile.type.startsWith("video/");

  // Drawing handlers
  const getCanvasCoords = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    if (activeMode !== "draw") return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setIsDrawing(true);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing || activeMode !== "draw") return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (canvasRef.current) {
      setDrawingPaths(prev => [...prev, canvasRef.current!.toDataURL()]);
    }
  };

  const undoDrawing = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    const newPaths = drawingPaths.slice(0, -1);
    setDrawingPaths(newPaths);
    if (newPaths.length > 0) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = newPaths[newPaths.length - 1];
    }
  };

  const addTextOverlay = () => {
    if (!currentText.trim()) return;
    setTextOverlays(prev => [...prev, {
      id: Date.now().toString(),
      text: currentText,
      x: 50, y: 50,
      color: currentTextColor,
      fontSize: currentFontSize,
      fontWeight: "bold",
      bgColor: currentBgColor,
    }]);
    setCurrentText("");
    setActiveMode("none");
  };

  const addMention = () => {
    if (!mentionInput.trim()) return;
    const username = mentionInput.startsWith("@") ? mentionInput : `@${mentionInput}`;
    setMentions(prev => [...prev, username]);
    setMentionInput("");
  };

  const handleConfirm = () => {
    const drawingData = canvasRef.current?.toDataURL() || null;
    onConfirm({
      textOverlays,
      drawings: drawingData,
      filter: selectedFilter.css,
      mentions,
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      {/* Top toolbar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 pt-[env(safe-area-inset-top,12px)] pb-2 bg-gradient-to-b from-black/70 to-transparent">
        <Button variant="ghost" size="icon" onClick={onCancel} className="text-white h-10 w-10 rounded-full bg-black/30">
          <X className="h-6 w-6" />
        </Button>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="icon"
            onClick={() => setActiveMode(activeMode === "text" ? "none" : "text")}
            className={cn("h-10 w-10 rounded-full text-white", activeMode === "text" && "bg-white/20")}
          >
            <Type className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost" size="icon"
            onClick={() => setActiveMode(activeMode === "draw" ? "none" : "draw")}
            className={cn("h-10 w-10 rounded-full text-white", activeMode === "draw" && "bg-white/20")}
          >
            <Pencil className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost" size="icon"
            onClick={() => setActiveMode(activeMode === "mention" ? "none" : "mention")}
            className={cn("h-10 w-10 rounded-full text-white", activeMode === "mention" && "bg-white/20")}
          >
            <AtSign className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost" size="icon"
            onClick={() => setActiveMode(activeMode === "filter" ? "none" : "filter")}
            className={cn("h-10 w-10 rounded-full text-white", activeMode === "filter" && "bg-white/20")}
          >
            <Sparkles className="h-5 w-5" />
          </Button>
        </div>

        <Button onClick={handleConfirm} className="h-10 px-5 rounded-full bg-primary text-primary-foreground font-semibold">
          <Check className="h-4 w-4 mr-1" />
          Pronto
        </Button>
      </div>

      {/* Media preview with filter */}
      <div ref={containerRef} className="flex-1 relative flex items-center justify-center overflow-hidden">
        {isVideo ? (
          <video
            src={mediaPreview}
            className="w-full h-full object-contain"
            style={{ filter: selectedFilter.css }}
            autoPlay muted loop playsInline
          />
        ) : (
          <img
            src={mediaPreview}
            alt="Preview"
            className="w-full h-full object-contain"
            style={{ filter: selectedFilter.css }}
            draggable={false}
          />
        )}

        {/* Drawing canvas overlay */}
        <canvas
          ref={canvasRef}
          width={1080}
          height={1920}
          className={cn(
            "absolute inset-0 w-full h-full",
            activeMode === "draw" ? "z-20 cursor-crosshair" : "z-10 pointer-events-none"
          )}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {/* Text overlays */}
        {textOverlays.map((overlay) => (
          <div
            key={overlay.id}
            className="absolute z-15 pointer-events-none select-none"
            style={{
              left: `${overlay.x}%`,
              top: `${overlay.y}%`,
              transform: "translate(-50%, -50%)",
              color: overlay.color,
              fontSize: `${overlay.fontSize}px`,
              fontWeight: overlay.fontWeight,
              backgroundColor: overlay.bgColor || "transparent",
              padding: overlay.bgColor ? "4px 12px" : "0",
              borderRadius: overlay.bgColor ? "8px" : "0",
              textShadow: !overlay.bgColor ? "0 2px 8px rgba(0,0,0,0.8)" : "none",
              maxWidth: "80%",
              textAlign: "center",
              wordBreak: "break-word",
            }}
          >
            {overlay.text}
          </div>
        ))}

        {/* Mentions display */}
        {mentions.length > 0 && (
          <div className="absolute bottom-24 left-4 z-15 flex flex-wrap gap-1">
            {mentions.map((m, i) => (
              <span key={i} className="bg-black/50 backdrop-blur-sm text-white text-sm px-2 py-1 rounded-full">
                {m}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Bottom panels */}
      <AnimatePresence>
        {/* Text input panel */}
        {activeMode === "text" && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 z-30 bg-black/80 backdrop-blur-xl p-4 pb-[env(safe-area-inset-bottom,16px)] space-y-3"
          >
            <Input
              value={currentText}
              onChange={(e) => setCurrentText(e.target.value)}
              placeholder="Escreva o texto..."
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-lg h-12"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && addTextOverlay()}
            />
            
            {/* Font size slider */}
            <div className="flex items-center gap-3">
              <span className="text-white/50 text-xs">Aa</span>
              <input
                type="range" min="14" max="48" value={currentFontSize}
                onChange={(e) => setCurrentFontSize(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-white/50 text-lg font-bold">Aa</span>
            </div>

            {/* Colors */}
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setCurrentTextColor(color)}
                  className={cn(
                    "h-8 w-8 rounded-full flex-shrink-0 border-2 transition-transform",
                    currentTextColor === color ? "border-white scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
              <button
                onClick={() => setCurrentBgColor(currentBgColor ? null : "rgba(0,0,0,0.6)")}
                className={cn(
                  "h-8 px-3 rounded-full flex-shrink-0 border text-white text-xs font-medium",
                  currentBgColor ? "bg-white/20 border-white" : "bg-transparent border-white/30"
                )}
              >
                BG
              </button>
            </div>

            <Button onClick={addTextOverlay} disabled={!currentText.trim()} className="w-full rounded-full">
              Adicionar texto
            </Button>
          </motion.div>
        )}

        {/* Draw panel */}
        {activeMode === "draw" && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 z-30 bg-black/80 backdrop-blur-xl p-4 pb-[env(safe-area-inset-bottom,16px)] space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {BRUSH_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setBrushColor(color)}
                    className={cn(
                      "h-7 w-7 rounded-full flex-shrink-0 border-2 transition-transform",
                      brushColor === color ? "border-white scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <Button variant="ghost" size="icon" onClick={undoDrawing} className="text-white h-9 w-9">
                <Undo2 className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white/50 text-xs">•</span>
              <input
                type="range" min="2" max="20" value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-white/50 text-lg">●</span>
            </div>
          </motion.div>
        )}

        {/* Mention panel */}
        {activeMode === "mention" && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 z-30 bg-black/80 backdrop-blur-xl p-4 pb-[env(safe-area-inset-bottom,16px)] space-y-3"
          >
            <div className="flex gap-2">
              <Input
                value={mentionInput}
                onChange={(e) => setMentionInput(e.target.value)}
                placeholder="@utilizador"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 flex-1"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && addMention()}
              />
              <Button onClick={addMention} disabled={!mentionInput.trim()} className="rounded-full">
                <AtSign className="h-4 w-4" />
              </Button>
            </div>
            {mentions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {mentions.map((m, i) => (
                  <span key={i} className="bg-white/15 text-white text-sm px-2.5 py-1 rounded-full flex items-center gap-1">
                    {m}
                    <button onClick={() => setMentions(prev => prev.filter((_, idx) => idx !== i))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Filter panel */}
        {activeMode === "filter" && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 z-30 bg-black/80 backdrop-blur-xl p-4 pb-[env(safe-area-inset-bottom,16px)]"
          >
            <div className="flex gap-3 overflow-x-auto py-1 scrollbar-hide">
              {FILTERS.map((filter) => (
                <button
                  key={filter.name}
                  onClick={() => setSelectedFilter(filter)}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0"
                >
                  <div className={cn(
                    "w-16 h-16 rounded-xl overflow-hidden border-2 transition-all",
                    selectedFilter.name === filter.name ? "border-white scale-105" : "border-transparent"
                  )}>
                    {isVideo ? (
                      <video src={mediaPreview} className="w-full h-full object-cover" style={{ filter: filter.css }} muted />
                    ) : (
                      <img src={mediaPreview} className="w-full h-full object-cover" style={{ filter: filter.css }} draggable={false} />
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium",
                    selectedFilter.name === filter.name ? "text-white" : "text-white/50"
                  )}>
                    {filter.name}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
