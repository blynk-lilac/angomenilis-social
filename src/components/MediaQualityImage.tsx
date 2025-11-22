import { useSettings } from '@/contexts/SettingsContext';
import { cn } from '@/lib/utils';

interface MediaQualityImageProps {
  src: string;
  alt: string;
  className?: string;
}

export const MediaQualityImage = ({ src, alt, className }: MediaQualityImageProps) => {
  const { settings } = useSettings();

  // Parâmetros de qualidade baseados na configuração
  const getQualityParams = () => {
    switch (settings.media_quality) {
      case 'low':
        return '?width=400&quality=60';
      case 'medium':
        return '?width=800&quality=75';
      case 'data-saver':
        return '?width=200&quality=40';
      case 'high':
      default:
        return '?width=1200&quality=90';
    }
  };

  const finalSrc = src.includes('?') ? src : `${src}${getQualityParams()}`;

  return (
    <img
      src={finalSrc}
      alt={alt}
      className={cn('object-cover', className)}
      loading="lazy"
    />
  );
};
