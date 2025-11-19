import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUserPresence = (userId?: string) => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = new Set<string>();
        
        Object.values(state).forEach((presences: any) => {
          if (Array.isArray(presences)) {
            presences.forEach((presence: any) => {
              if (presence.user_id) {
                users.add(presence.user_id);
              }
            });
          }
        });
        
        setOnlineUsers(users);
        
        if (userId) {
          setIsOnline(users.has(userId));
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (Array.isArray(newPresences)) {
          newPresences.forEach((presence: any) => {
            if (presence.user_id) {
              setOnlineUsers((prev) => new Set(prev).add(presence.user_id));
              if (userId && presence.user_id === userId) {
                setIsOnline(true);
              }
            }
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        if (Array.isArray(leftPresences)) {
          leftPresences.forEach((presence: any) => {
            if (presence.user_id) {
              setOnlineUsers((prev) => {
                const newSet = new Set(prev);
                newSet.delete(presence.user_id);
                return newSet;
              });
              if (userId && presence.user_id === userId) {
                setIsOnline(false);
              }
            }
          });
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userId]);

  return { isOnline, onlineUsers };
};
