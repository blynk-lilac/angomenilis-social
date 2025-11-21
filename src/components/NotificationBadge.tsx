import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
  count: number;
  className?: string;
}

export const NotificationBadge = ({ count, className }: NotificationBadgeProps) => {
  if (count === 0) return null;

  const displayCount = count > 15 ? '15+' : count.toString();

  return (
    <div
      className={cn(
        'absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-destructive text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-background',
        className
      )}
    >
      {displayCount}
    </div>
  );
};
