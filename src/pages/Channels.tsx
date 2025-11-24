import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Radio, Users as UsersIcon, TrendingUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Channel {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  follower_count: number;
  is_public: boolean;
  created_at: string;
}

export default function Channels() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [followedChannels, setFollowedChannels] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadChannels();
      loadFollowedChannels();
    }
  }, [user]);

  const loadChannels = async () => {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .eq('is_public', true)
      .order('follower_count', { ascending: false });

    if (error) {
      console.error('Erro ao carregar canais:', error);
      toast.error('Erro ao carregar canais');
    } else {
      setChannels(data || []);
    }
    setLoading(false);
  };

  const loadFollowedChannels = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('channel_followers')
      .select('channel_id')
      .eq('user_id', user.id);

    if (data) {
      setFollowedChannels(data.map(f => f.channel_id));
    }
  };

  const handleFollow = async (channelId: string) => {
    if (!user) return;

    const isFollowing = followedChannels.includes(channelId);

    if (isFollowing) {
      const { error } = await supabase
        .from('channel_followers')
        .delete()
        .eq('channel_id', channelId)
        .eq('user_id', user.id);

      if (!error) {
        setFollowedChannels(followedChannels.filter(id => id !== channelId));
        toast.success('Deixou de seguir o canal');
      }
    } else {
      const { error } = await supabase
        .from('channel_followers')
        .insert({ channel_id: channelId, user_id: user.id });

      if (!error) {
        setFollowedChannels([...followedChannels, channelId]);
        toast.success('Seguindo o canal!');
      }
    }
  };

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    channel.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout title="Canais">
      <div className="max-w-4xl mx-auto p-4 pt-28">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Canais</h1>
            <Button onClick={() => navigate('/canais/criar')} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Canal
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Pesquisar canais..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="p-4 text-center">
            <Radio className="h-5 w-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{channels.length}</p>
            <p className="text-xs text-muted-foreground">Canais Ativos</p>
          </Card>
          <Card className="p-4 text-center">
            <UsersIcon className="h-5 w-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{followedChannels.length}</p>
            <p className="text-xs text-muted-foreground">Seguindo</p>
          </Card>
          <Card className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">
              {channels.reduce((sum, ch) => sum + ch.follower_count, 0)}
            </p>
            <p className="text-xs text-muted-foreground">Seguidores</p>
          </Card>
        </div>

        {/* Channels List */}
        <div className="space-y-3 pb-20">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : filteredChannels.length === 0 ? (
            <Card className="p-8 text-center">
              <Radio className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhum canal encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Seja o primeiro a criar um canal!
              </p>
              <Button onClick={() => navigate('/canais/criar')}>
                Criar Canal
              </Button>
            </Card>
          ) : (
            filteredChannels.map((channel) => {
              const isFollowing = followedChannels.includes(channel.id);

              return (
                <Card key={channel.id} className="p-4 hover:bg-accent/5 transition-colors">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-14 w-14 border-2 border-border">
                      <AvatarImage src={channel.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-lg font-bold">
                        {channel.name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <Link to={`/canal/${channel.id}`}>
                        <h3 className="font-bold text-lg hover:underline truncate">
                          {channel.name}
                        </h3>
                      </Link>
                      {channel.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {channel.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <UsersIcon className="h-4 w-4" />
                          {channel.follower_count} seguidores
                        </span>
                        {channel.is_public && (
                          <Badge variant="outline" className="text-xs">Público</Badge>
                        )}
                      </div>
                    </div>

                    <Button
                      variant={isFollowing ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleFollow(channel.id)}
                      className="flex-shrink-0"
                    >
                      {isFollowing ? 'Seguindo' : 'Seguir'}
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </MainLayout>
  );
}
