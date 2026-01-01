import blynk2026Logo from '@/assets/blynk-2026-logo.png';

interface Logo2026Props {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Logo2026 = ({ className = '', size = 'md' }: Logo2026Props) => {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14',
    xl: 'h-20',
  };

  return (
    <img 
      src={blynk2026Logo} 
      alt="Blynk 2026" 
      className={`${sizeClasses[size]} w-auto object-contain ${className}`}
    />
  );
};

export default Logo2026;
