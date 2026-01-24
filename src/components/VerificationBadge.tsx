import badgeVerified from "@/assets/badge-verified-blue.svg";
import badgeEffectBlack from "@/assets/badge-effect-black.png";
import { cn } from "@/lib/utils";

interface VerificationBadgeProps {
  verified?: boolean | null;
  badgeType?: string | null;
  type?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  username?: string; // To check for special emoji
  fullName?: string; // Also check full name for special emoji
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6"
};

// Special emoji that shows black badge effect
const SPECIAL_EMOJI = '󱢏';

export function hasSpecialBadgeEmoji(text?: string | null): boolean {
  if (!text) return false;
  return text.includes(SPECIAL_EMOJI);
}

export default function VerificationBadge({ 
  verified, 
  badgeType, 
  type,
  size = "md",
  className,
  username,
  fullName
}: VerificationBadgeProps) {
  // Check if username or fullName has special emoji for effect badge
  const hasEffectBadge = hasSpecialBadgeEmoji(username) || hasSpecialBadgeEmoji(fullName);
  
  const effectiveType = type || badgeType;
  
  // Always show effect badge if user has special emoji (even if not verified)
  if (hasEffectBadge) {
    return (
      <img 
        src={badgeEffectBlack} 
        alt="Badge Effect" 
        className={cn(sizeClasses[size], className)}
        title="Badge Effect"
      />
    );
  }
  
  // Show verified badge only if actually verified
  if (!verified && !effectiveType) return null;

  return (
    <img 
      src={badgeVerified} 
      alt="Verificado" 
      className={cn(sizeClasses[size], className)}
      title="Conta verificada e protegida"
    />
  );
}
