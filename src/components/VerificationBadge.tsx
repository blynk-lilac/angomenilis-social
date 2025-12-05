import badgeVerified from "@/assets/badge-verified-blue.svg";
import { cn } from "@/lib/utils";

interface VerificationBadgeProps {
  verified?: boolean | null;
  badgeType?: string | null;
  type?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6"
};

export default function VerificationBadge({ 
  verified, 
  badgeType, 
  type,
  size = "md",
  className 
}: VerificationBadgeProps) {
  // Só mostra o badge se o usuário estiver verificado OU tiver um badge_type/type definido
  const effectiveType = type || badgeType;
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
