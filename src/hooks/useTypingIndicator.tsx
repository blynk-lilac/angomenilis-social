import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useTypingIndicator = (chatId: string) => {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    if (!user || !chatId) return;

    const typingChannel = supabase.channel(`typing-${chatId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    typingChannel
      .on('presence', { event: 'sync' }, () => {
        const state = typingChannel.presenceState();
        const typing = new Set<string>();
        
        Object.keys(state).forEach((key) => {
          if (key !== user.id) {
            state[key].forEach((presence: any) => {
              if (presence.typing) {
                typing.add(key);
              }
            });
          }
        });
        
        setTypingUsers(typing);
      })
      .subscribe();

    setChannel(typingChannel);

    return () => {
      supabase.removeChannel(typingChannel);
    };
  }, [user, chatId]);

  const setTyping = async (isTyping: boolean) => {
    if (!channel || !user) return;
    
    await channel.track({
      user_id: user.id,
      typing: isTyping,
      timestamp: new Date().toISOString(),
    });
  };

  return { typingUsers, setTyping };
};
