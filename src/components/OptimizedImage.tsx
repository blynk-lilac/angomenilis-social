import { useState, useRef, useEffect, memo } from 'react';
import { useNetworkOptimization } from '@/hooks/useNetworkOptimization';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageOff } from 'lucide-react';
import { motion } from 'framer-motion';

interface OptimizedImageProps {
  src: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
  priority?: boolean;
}

export const OptimizedImage = memo(({
  src,
  alt = '',
  className = '',
  onClick,
  priority = false,
}: OptimizedImageProps) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('');
  const { getImageQuality, isSlowNetwork } = useNetworkOptimization();

  useEffect(() => {
    if (!src) return;

    // Apply quality optimization
    const optimizedSrc = getImageQuality(src);
    
    if (priority) {
      // Load immediately for priority images
      setImageSrc(optimizedSrc);
      return;
    }

    // Lazy load with intersection observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(optimizedSrc);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '200px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src, getImageQuality, priority]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  if (hasError) {
    return (
      <div 
        className={`flex items-center justify-center bg-muted ${className}`}
        onClick={onClick}
      >
        <ImageOff className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div ref={imgRef} className={`relative ${className}`} onClick={onClick}>
      {isLoading && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}
      
      {imageSrc && (
        <motion.img
          src={imageSrc}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          // Use smaller placeholder for slow networks
          style={{
            contentVisibility: 'auto',
          }}
        />
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';
