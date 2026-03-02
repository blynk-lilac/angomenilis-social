import { useNavigate } from "react-router-dom";
import badgeVerified from "@/assets/badge-verified-blue.svg";
import badgeEffectBlack from "@/assets/badge-effect-black.png";
import { cn } from "@/lib/utils";

interface VerificationBadgeProps {
  verified?: boolean | null;
  badgeType?: string | null;
  type?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  username?: string;
  fullName?: string;
  clickable?: boolean;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6"
};

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
  fullName,
  clickable = true
}: VerificationBadgeProps) {
  const navigate = useNavigate();
  const hasEffectBadge = hasSpecialBadgeEmoji(username) || hasSpecialBadgeEmoji(fullName);
  const effectiveType = type || badgeType;

  const handleClick = (e: React.MouseEvent) => {
    if (!clickable) return;
    e.stopPropagation();
    e.preventDefault();
    navigate('/request-verification');
  };
  
  if (hasEffectBadge) {
    return (
      <img 
        src={badgeEffectBlack} 
        alt="Badge Effect" 
        className={cn(sizeClasses[size], clickable && "cursor-pointer", className)}
        title="Badge Effect"
        onClick={handleClick}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
      />
    );
  }
  
  if (!verified && !effectiveType) return null;

  return (
    <img 
      src={badgeVerified} 
      alt="Verificado" 
      className={cn(sizeClasses[size], clickable && "cursor-pointer", className)}
      title="Conta verificada e protegida"
      onClick={handleClick}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
