import { useState, useRef, useEffect } from 'react';
import { Music, Play, Pause, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MusicPlayerProps {
  musicName: string;
  musicArtist?: string | null;
  musicUrl?: string | null;
  overlay?: boolean;
}

export function MusicPlayer({ musicName, musicArtist, musicUrl, overlay = false }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !musicUrl) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.log);
    }
    setIsPlaying(!isPlaying);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (overlay) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 bg-black/70 backdrop-blur-md rounded-full px-3 py-2 max-w-fit cursor-pointer"
        onClick={togglePlay}
      >
        {musicUrl && <audio ref={audioRef} src={musicUrl} preload="metadata" />}
        
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
          <AnimatePresence mode="wait">
            {isPlaying ? (
              <motion.div
                key="pause"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Pause className="h-4 w-4 text-white fill-white" />
              </motion.div>
            ) : (
              <motion.div
                key="play"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                {musicUrl ? (
                  <Play className="h-4 w-4 text-white fill-white ml-0.5" />
                ) : (
                  <Music className="h-4 w-4 text-white" />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-semibold truncate max-w-[150px]">
                {musicName}
              </p>
              {musicArtist && (
                <p className="text-white/70 text-[10px] truncate max-w-[150px]">
                  {musicArtist}
                </p>
              )}
            </div>
            {isPlaying && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-0.5"
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-0.5 h-3 bg-white rounded-full"
                    animate={{ scaleY: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </motion.div>
            )}
          </div>
          
          {musicUrl && duration > 0 && (
            <div className="mt-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-white rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-xl p-3 cursor-pointer border border-pink-500/20"
      onClick={togglePlay}
    >
      {musicUrl && <audio ref={audioRef} src={musicUrl} preload="metadata" />}
      
      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
        <AnimatePresence mode="wait">
          {isPlaying ? (
            <motion.div
              key="pause"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Pause className="h-6 w-6 text-white fill-white" />
            </motion.div>
          ) : (
            <motion.div
              key="play"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              {musicUrl ? (
                <Play className="h-6 w-6 text-white fill-white ml-0.5" />
              ) : (
                <Music className="h-6 w-6 text-white" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{musicName}</p>
            {musicArtist && (
              <p className="text-muted-foreground text-xs truncate">{musicArtist}</p>
            )}
          </div>
          {isPlaying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-0.5"
            >
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 h-4 bg-primary rounded-full"
                  animate={{ scaleY: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                />
              ))}
            </motion.div>
          )}
        </div>
        
        {musicUrl && duration > 0 && (
          <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
