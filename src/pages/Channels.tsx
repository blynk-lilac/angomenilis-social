import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Hash } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Channel {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  follower_count: number;
  created_at: string;
}

export default function Channels() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [followedChannels, setFollowedChannels] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      loadChannels();
      loadFollowedChannels();
    }
  }, [user]);

  const loadChannels = async () => {
    const { data } = await supabase
      .from('channels')
      .select('*')
      .eq('is_public', true)
      .order('follower_count', { ascending: false });

    if (data) setChannels(data);
  };

  const loadFollowedChannels = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('channel_followers')
      .select('channel_id')
      .eq('user_id', user.id);

    if (data) {
      setFollowedChannels(new Set(data.map(f => f.channel_id)));
    }
  };

  return (
    <MainLayout title="Canais">
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Explorar canais</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/canais/todos')}
            >
              Ver todos
            </Button>
          </div>

          <div className="space-y-2">
            {channels.map((channel) => (
              <Button
                key={channel.id}
                onClick={() => navigate(`/canal/${channel.id}`)}
                variant="ghost"
                className="w-full justify-start h-auto p-4"
              >
                <Avatar className="h-12 w-12 mr-3">
                  <AvatarImage src={channel.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Hash className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <div className="font-medium">{channel.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {channel.follower_count.toLocaleString()} seguidores
                  </div>
                </div>
                {followedChannels.has(channel.id) && (
                  <div className="text-xs text-primary font-medium">A seguir</div>
                )}
              </Button>
            ))}
          </div>
        </div>

        <div className="fixed bottom-20 right-4 z-10">
          <Button
            onClick={() => navigate('/canais/criar')}
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
