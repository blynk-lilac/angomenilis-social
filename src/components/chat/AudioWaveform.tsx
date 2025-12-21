import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { motion } from 'framer-motion';

interface AudioWaveformProps {
  src: string;
  duration?: number;
  isSent: boolean;
}

export default function AudioWaveform({ src, duration, isSent }: AudioWaveformProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate random waveform bars for visual effect
    const bars = Array.from({ length: 40 }, () => Math.random() * 0.8 + 0.2);
    setWaveform(bars);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const progress = progressRef.current;
    if (!audio || !progress) return;

    const rect = progress.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    audio.currentTime = clickPosition * audioDuration;
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 min-w-[200px] max-w-[280px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      
      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          isSent 
            ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30' 
            : 'bg-muted hover:bg-muted/80'
        }`}
      >
        {isPlaying ? (
          <Pause className={`h-5 w-5 ${isSent ? 'text-primary-foreground' : 'text-foreground'}`} />
        ) : (
          <Play className={`h-5 w-5 ml-0.5 ${isSent ? 'text-primary-foreground' : 'text-foreground'}`} />
        )}
      </button>

      {/* Waveform */}
      <div className="flex-1 flex flex-col gap-1">
        <div 
          ref={progressRef}
          className="relative h-8 flex items-center cursor-pointer"
          onClick={handleWaveformClick}
        >
          <div className="flex items-center gap-[2px] w-full h-full">
            {waveform.map((height, index) => {
              const isActive = (index / waveform.length) * 100 <= progress;
              return (
                <motion.div
                  key={index}
                  initial={{ scaleY: 0.3 }}
                  animate={{ 
                    scaleY: isPlaying ? height : height * 0.7,
                  }}
                  transition={{ 
                    duration: 0.1,
                    delay: isPlaying ? index * 0.01 : 0
                  }}
                  className={`flex-1 rounded-full transition-colors duration-150 ${
                    isActive
                      ? isSent 
                        ? 'bg-primary-foreground' 
                        : 'bg-primary'
                      : isSent 
                        ? 'bg-primary-foreground/40' 
                        : 'bg-muted-foreground/40'
                  }`}
                  style={{
                    height: `${height * 100}%`,
                    minHeight: '4px',
                    maxHeight: '100%',
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Time Display */}
        <div className={`text-[11px] ${isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
          {formatTime(isPlaying ? currentTime : audioDuration)}
        </div>
      </div>
    </div>
  );
}
