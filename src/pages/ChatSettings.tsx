import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Phone, 
  Video, 
  User, 
  Bell, 
  BellOff,
  Mail,
  Share2,
  ThumbsUp,
  Type,
  Lock,
  Shield,
  Clock
} from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  first_name: string;
  avatar_url: string | null;
}

export default function ChatSettings() {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [friend, setFriend] = useState<Profile | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [chatSettings, setChatSettings] = useState<any>(null);

  useEffect(() => {
    if (friendId) {
      loadFriend();
      loadChatSettings();
    }
  }, [friendId]);

  const loadFriend = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', friendId)
      .single();
    
    if (data) setFriend(data);
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
    }
  };

  const toggleMute = async () => {
    setIsMuted(!isMuted);
    // Implementar lógica de mute
  };

  if (!friend) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Header */}
      <header className="flex-shrink-0 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/chat/${friendId}`)}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Profile Section */}
        <div className="flex flex-col items-center py-6 px-4">
          <div className="relative mb-3">
            <Avatar className="h-24 w-24">
              <AvatarImage src={friend.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                {friend.first_name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 text-xs bg-muted px-2 py-0.5 rounded-full">
              2h
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-2">{friend.first_name}</h1>
          
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full mb-4">
            <Lock className="h-4 w-4" />
            <span className="text-sm">Encriptado ponto a ponto</span>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-4 gap-4 w-full max-w-md mb-6">
            <button
              onClick={() => navigate(`/chamada/${friendId}?type=voice`)}
              className="flex flex-col items-center gap-2"
            >
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Phone className="h-6 w-6" />
              </div>
              <span className="text-xs">Chamada</span>
            </button>

            <button
              onClick={() => navigate(`/chamada/${friendId}?type=video`)}
              className="flex flex-col items-center gap-2"
            >
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Video className="h-6 w-6" />
              </div>
              <span className="text-xs">Conversa de vídeo</span>
            </button>

            <button
              onClick={() => navigate(`/profile/${friendId}`)}
              className="flex flex-col items-center gap-2"
            >
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <User className="h-6 w-6" />
              </div>
              <span className="text-xs">Perfil</span>
            </button>

            <button
              onClick={toggleMute}
              className="flex flex-col items-center gap-2"
            >
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                {isMuted ? <BellOff className="h-6 w-6" /> : <Bell className="h-6 w-6" />}
              </div>
              <span className="text-xs">Silenciar</span>
            </button>
          </div>
        </div>

        {/* Actions Section */}
        <div className="px-4 py-2">
          <h2 className="text-lg font-semibold mb-3">Ações</h2>
          
          <button className="w-full flex items-center gap-4 p-3 hover:bg-accent rounded-lg transition-colors">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Mail className="h-5 w-5" />
            </div>
            <span className="text-base">Marcar como não lida</span>
          </button>

          <button 
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `Contacto: ${friend.first_name}`,
                  text: `Partilhar contacto de ${friend.first_name}`,
                });
              }
            }}
            className="w-full flex items-center gap-4 p-3 hover:bg-accent rounded-lg transition-colors"
          >
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Share2 className="h-5 w-5" />
            </div>
            <span className="text-base">Partilhar contacto</span>
          </button>
        </div>

        {/* Personalization Section */}
        <div className="px-4 py-2 mt-4">
          <h2 className="text-lg font-semibold mb-3">Personalização</h2>
          
          <button className="w-full flex items-center gap-4 p-3 hover:bg-accent rounded-lg transition-colors">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <ThumbsUp className="h-5 w-5 text-primary" />
            </div>
            <span className="text-base">Reação rápida</span>
          </button>

          <button className="w-full flex items-center gap-4 p-3 hover:bg-accent rounded-lg transition-colors">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Type className="h-5 w-5" />
            </div>
            <span className="text-base">Alcunhas</span>
          </button>
        </div>

        {/* Privacy & Support Section */}
        <div className="px-4 py-2 mt-4 pb-8">
          <h2 className="text-lg font-semibold mb-3">Privacidade e suporte</h2>
          
          <button className="w-full flex items-center gap-4 p-3 hover:bg-accent rounded-lg transition-colors">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Lock className="h-5 w-5" />
            </div>
            <span className="text-base">Verificar encriptação ponto a ponto</span>
          </button>

          <button className="w-full flex items-center gap-4 p-3 hover:bg-accent rounded-lg transition-colors">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <span className="text-base">Permissões de mensagens</span>
          </button>

          <button 
            onClick={() => {
              // Navegar para configurações de mensagens temporárias se necessário
            }}
            className="w-full flex items-center gap-4 p-3 hover:bg-accent rounded-lg transition-colors"
          >
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <span className="text-base">Mensagens temporárias</span>
          </button>
        </div>
      </div>
    </div>
  );
}
