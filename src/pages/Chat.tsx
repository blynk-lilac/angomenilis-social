import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Phone, Video } from 'lucide-react';
import { format } from 'date-fns';
import MessageBubble from '@/components/chat/MessageBubble';
import MediaPicker from '@/components/chat/MediaPicker';
import CallInterface from '@/components/call/CallInterface';
import ChatPrivacyMenu from '@/components/chat/ChatPrivacyMenu';
import ChatPinProtection from '@/components/chat/ChatPinProtection';
import { showNotification } from '@/utils/pushNotifications';
import { useUserPresence } from '@/hooks/useUserPresence';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';
import { useTemporaryMessages } from '@/hooks/useTemporaryMessages';

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
    if (friendId) {
      loadFriend();
      loadChatSettings();
      loadMessages();
      subscribeToMessages();
      subscribeToChatSettings();
    }
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
        (payload) => {
          const newMsg = payload.new as Message;
          if (
            (newMsg.sender_id === user?.id && newMsg.receiver_id === friendId) ||
            (newMsg.sender_id === friendId && newMsg.receiver_id === user?.id)
          ) {
            setMessages(prev => [...prev, newMsg]);
            
            // Show notification if message is from friend
            if (newMsg.sender_id === friendId && document.hidden) {
              showNotification('Nova mensagem', {
                body: newMsg.content || 'Mídia recebida',
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

    setTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    
    // Optimistic update - mostra mensagem imediatamente
    const optimisticMessage: Message = {
      id: tempId,
      content: messageText,
      sender_id: user.id,
      receiver_id: friendId,
      created_at: new Date().toISOString(),
      message_type: 'text',
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');

    // Envia para o servidor
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: friendId,
      content: messageText,
      message_type: 'text',
    });

    if (error) {
      // Remove mensagem se falhar
      setMessages(prev => prev.filter(m => m.id !== tempId));
      console.error('Error sending message:', error);
    }
  };

  const handleMediaSelect = async (url: string, type: 'image' | 'video' | 'audio', duration?: number) => {
    if (!user || !friendId) return;

    const tempId = `temp-${Date.now()}`;
    
    // Optimistic update - mostra mídia imediatamente
    const optimisticMessage: Message = {
      id: tempId,
      content: '',
      sender_id: user.id,
      receiver_id: friendId,
      created_at: new Date().toISOString(),
      message_type: type,
      media_url: url,
      duration,
    };
    
    setMessages(prev => [...prev, optimisticMessage]);

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: friendId,
      content: '',
      message_type: type,
      media_url: url,
      duration,
    });

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
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

  if (!friend) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const isTyping = typingUsers.size > 0;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header - Fixed */}
      <header className="flex-shrink-0 sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border px-4 py-3 safe-area-top">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="h-10 w-10 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="relative">
            <Avatar className="h-11 w-11">
              <AvatarImage src={friend.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-base">
                {friend.first_name[0]}
              </AvatarFallback>
            </Avatar>
            <div className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-card ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base text-foreground truncate">{friend.first_name}</p>
            {isTyping ? (
              <div className="flex items-center gap-1 text-xs text-primary">
                <span>Escrevendo</span>
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground truncate">
                {isOnline ? 'Online' : 'Offline'}
              </p>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => startCall('voice')}
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => startCall('video')}
          >
            <Video className="h-5 w-5" />
          </Button>
          {friendId && friend && (
            <ChatPrivacyMenu 
              chatPartnerId={friendId} 
              chatPartnerName={friend.first_name}
            />
          )}
        </div>
      </header>

      {/* Messages - Scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 space-y-3 bg-chat-bg">
        {messages.map((message) => {
          const isSent = message.sender_id === user?.id;
          const hideMedia = chatSettings && !chatSettings.media_visibility;
          return (
            <div
              key={message.id}
              className={`flex ${isSent ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <MessageBubble 
                message={message} 
                isSent={isSent}
                hideMedia={hideMedia}
              />
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Fixed */}
      <form
        onSubmit={sendMessage}
        className="flex-shrink-0 sticky bottom-0 bg-card/95 backdrop-blur-sm border-t border-border px-4 py-3 safe-area-bottom"
      >
        <div className="flex gap-3 items-center">
          <MediaPicker onMediaSelect={handleMediaSelect} />
          <Input
            value={newMessage}
            onChange={(e) => handleTyping(e.target.value)}
            placeholder="Mensagem..."
            className="flex-1 h-11 text-base rounded-full border-border/50 bg-background/50 focus-visible:ring-primary"
          />
          <Button
            type="submit"
            size="icon"
            className="rounded-full h-11 w-11 flex-shrink-0"
            disabled={!newMessage.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
