import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Phone, Video, Image as ImageIcon, MoreVertical, Mic, Smile, Paperclip, Check, CheckCheck, Camera, Sticker, Plus } from 'lucide-react';
import { format } from 'date-fns';
import MediaPicker from '@/components/chat/MediaPicker';
import CallInterface from '@/components/call/CallInterface';
import ChatPinProtection from '@/components/chat/ChatPinProtection';
import WallpaperPicker from '@/components/chat/WallpaperPicker';
import AudioWaveform from '@/components/chat/AudioWaveform';
import TypingIndicator from '@/components/chat/TypingIndicator';
import MessageActionsSheet from '@/components/chat/MessageActionsSheet';
import { showNotification } from '@/utils/pushNotifications';
import { useUserPresence } from '@/hooks/useUserPresence';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';
import { useTemporaryMessages } from '@/hooks/useTemporaryMessages';
import { ChatSkeleton } from '@/components/loading/ChatSkeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  message_type?: string;
  media_url?: string;
  duration?: number;
  read?: boolean;
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
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { isOnline } = useUserPresence(friendId);
  const { typingUsers, setTyping } = useTypingIndicator(friendId || '');
  
  useScreenshotProtection(true);
  
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
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 2000 - elapsed);
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
            
            if (newMsg.sender_id === friendId && document.hidden) {
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
    
    if (sendingMessages.has(messageText)) {
      return;
    }

    setTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setSendingMessages(prev => new Set(prev).add(messageText));
    setNewMessage('');

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const folder = type === 'image' ? 'images' : 'videos';

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(`${folder}/${fileName}`, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('chat-media')
        .getPublicUrl(`${folder}/${fileName}`);

      handleMediaSelect(data.publicUrl, type);
    } catch (error) {
      console.error('Upload error:', error);
    }
    
    e.target.value = '';
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

  // Group messages by date
  const groupedMessages = messages.reduce((acc, msg) => {
    const date = format(new Date(msg.created_at), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(msg);
    return acc;
  }, {} as Record<string, Message[]>);

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === format(today, 'yyyy-MM-dd')) {
      return 'Hoje';
    } else if (dateStr === format(yesterday, 'yyyy-MM-dd')) {
      return 'Ontem';
    } else {
      return format(date, 'dd/MM/yyyy');
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
      {/* WhatsApp-style Header */}
      <header className="flex-shrink-0 z-50 bg-primary text-primary-foreground px-3 py-2 safe-area-top">
        <div className="flex items-center gap-3 w-full">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/messages')}
            className="h-9 w-9 rounded-full text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div 
            className="relative flex-shrink-0 cursor-pointer"
            onClick={() => navigate(`/profile/${friend.id}`)}
          >
            <Avatar className="h-10 w-10 border-2 border-primary-foreground/20">
              <AvatarImage src={friend.avatar_url || undefined} />
              <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-sm">
                {friend.first_name[0]}
              </AvatarFallback>
            </Avatar>
            {isOnline && (
              <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-400 border-2 border-primary" />
            )}
          </div>
          
          <div 
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => navigate(`/profile/${friend.id}`)}
          >
            <p className="font-semibold text-sm truncate">{friend.first_name}</p>
            <AnimatePresence mode="wait">
              {isTyping ? (
                <motion.p 
                  key="typing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-primary-foreground/80"
                >
                  digitando...
                </motion.p>
              ) : (
                <motion.p 
                  key="status"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-primary-foreground/70"
                >
                  {isOnline ? 'online' : 'offline'}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => startCall('video')}
            >
              <Video className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => startCall('voice')}
            >
              <Phone className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => navigate(`/chat/${friendId}/settings`)}
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Messages Area with WhatsApp-style background */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2"
        style={{
          backgroundImage: wallpaper ? `url(${wallpaper})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: wallpaper ? undefined : 'hsl(var(--muted))',
        }}
      >
        <div className="max-w-3xl mx-auto space-y-1">
          {Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              {/* Date Label */}
              <div className="flex justify-center my-3">
                <span className="px-3 py-1 text-xs bg-card/90 backdrop-blur-sm text-muted-foreground rounded-lg shadow-sm">
                  {formatDateLabel(date)}
                </span>
              </div>

              {/* Messages */}
              {msgs.map((message, index) => {
                const isOwn = message.sender_id === user?.id;
                const showAvatar = !isOwn && (index === 0 || msgs[index - 1]?.sender_id !== message.sender_id);
                
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}
                  >
                    <div className={`flex items-end gap-1 max-w-[80%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!isOwn && showAvatar && (
                        <Avatar className="h-6 w-6 flex-shrink-0">
                          <AvatarImage src={friend.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">{friend.first_name[0]}</AvatarFallback>
                        </Avatar>
                      )}
                      {!isOwn && !showAvatar && <div className="w-6" />}
                      
                      <div
                        className={`relative px-3 py-2 rounded-2xl shadow-sm ${
                          isOwn
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-card text-foreground rounded-bl-md'
                        }`}
                      >
                        {/* Tail */}
                        <div 
                          className={`absolute bottom-0 w-3 h-3 ${
                            isOwn 
                              ? 'right-0 translate-x-1/2 bg-primary' 
                              : 'left-0 -translate-x-1/2 bg-card'
                          }`}
                          style={{
                            clipPath: isOwn 
                              ? 'polygon(0 0, 100% 100%, 0 100%)' 
                              : 'polygon(100% 0, 100% 100%, 0 100%)'
                          }}
                        />
                        
                        {message.message_type === 'image' && message.media_url && (
                          <img 
                            src={message.media_url} 
                            alt="Image" 
                            className="rounded-lg max-w-full max-h-64 object-contain mb-1"
                          />
                        )}
                        
                        {message.message_type === 'video' && message.media_url && (
                          <video 
                            src={message.media_url} 
                            controls 
                            className="rounded-lg max-w-full max-h-64 mb-1"
                          />
                        )}
                        
                        {message.message_type === 'audio' && message.media_url && (
                          <div className="flex items-center gap-2 min-w-[200px]">
                            <Avatar className="h-10 w-10 flex-shrink-0">
                              <AvatarImage src={isOwn ? undefined : friend.avatar_url || undefined} />
                              <AvatarFallback className={isOwn ? 'bg-primary-foreground/20' : ''}>
                                {isOwn ? user?.email?.[0]?.toUpperCase() : friend.first_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <audio 
                              src={message.media_url} 
                              controls 
                              className="flex-1 h-8"
                            />
                            {message.duration && (
                              <span className={`text-xs ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                {Math.floor(message.duration / 60)}:{(message.duration % 60).toString().padStart(2, '0')}
                              </span>
                            )}
                          </div>
                        )}
                        
                        {message.content && (
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        )}
                        
                        <div className={`flex items-center gap-1 justify-end mt-1 ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                          <span className="text-[10px]">
                            {format(new Date(message.created_at), 'HH:mm')}
                          </span>
                          {isOwn && (
                            message.read ? (
                              <CheckCheck className="h-3 w-3 text-blue-400" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}
          
          {/* Typing Indicator */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex justify-start mb-2"
              >
                <div className="flex items-center gap-1 px-4 py-2 bg-card rounded-2xl shadow-sm">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 bg-muted-foreground rounded-full"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* WhatsApp-style Input Area */}
      <div className="flex-shrink-0 bg-card border-t border-border px-2 py-2 safe-area-bottom">
        <form onSubmit={sendMessage} className="flex items-center gap-2 max-w-3xl mx-auto">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground"
          >
            <Smile className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              type="text"
              value={newMessage}
              onChange={(e) => handleTyping(e.target.value)}
              placeholder="Mensagem"
              className="h-10 rounded-full bg-muted/50 border-0 pr-12 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e, 'image')}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e, 'video')}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => imageInputRef.current?.click()}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </div>
          
          {newMessage.trim() ? (
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90"
            >
              <Send className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90"
            >
              <Mic className="h-5 w-5" />
            </Button>
          )}
        </form>
      </div>

      {/* Wallpaper Picker */}
      <WallpaperPicker
        open={showWallpaperPicker}
        chatPartnerId={friendId || ''}
        onClose={() => setShowWallpaperPicker(false)}
        currentWallpaper={wallpaper}
        onWallpaperChange={(url) => setWallpaper(url)}
      />
    </div>
  );
}
