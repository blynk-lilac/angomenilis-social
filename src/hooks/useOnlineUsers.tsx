import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useOnlineUsers = () => {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Carregar usuários online
    const loadOnlineUsers = async () => {
      const { data } = await supabase
        .from('user_presence')
        .select('user_id')
        .eq('is_online', true);

      if (data) {
        setOnlineUsers(new Set(data.map(u => u.user_id)));
      }
    };

    loadOnlineUsers();

    // Listen para mudanças em tempo real
    const channel = supabase
      .channel('user-presence-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const { user_id, is_online } = payload.new as any;
            setOnlineUsers(prev => {
              const newSet = new Set(prev);
              if (is_online) {
                newSet.add(user_id);
              } else {
                newSet.delete(user_id);
              }
              return newSet;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return onlineUsers;
};
