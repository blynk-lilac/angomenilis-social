import React, { createContext, useContext, useRef, useCallback } from 'react';

interface MediaPlaybackContextType {
  registerAudio: (id: string, audio: HTMLAudioElement) => void;
  unregisterAudio: (id: string) => void;
  playAudio: (id: string) => void;
  pauseAll: () => void;
}

const MediaPlaybackContext = createContext<MediaPlaybackContextType | null>(null);

export function MediaPlaybackProvider({ children }: { children: React.ReactNode }) {
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  const registerAudio = useCallback((id: string, audio: HTMLAudioElement) => {
    audioRefs.current.set(id, audio);
  }, []);

  const unregisterAudio = useCallback((id: string) => {
    audioRefs.current.delete(id);
  }, []);

  const pauseAll = useCallback(() => {
    audioRefs.current.forEach((audio) => {
      if (!audio.paused) {
        audio.pause();
      }
    });
  }, []);

  const playAudio = useCallback((id: string) => {
    // Pause all other audio first
    audioRefs.current.forEach((audio, audioId) => {
      if (audioId !== id && !audio.paused) {
        audio.pause();
      }
    });

    // Play the requested audio
    const audio = audioRefs.current.get(id);
    if (audio) {
      audio.play().catch(console.log);
    }
  }, []);

  return (
    <MediaPlaybackContext.Provider value={{ registerAudio, unregisterAudio, playAudio, pauseAll }}>
      {children}
    </MediaPlaybackContext.Provider>
  );
}

export function useMediaPlayback() {
  const context = useContext(MediaPlaybackContext);
  if (!context) {
    throw new Error('useMediaPlayback must be used within MediaPlaybackProvider');
  }
  return context;
}
