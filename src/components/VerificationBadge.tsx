import badgeVerified from "@/assets/badge-verified-blue.svg";

interface VerificationBadgeProps {
  verified?: boolean | null;
  badgeType?: string | null;
  className?: string;
}

export default function VerificationBadge({ verified, badgeType, className = "w-5 h-5" }: VerificationBadgeProps) {
  // Só mostra o badge se o usuário estiver verificado OU tiver um badge_type definido
  if (!verified && !badgeType) return null;

  return (
    <img 
      src={badgeVerified} 
      alt="Verificado" 
      className={className}
      title="Conta verificada e protegida"
    />
  );
}
