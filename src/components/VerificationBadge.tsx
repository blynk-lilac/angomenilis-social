import { CheckCircle } from 'lucide-react';

interface VerificationBadgeProps {
  verified?: boolean;
  badgeType?: string | null;
  className?: string;
}

export default function VerificationBadge({ 
  verified, 
  badgeType, 
  className = "h-4 w-4" 
}: VerificationBadgeProps) {
  if (!verified) return null;

  let color = "text-accent";
  
  if (badgeType === 'gold') color = "text-yellow-500";
  else if (badgeType === 'purple') color = "text-purple-500";
  else if (badgeType === 'silver') color = "text-gray-400";

  return <CheckCircle className={`${className} ${color} fill-current`} />;
}
