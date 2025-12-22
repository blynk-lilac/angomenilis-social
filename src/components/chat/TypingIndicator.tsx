import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TypingIndicatorProps {
  avatarUrl?: string | null;
  name?: string;
}

export default function TypingIndicator({ avatarUrl, name }: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="flex justify-start mb-2"
    >
      <div className="flex items-end gap-1.5">
        {avatarUrl !== undefined && (
          <Avatar className="h-6 w-6 flex-shrink-0">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="text-xs bg-muted">
              {name?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className="px-4 py-3 bg-card rounded-2xl rounded-bl-md shadow-sm">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-muted-foreground/60 rounded-full"
                animate={{ 
                  y: [0, -6, 0],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ 
                  duration: 0.8, 
                  repeat: Infinity, 
                  delay: i * 0.15,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
