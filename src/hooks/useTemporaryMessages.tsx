import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TemporaryMessagesConfig {
  chatPartnerId: string;
  userId: string;
  duration: string;
}

export const useTemporaryMessages = ({ chatPartnerId, userId, duration }: TemporaryMessagesConfig) => {
  useEffect(() => {
    if (duration === 'disabled') return;

    const getDurationMs = () => {
      switch (duration) {
        case '5min':
          return 5 * 60 * 1000;
        case '1h':
          return 60 * 60 * 1000;
        case '24h':
          return 24 * 60 * 60 * 1000;
        case '7d':
          return 7 * 24 * 60 * 60 * 1000;
        default:
          return 0;
      }
    };

    const checkAndDeleteMessages = async () => {
      const durationMs = getDurationMs();
      if (durationMs === 0) return;

      const cutoffTime = new Date(Date.now() - durationMs).toISOString();

      // Delete messages older than the configured duration
      const { error } = await supabase
        .from('messages')
        .delete()
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${chatPartnerId}),and(sender_id.eq.${chatPartnerId},receiver_id.eq.${userId})`)
        .lt('created_at', cutoffTime);

      if (error) {
        console.error('Error deleting temporary messages:', error);
      }
    };

    // Check immediately
    checkAndDeleteMessages();

    // Set up interval to check periodically (every minute)
    const interval = setInterval(checkAndDeleteMessages, 60000);

    return () => clearInterval(interval);
  }, [chatPartnerId, userId, duration]);
};
