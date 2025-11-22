import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { OnlineIndicator } from '@/components/OnlineIndicator';
import { cn } from '@/lib/utils';

interface ProfileAvatarProps {
  userId: string;
  avatarUrl?: string | null;
  username: string;
  className?: string;
  showOnlineStatus?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const ProfileAvatar = ({
  userId,
  avatarUrl,
  username,
  className,
  showOnlineStatus = false,
  size = 'md',
}: ProfileAvatarProps) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
    xl: 'h-20 w-20',
  };

  return (
    <div className={cn('relative', className)}>
      <Avatar className={cn(sizeClasses[size], 'object-cover')}>
        <AvatarImage src={avatarUrl || undefined} className="object-cover" />
        <AvatarFallback className="bg-primary text-primary-foreground">
          {username[0]?.toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
      {showOnlineStatus && <OnlineIndicator userId={userId} />}
    </div>
  );
};
