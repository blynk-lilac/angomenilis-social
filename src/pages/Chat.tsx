import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Phone, Video, Lock, Image as ImageIcon, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import MessageBubble from '@/components/chat/MessageBubble';
import MediaPicker from '@/components/chat/MediaPicker';
import CallInterface from '@/components/call/CallInterface';
import ChatPinProtection from '@/components/chat/ChatPinProtection';
import WallpaperPicker from '@/components/chat/WallpaperPicker';
import { showNotification } from '@/utils/pushNotifications';
import { useUserPresence } from '@/hooks/useUserPresence';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';
import { useTemporaryMessages } from '@/hooks/useTemporaryMessages';
import { ChatSkeleton } from '@/components/loading/ChatSkeleton';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  message_type?: string;
  media_url?: string;
  duration?: number;
}

interface Profile {
  id: string;
  username: string;
  first_name: string;
  avatar_url: string | null;
}

export default function Chat() {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [friend, setFriend] = useState<Profile | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [activeCall, setActiveCall] = useState<{ id: string; type: 'voice' | 'video' } | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [chatSettings, setChatSettings] = useState<any>(null);
  const [sendingMessages, setSendingMessages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [wallpaper, setWallpaper] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { isOnline } = useUserPresence(friendId);
  const { typingUsers, setTyping } = useTypingIndicator(friendId || '');
  
  // Enable screenshot protection
  useScreenshotProtection(true);
  
  // Enable temporary messages if configured
  useTemporaryMessages({
    chatPartnerId: friendId || '',
    userId: user?.id || '',
    duration: chatSettings?.temporary_messages_duration || 'disabled',
  });

  useEffect(() => {
    if (!friendId) return;

    const loadData = async () => {
      const startTime = Date.now();
      await Promise.all([loadFriend(), loadChatSettings(), loadMessages(), loadWallpaper()]);
      
      // Garantir no mínimo 3 segundos de loading
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 3000 - elapsed);
      setTimeout(() => {
        setLoading(false);
      }, remaining);
    };
    
    loadData();
    const messagesCleanup = subscribeToMessages();
    const settingsCleanup = subscribeToChatSettings();

    return () => {
      messagesCleanup && messagesCleanup();
      settingsCleanup && settingsCleanup();
    };
  }, [friendId]);

  useEffect(() => {
    // Listen for settings updates from ChatPrivacyMenu
    const handleSettingsUpdate = () => {
      loadChatSettings();
    };

    window.addEventListener('chatSettingsUpdated', handleSettingsUpdate);
    
    return () => {
      window.removeEventListener('chatSettingsUpdated', handleSettingsUpdate);
    };
  }, [friendId]);

  const subscribeToChatSettings = () => {
    if (!user || !friendId) return;

    const channel = supabase
      .channel('chat-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_settings',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new as any;
          if (newData && newData.chat_partner_id === friendId) {
            loadChatSettings();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadChatSettings = async () => {
    if (!user || !friendId) return;

    const { data } = await supabase
      .from('chat_settings')
      .select('*')
      .eq('user_id', user.id)
      .eq('chat_partner_id', friendId)
      .single();

    if (data) {
      setChatSettings(data);
      if (data.is_locked && !isUnlocked) {
        setIsUnlocked(false);
      } else {
        setIsUnlocked(true);
      }
    } else {
      setIsUnlocked(true);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadFriend = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', friendId)
      .single();
    
    if (data) setFriend(data);
  };

  const loadWallpaper = async () => {
    if (!user || !friendId) return;

    const { data } = await supabase
      .from('chat_wallpapers')
      .select('wallpaper_url')
      .eq('user_id', user.id)
      .eq('chat_partner_id', friendId)
      .single();

    if (data) {
      setWallpaper(data.wallpaper_url);
    }
  };

  const loadMessages = async () => {
    if (!user || !friendId) return;

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);

    // Mark messages as read
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('receiver_id', user.id)
      .eq('sender_id', friendId);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          if (
            (newMsg.sender_id === user?.id && newMsg.receiver_id === friendId) ||
            (newMsg.sender_id === friendId && newMsg.receiver_id === user?.id)
          ) {
            setMessages(prev => [...prev, newMsg]);
            
            // Show notification if message is from friend
            if (newMsg.sender_id === friendId && document.hidden) {
              // Load sender profile for avatar
              const { data: senderProfile } = await supabase
                .from('profiles')
                .select('avatar_url, first_name')
                .eq('id', friendId)
                .single();

              showNotification(senderProfile?.first_name || 'Nova mensagem', {
                body: newMsg.content || 'Mídia recebida',
                icon: senderProfile?.avatar_url || '/logo-192.png',
                data: {
                  avatar: senderProfile?.avatar_url,
                },
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (value.trim()) {
      setTyping(true);
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, 2000);
    } else {
      setTyping(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !friendId) return;

    const messageText = newMessage.trim();
    
    // Evita envios duplicados rápidos
    if (sendingMessages.has(messageText)) {
      return;
    }

    setTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setSendingMessages(prev => new Set(prev).add(messageText));
    setNewMessage('');

    // Envia diretamente para o servidor (realtime vai mostrar a mensagem)
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: friendId,
      content: messageText,
      message_type: 'text',
    });

    setSendingMessages(prev => {
      const newSet = new Set(prev);
      newSet.delete(messageText);
      return newSet;
    });

    if (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleMediaSelect = async (url: string, type: 'image' | 'video' | 'audio', duration?: number) => {
    if (!user || !friendId) return;

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: friendId,
      content: '',
      message_type: type,
      media_url: url,
      duration,
    });

    if (error) {
      console.error('Error sending media:', error);
    }
  };

  const startCall = async (type: 'voice' | 'video') => {
    if (!user || !friendId) return;

    const { data, error } = await supabase
      .from('calls')
      .insert({
        caller_id: user.id,
        receiver_id: friendId,
        call_type: type,
      })
      .select()
      .single();

    if (!error && data) {
      setActiveCall({ id: data.id, type });
    }
  };

  // Show PIN protection if chat is locked
  if (chatSettings?.is_locked && !isUnlocked && chatSettings?.pin_code) {
    return (
      <ChatPinProtection
        correctPin={chatSettings.pin_code}
        chatPartnerName={friend?.first_name || 'Usuário'}
        chatPartnerId={friendId || ''}
        onUnlock={() => setIsUnlocked(true)}
      />
    );
  }

  if (activeCall) {
    return (
      <CallInterface
        callId={activeCall.id}
        isVideo={activeCall.type === 'video'}
        onEnd={() => setActiveCall(null)}
      />
    );
  }

  if (loading || !friend) {
    return <ChatSkeleton />;
  }

  const isTyping = typingUsers.size > 0;

  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
      {/* Header - Fixed */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex-shrink-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border px-2 sm:px-4 py-2 sm:py-3 safe-area-top"
      >
        <div className="flex items-center gap-2 sm:gap-3 w-full">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/messages')}
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-full flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </motion.div>
          
          <motion.div 
            className="relative flex-shrink-0 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            onClick={() => navigate(`/profile/${friend.username}`)}
          >
            <Avatar className="h-10 w-10 sm:h-11 sm:w-11 ring-2 ring-primary/20">
              <AvatarImage src={friend.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-sm sm:text-base">
                {friend.first_name[0]}
              </AvatarFallback>
            </Avatar>
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`absolute bottom-0 right-0 h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full border-2 border-card ${isOnline ? 'bg-green-500' : 'bg-muted-foreground'}`}
            >
              {isOnline && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-green-500"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </motion.div>
          </motion.div>
          
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm sm:text-base text-foreground truncate">{friend.first_name}</p>
            <AnimatePresence mode="wait">
              {isTyping ? (
                <motion.div 
                  key="typing"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="flex items-center gap-1 text-xs text-primary"
                >
                  <span>Escrevendo</span>
                  <div className="flex gap-0.5">
                    <motion.div 
                      className="w-1 h-1 bg-primary rounded-full"
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div 
                      className="w-1 h-1 bg-primary rounded-full"
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
                    />
                    <motion.div 
                      className="w-1 h-1 bg-primary rounded-full"
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.p 
                  key="status"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-xs text-muted-foreground truncate"
                >
                  {isOnline ? 'Online agora' : 'Offline'}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-10 sm:w-10 rounded-full hover:bg-primary/10"
                onClick={() => startCall('voice')}
              >
                <Phone className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="hidden xs:block">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-10 sm:w-10 rounded-full hover:bg-primary/10"
                onClick={() => startCall('video')}
              >
                <Video className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-10 sm:w-10 rounded-full hover:bg-primary/10"
                onClick={() => navigate(`/chat/${friendId}/settings`)}
              >
                <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Messages - Scrollable */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-3 space-y-2 relative"
        style={wallpaper ? {
          backgroundImage: `url(${wallpaper})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        } : undefined}
      >
        {wallpaper && (
          <div className="absolute inset-0 bg-background/30 backdrop-blur-[1px]" />
        )}
        <div className="relative z-10 space-y-2 pb-2">
          <AnimatePresence>
            {messages.map((message, index) => {
              const isSent = message.sender_id === user?.id;
              const hideMedia = chatSettings && !chatSettings.media_visibility;
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index > messages.length - 3 ? 0 : 0 }}
                  className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                >
                  <MessageBubble
                    message={message}
                    isSent={isSent}
                    hideMedia={hideMedia}
                    contextType="chat"
                    contextId={friendId || ''}
                    onDeleteLocal={(id) =>
                      setMessages((prev) => prev.filter((m) => m.id !== id))
                    }
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - Fixed */}
      <motion.form
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onSubmit={sendMessage}
        className="flex-shrink-0 bg-card/95 backdrop-blur-lg border-t border-border px-2 sm:px-4 py-2 sm:py-3 safe-area-bottom"
      >
        <div className="flex gap-2 sm:gap-3 items-center">
          <MediaPicker onMediaSelect={handleMediaSelect} />
          <Input
            value={newMessage}
            onChange={(e) => handleTyping(e.target.value)}
            placeholder="Mensagem..."
            className="flex-1 h-11 text-sm sm:text-base rounded-full border-border/50 bg-muted/50 focus-visible:ring-primary transition-all"
          />
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              type="submit"
              size="icon"
              className="rounded-full h-11 w-11 flex-shrink-0 bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg transition-all"
              disabled={!newMessage.trim()}
            >
              <Send className="h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </motion.form>

      <WallpaperPicker
        open={showWallpaperPicker}
        onClose={() => setShowWallpaperPicker(false)}
        chatPartnerId={friendId || ''}
        currentWallpaper={wallpaper}
        onWallpaperChange={setWallpaper}
      />
    </div>
  );
}
