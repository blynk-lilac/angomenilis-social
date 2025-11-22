import { useSettings } from '@/contexts/SettingsContext';
import { cn } from '@/lib/utils';

interface MediaQualityVideoProps {
  src: string;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
}

export const MediaQualityVideo = ({ src, className, controls = true, autoPlay = false, loop = false }: MediaQualityVideoProps) => {
  const { settings } = useSettings();

  // Preload baseado na qualidade
  const getPreload = () => {
    switch (settings.media_quality) {
      case 'data-saver':
        return 'none';
      case 'low':
        return 'metadata';
      default:
        return 'metadata';
    }
  };

  return (
    <video
      src={src}
      className={cn('object-cover', className)}
      controls={controls}
      autoPlay={autoPlay}
      loop={loop}
      preload={getPreload()}
      playsInline
    />
  );
};
