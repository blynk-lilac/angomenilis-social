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
    sm: 'h-8 w-8 min-w-[2rem]',
    md: 'h-10 w-10 min-w-[2.5rem]',
    lg: 'h-14 w-14 min-w-[3.5rem]',
    xl: 'h-20 w-20 min-w-[5rem]',
  };

  return (
    <div className={cn('relative flex-shrink-0', className)}>
      <Avatar className={cn(sizeClasses[size])}>
        <AvatarImage 
          src={avatarUrl || undefined} 
          className="object-cover w-full h-full"
          loading="lazy"
        />
        <AvatarFallback className="bg-primary text-primary-foreground">
          {username[0]?.toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
      {showOnlineStatus && <OnlineIndicator userId={userId} />}
    </div>
  );
};
