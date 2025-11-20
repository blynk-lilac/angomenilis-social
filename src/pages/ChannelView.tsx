import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import MessageBubble from '@/components/chat/MessageBubble';
import MediaPicker from '@/components/chat/MediaPicker';
import { Hash, Send, MoreVertical, Settings } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Channel {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  follower_count: number;
  created_by: string;
}

interface Message {
  id: string;
  content: string;
  media_url: string | null;
  message_type: string;
  duration: number | null;
  created_at: string;
  sender_id: string;
  profiles: {
    first_name: string;
    avatar_url: string | null;
  };
}

export default function ChannelView() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (channelId && user) {
      loadChannel();
      loadMessages();
      checkFollowing();
      checkAdmin();
      subscribeToMessages();
    }
  }, [channelId, user]);

  const loadChannel = async () => {
    if (!channelId) return;

    const { data } = await supabase
      .from('channels')
      .select('*')
      .eq('id', channelId)
      .single();

    if (data) setChannel(data);
  };

  const loadMessages = async () => {
    if (!channelId) return;

    const { data: messagesData } = await supabase
      .from('channel_messages')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true });

    if (messagesData) {
      const messagesWithProfiles = await Promise.all(
        messagesData.map(async (msg) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, avatar_url')
            .eq('id', msg.sender_id)
            .single();

          return {
            ...msg,
            profiles: profile || { first_name: 'Usuário', avatar_url: null },
          };
        })
      );
      setMessages(messagesWithProfiles);
    }
  };

  const checkFollowing = async () => {
    if (!channelId || !user) return;

    const { data } = await supabase
      .from('channel_followers')
      .select('id')
      .eq('channel_id', channelId)
      .eq('user_id', user.id)
      .single();

    setIsFollowing(!!data);
  };

  const checkAdmin = async () => {
    if (!channelId || !user) return;

    const { data: adminData } = await supabase
      .from('channel_admins')
      .select('id')
      .eq('channel_id', channelId)
      .eq('user_id', user.id)
      .single();

    const isCreator = channel?.created_by === user.id;
    setIsAdmin(!!adminData || isCreator);
  };

  const subscribeToMessages = () => {
    if (!channelId) return;

    const channel = supabase
      .channel(`channel-messages-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'channel_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const toggleFollow = async () => {
    if (!channelId || !user) return;

    if (isFollowing) {
      const { error } = await supabase
        .from('channel_followers')
        .delete()
        .eq('channel_id', channelId)
        .eq('user_id', user.id);

      if (!error) {
        setIsFollowing(false);
        toast({ title: 'Deixou de seguir o canal' });
      }
    } else {
      const { error } = await supabase
        .from('channel_followers')
        .insert({
          channel_id: channelId,
          user_id: user.id,
        });

      if (!error) {
        setIsFollowing(true);
        toast({ title: 'Seguindo o canal!' });
      }
    }

    loadChannel();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !channelId || !user || !isAdmin) return;

    setSending(true);

    const { error } = await supabase
      .from('channel_messages')
      .insert({
        channel_id: channelId,
        sender_id: user.id,
        content: newMessage.trim(),
        message_type: 'text',
      });

    setSending(false);

    if (error) {
      toast({
        title: 'Erro ao enviar',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setNewMessage('');
    }
  };

  const handleMediaSelect = async (url: string, type: 'image' | 'video' | 'audio', duration?: number) => {
    if (!channelId || !user || !isAdmin) return;

    const { error } = await supabase
      .from('channel_messages')
      .insert({
        channel_id: channelId,
        sender_id: user.id,
        content: type === 'audio' ? 'Mensagem de voz' : 'Mídia',
        media_url: url,
        message_type: type,
        duration: duration || null,
      });

    if (error) {
      toast({
        title: 'Erro ao enviar mídia',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (!channel) return null;

  return (
    <MainLayout title={channel.name}>
      <div className="flex flex-col h-full">
        {/* Channel Info */}
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center space-x-3">
            <Avatar className="h-16 w-16">
              <AvatarImage src={channel.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Hash className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="font-semibold text-lg">{channel.name}</h2>
              <p className="text-sm text-muted-foreground">
                {channel.follower_count.toLocaleString()} seguidores
              </p>
            </div>
          </div>

          {channel.description && (
            <p className="text-sm">{channel.description}</p>
          )}

          <Button
            onClick={toggleFollow}
            variant={isFollowing ? 'secondary' : 'default'}
            className="w-full"
          >
            {isFollowing ? 'A seguir' : 'Seguir'}
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 message-container">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
              <div className="message-bubble">
                <MessageBubble
                  message={message}
                  isSent={message.sender_id === user?.id}
                  isGroupMessage="channel"
                  contextType="channel"
                  contextId={channelId || ''}
                  onDeleteLocal={(id) =>
                    setMessages((prev) => prev.filter((m) => m.id !== id))
                  }
                />
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input - Only for admins */}
        {isAdmin && (
          <div className="p-4 border-t">
            <div className="flex items-center space-x-2">
              <MediaPicker onMediaSelect={handleMediaSelect} />
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Escrever mensagem..."
                disabled={sending}
                className="flex-1 px-4 py-2 bg-secondary rounded-full focus:outline-none message-input"
              />
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                size="icon"
                className="rounded-full"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {!isFollowing && !isAdmin && (
          <div className="p-4 bg-muted text-center text-sm">
            Siga o canal para ver todas as mensagens
          </div>
        )}
      </div>
    </MainLayout>
  );
}
