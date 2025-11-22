import { cn } from '@/lib/utils';
import { useOnlineUsers } from '@/hooks/useOnlineUsers';

interface OnlineIndicatorProps {
  userId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const OnlineIndicator = ({ userId, className, size = 'sm' }: OnlineIndicatorProps) => {
  const onlineUsers = useOnlineUsers();
  const isOnline = onlineUsers.has(userId);

  if (!isOnline) return null;

  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  return (
    <div
      className={cn(
        'absolute bottom-0 right-0 rounded-full bg-green-500 border-2 border-background',
        sizeClasses[size],
        className
      )}
    />
  );
};
