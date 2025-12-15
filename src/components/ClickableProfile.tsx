import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import VerificationBadge from "@/components/VerificationBadge";
import { cn } from "@/lib/utils";

interface ClickableProfileProps {
  userId: string;
  username?: string;
  fullName?: string;
  firstName?: string;
  avatarUrl?: string | null;
  verified?: boolean;
  badgeType?: string | null;
  showAvatar?: boolean;
  showName?: boolean;
  avatarSize?: "sm" | "md" | "lg" | "xl";
  className?: string;
  nameClassName?: string;
  children?: React.ReactNode;
}

const avatarSizes = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-14 w-14"
};

export function ClickableProfile({
  userId,
  username,
  fullName,
  firstName,
  avatarUrl,
  verified,
  badgeType,
  showAvatar = true,
  showName = true,
  avatarSize = "md",
  className,
  nameClassName,
  children
}: ClickableProfileProps) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/profile/${userId}`);
  };

  const displayName = fullName || firstName || username || "Usuário";
  const initial = displayName[0]?.toUpperCase() || "U";

  return (
    <div 
      className={cn(
        "flex items-center gap-2 cursor-pointer group",
        className
      )}
      onClick={handleClick}
    >
      {showAvatar && (
        <Avatar className={cn(
          avatarSizes[avatarSize],
          "ring-2 ring-transparent group-hover:ring-primary/30 transition-all"
        )}>
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {initial}
          </AvatarFallback>
        </Avatar>
      )}
      
      {showName && (
        <div className="flex items-center gap-1">
          <span className={cn(
            "font-semibold text-foreground group-hover:text-primary group-hover:underline transition-colors",
            nameClassName
          )}>
            {displayName}
          </span>
          {verified && <VerificationBadge verified={verified} badgeType={badgeType} size="sm" />}
        </div>
      )}

      {children}
    </div>
  );
}
