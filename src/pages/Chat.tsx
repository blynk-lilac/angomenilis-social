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
import { showNotification } from '@/utils/pushNotifications';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (friendId) {
      loadFriend();
      loadMessages();
      subscribeToMessages();
    }
  }, [friendId]);

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

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !friendId) return;

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: friendId,
      content: newMessage.trim(),
      message_type: 'text',
    });

    if (!error) {
      setNewMessage('');
    }
  };

  const handleMediaSelect = async (url: string, type: 'image' | 'video' | 'audio', duration?: number) => {
    if (!user || !friendId) return;

    await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: friendId,
      content: '',
      message_type: type,
      media_url: url,
      duration,
    });
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

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header - Fixed */}
      <header className="flex-shrink-0 sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border px-3 py-2 safe-area-top">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="h-8 w-8 rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <Avatar className="h-9 w-9">
            <AvatarImage src={friend.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {friend.first_name[0]}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{friend.first_name}</p>
            <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => startCall('voice')}
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => startCall('video')}
          >
            <Video className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Messages - Scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 space-y-2 bg-background">
        {messages.map((message) => {
          const isSent = message.sender_id === user?.id;
          return (
            <div
              key={message.id}
              className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
            >
              <MessageBubble message={message} isSent={isSent} />
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Fixed */}
      <form
        onSubmit={sendMessage}
        className="flex-shrink-0 sticky bottom-0 bg-card/95 backdrop-blur-sm border-t border-border px-3 py-2 safe-area-bottom"
      >
        <div className="flex gap-2 items-center">
          <MediaPicker onMediaSelect={handleMediaSelect} />
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Mensagem..."
            className="flex-1 h-9 text-sm rounded-full border-border/50 bg-background/50 focus-visible:ring-primary"
          />
          <Button
            type="submit"
            size="icon"
            className="rounded-full h-9 w-9 flex-shrink-0"
            disabled={!newMessage.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
