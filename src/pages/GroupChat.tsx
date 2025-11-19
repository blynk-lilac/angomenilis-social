import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Users, Phone, Lock, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import MessageBubble from '@/components/chat/MessageBubble';
import MediaPicker from '@/components/chat/MediaPicker';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  message_type?: string;
  media_url?: string;
  duration?: number;
  profiles: {
    first_name: string;
    avatar_url: string | null;
  };
}

interface Group {
  id: string;
  name: string;
  avatar_url: string | null;
}

export default function GroupChat() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (groupId) {
      loadGroup();
      loadMessages();
      subscribeToMessages();
    }
  }, [groupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadGroup = async () => {
    const { data } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();
    
    if (data) setGroup(data);
  };

  const loadMessages = async () => {
    if (!groupId) return;

    const { data } = await supabase
      .from('group_messages')
      .select('*, profiles(first_name, avatar_url)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (data) setMessages(data as Message[]);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('group-chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, avatar_url')
            .eq('id', payload.new.sender_id)
            .single();

          const newMsg = {
            ...payload.new,
            profiles: profile,
          } as Message;

          setMessages(prev => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !groupId) return;

    await supabase.from('group_messages').insert({
      group_id: groupId,
      sender_id: user.id,
      content: newMessage.trim(),
      message_type: 'text',
    });

    setNewMessage('');
  };

  const handleMediaSelect = async (url: string, type: 'image' | 'video' | 'audio', duration?: number) => {
    if (!user || !groupId) return;

    await supabase.from('group_messages').insert({
      group_id: groupId,
      sender_id: user.id,
      content: '',
      message_type: type,
      media_url: url,
      duration,
    });
  };

  if (!group) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-chat-bg">
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/grupos')}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <Avatar 
              className="h-10 w-10 cursor-pointer"
              onClick={() => navigate(`/grupo/${groupId}/configuracoes`)}
            >
              <AvatarImage src={group.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Users className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            
            <div 
              className="flex-1 cursor-pointer"
              onClick={() => navigate(`/grupo/${groupId}/configuracoes`)}
            >
              <p className="font-semibold text-foreground">{group.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Phone className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Lock className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="rounded-full"
              onClick={() => navigate(`/grupo/${groupId}/configuracoes`)}
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message) => {
          const isSent = message.sender_id === user?.id;
          return (
            <div key={message.id}>
              {!isSent && (
                <div className="flex items-center gap-2 mb-1">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={message.profiles.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {message.profiles.first_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">
                    {message.profiles.first_name}
                  </span>
                </div>
              )}
              <div className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                <MessageBubble message={message} isSent={isSent} />
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={sendMessage}
        className="sticky bottom-0 bg-card border-t border-border p-4"
      >
        <div className="flex gap-2 items-center">
          <MediaPicker onMediaSelect={handleMediaSelect} />
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escrever mensagem..."
            className="flex-1 h-12 rounded-full border-2 pr-4"
          />
          <Button
            type="submit"
            size="icon"
            className="rounded-full h-12 w-12 flex-shrink-0"
            disabled={!newMessage.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
