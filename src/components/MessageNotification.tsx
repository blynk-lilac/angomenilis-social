import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { showNotification } from '@/utils/pushNotifications';

interface Notification {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  content: string;
}

export const MessageNotification = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notification, setNotification] = useState<Notification | null>(null);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('new-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload: any) => {
          // Get sender profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, avatar_url')
            .eq('id', payload.new.sender_id)
            .single();

          if (profile) {
            const notifData = {
              id: payload.new.id,
              senderId: payload.new.sender_id,
              senderName: profile.first_name,
              senderAvatar: profile.avatar_url,
              content: payload.new.content,
            };

            setNotification(notifData);

            // Show native notification
            showNotification(`${profile.first_name} enviou uma mensagem`, {
              body: payload.new.content,
              icon: profile.avatar_url || '/logo-192.png',
              tag: `message-${payload.new.id}`,
              data: {
                url: `/chat/${payload.new.sender_id}`,
                avatar: profile.avatar_url,
              },
            });

            // Auto-hide after 5 seconds
            setTimeout(() => setNotification(null), 5000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleClick = () => {
    if (notification) {
      navigate(`/chat/${notification.senderId}`);
      setNotification(null);
    }
  };

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-[90%] max-w-md"
        >
          <div
            onClick={handleClick}
            className="bg-card border border-border rounded-lg shadow-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12 flex-shrink-0">
                <AvatarImage src={notification.senderAvatar || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {notification.senderName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{notification.senderName}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {notification.content}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setNotification(null);
                }}
                className="p-1 hover:bg-muted rounded-full transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
