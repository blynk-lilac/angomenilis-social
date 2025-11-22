import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Settings, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  media_url: string | null;
  sender: {
    first_name: string;
    avatar_url: string | null;
  };
  reactions?: Reaction[];
}

interface Channel {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  follower_count: number;
}

export default function ChannelView() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (channelId) {
      fetchChannel();
      fetchMessages();
      checkFollowing();
      subscribeToMessages();
    }
  }, [channelId]);

  const fetchChannel = async () => {
    try {
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .eq("id", channelId)
        .single();

      if (error) throw error;
      setChannel(data);
    } catch (error) {
      console.error("Error fetching channel:", error);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("channel_messages")
        .select(`
          *,
          profiles!channel_messages_sender_id_fkey (
            first_name,
            avatar_url
          )
        `)
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const formattedMessages = data?.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        sender_id: msg.sender_id,
        created_at: msg.created_at,
        media_url: msg.media_url,
        sender: msg.profiles,
        reactions: generateMockReactions()
      })) || [];

      setMessages(formattedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const generateMockReactions = (): Reaction[] => {
    const reactionTypes = [
      { emoji: "❤️", count: Math.floor(Math.random() * 100), users: [] },
      { emoji: "👍", count: Math.floor(Math.random() * 50), users: [] },
      { emoji: "😂", count: Math.floor(Math.random() * 30), users: [] }
    ];
    
    return reactionTypes
      .filter(r => r.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  };

  const checkFollowing = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("channel_followers")
        .select("id")
        .eq("channel_id", channelId)
        .eq("user_id", user.id)
        .single();

      setIsFollowing(!!data);
    } catch (error) {
      console.error("Error checking following:", error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`channel-messages-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "channel_messages",
          filter: `channel_id=eq.${channelId}`
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const toggleFollow = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (isFollowing) {
        const { error } = await supabase
          .from("channel_followers")
          .delete()
          .eq("channel_id", channelId)
          .eq("user_id", user.id);

        if (error) throw error;
        setIsFollowing(false);
        toast.success("Deixaste de seguir o canal");
      } else {
        const { error } = await supabase
          .from("channel_followers")
          .insert({
            channel_id: channelId,
            user_id: user.id
          });

        if (error) throw error;
        setIsFollowing(true);
        toast.success("A seguir o canal!");
      }

      fetchChannel();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (!channel) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Avatar className="h-10 w-10">
              <AvatarImage src={channel.avatar_url || ""} />
              <AvatarFallback>{channel.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-semibold text-lg">{channel.name}</h1>
              <p className="text-sm text-muted-foreground">
                Canal · {channel.follower_count.toLocaleString()} membro(s)
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => navigate(`/channels/${channelId}/invites`)}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="p-4 space-y-4 pb-24">
        {messages.map((message, index) => {
          const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id;
          
          return (
            <div key={message.id} className="space-y-2">
              <div className="flex gap-2">
                {showAvatar ? (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={message.sender.avatar_url || ""} />
                    <AvatarFallback>
                      {message.sender.first_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="w-8 flex-shrink-0" />
                )}
                
                <div className="flex-1 space-y-2">
                  {showAvatar && (
                    <p className="text-sm font-semibold text-foreground">
                      {message.sender.first_name}
                    </p>
                  )}
                  
                  {message.media_url && (
                    <img
                      src={message.media_url}
                      alt="Message media"
                      className="rounded-xl max-w-md w-full"
                    />
                  )}
                  
                  {message.content && (
                    <div className="bg-muted/60 rounded-2xl px-4 py-2.5 inline-block max-w-md">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  )}
                  
                  {/* Reactions */}
                  {message.reactions && message.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {message.reactions.map((reaction, idx) => (
                        <button
                          key={idx}
                          className="flex items-center gap-1.5 bg-background border border-border hover:border-primary/50 rounded-full px-3 py-1.5 transition-all"
                        >
                          <span className="text-base">{reaction.emoji}</span>
                          <span className="text-sm font-medium text-foreground">
                            {reaction.count}
                          </span>
                        </button>
                      ))}
                      {message.reactions.length > 3 && (
                        <button className="flex items-center justify-center h-8 w-8 bg-background border border-border hover:border-primary/50 rounded-full text-xs font-medium">
                          +{message.reactions.length - 3}
                        </button>
                      )}
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    {new Date(message.created_at).toLocaleString("pt-PT", {
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                </div>

                {/* Share Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom notice */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4">
        <p className="text-sm text-center text-muted-foreground">
          Só {channel.name} pode enviar mensagens. Podes reagir e votar em sondagens.
        </p>
      </div>
    </div>
  );
}
