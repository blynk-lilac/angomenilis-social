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
  const getTransform = () => {
    switch (settings.media_quality) {
      case 'data-saver':
        return 'width=300,height=300,quality=40,format=webp';
      case 'low':
        return 'width=600,height=600,quality=60,format=webp';
      case 'medium':
        return 'width=1000,height=1000,quality=75,format=webp';
      case 'high':
      default:
        return 'width=1600,height=1600,quality=90,format=webp';
    }
  };

  // Se for URL do Supabase Storage, adiciona transformação
  const finalSrc = src.includes('supabase') && src.includes('/storage/v1/object/public/') 
    ? `${src}?${getTransform()}`
    : src;

  return (
    <img
      src={finalSrc}
      alt={alt}
      className={cn('object-cover', className)}
      loading="lazy"
    />
  );
};
