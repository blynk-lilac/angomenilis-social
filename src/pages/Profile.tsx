import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageCircle, UserPlus, UserCheck } from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  first_name: string;
  avatar_url: string | null;
}

export default function Profile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (username) {
      loadProfile();
    }
  }, [username]);

  const loadProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (data) {
        setProfile(data);
        checkFriendship(data.id);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFriendship = async (profileId: string) => {
    if (!user) return;

    const { data } = await supabase
      .from('friendships')
      .select('id')
      .or(`and(user_id_1.eq.${user.id},user_id_2.eq.${profileId}),and(user_id_1.eq.${profileId},user_id_2.eq.${user.id})`)
      .maybeSingle();

    setIsFriend(!!data);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center">
        <p className="text-muted-foreground mb-4">Perfil não encontrado</p>
        <Button onClick={() => navigate('/')}>Voltar</Button>
      </div>
    );
  }

  const isOwnProfile = user?.id === profile.id;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center h-14 px-4 max-w-screen-xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-primary ml-4">Perfil</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <Avatar className="h-32 w-32">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
              {profile.first_name[0]}
            </AvatarFallback>
          </Avatar>

          <div>
            <h2 className="text-2xl font-bold text-foreground">{profile.first_name}</h2>
            <p className="text-muted-foreground">@{profile.username}</p>
          </div>

          {!isOwnProfile && (
            <div className="flex gap-3 mt-6">
              {isFriend ? (
                <>
                  <Button
                    onClick={() => navigate(`/chat/${profile.id}`)}
                    className="rounded-full"
                  >
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Mensagem
                  </Button>
                  <Button variant="secondary" disabled className="rounded-full">
                    <UserCheck className="h-5 w-5 mr-2" />
                    Amigos
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => navigate('/friends')}
                  className="rounded-full"
                >
                  <UserPlus className="h-5 w-5 mr-2" />
                  Adicionar Amigo
                </Button>
              )}
            </div>
          )}

          {isOwnProfile && (
            <Button
              onClick={() => navigate('/settings')}
              variant="outline"
              className="rounded-full mt-6"
            >
              Editar Perfil
            </Button>
          )}
        </div>

        <div className="mt-8 p-4 bg-muted rounded-xl">
          <p className="text-sm text-muted-foreground mb-2">Link do perfil:</p>
          <p className="font-mono text-sm text-primary break-all">
            {window.location.origin}/perfil/{profile.username}
          </p>
        </div>
      </div>
    </div>
  );
}
