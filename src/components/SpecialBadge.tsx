import badgeEffectBlack from '@/assets/badge-effect-black.png';

interface SpecialBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SpecialBadge({ className = '', size = 'sm' }: SpecialBadgeProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <img 
      src={badgeEffectBlack} 
      alt="Badge Effect"
      className={`inline-block ${sizeClasses[size]} ${className}`}
      style={{ filter: 'none' }}
    />
  );
}

export default SpecialBadge;
