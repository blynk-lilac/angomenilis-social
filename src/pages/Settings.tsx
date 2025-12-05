import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { LogOut, Camera, ChevronRight, Lock, User, Mail, Shield, Key, FileText, Settings2, CreditCard, Smartphone, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import VerificationBadge from '@/components/VerificationBadge';

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    first_name: '',
    username: '',
    avatar_url: '',
    verified: false,
    badge_type: null as string | null,
  });

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('first_name, username, avatar_url, verified, badge_type')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile({
        first_name: data.first_name || '',
        username: data.username || '',
        avatar_url: data.avatar_url || '',
        verified: data.verified || false,
        badge_type: data.badge_type,
      });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;

    const file = e.target.files[0];
    
    if (file.size > 52428800) {
      toast.error('Arquivo muito grande! Máximo 50MB');
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }
    
    const fileExt = file.name.split('.').pop();
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const fileName = `${user.id}/avatar-${uniqueSuffix}.${fileExt}`;

    try {
      toast('Enviando foto...', { duration: 2000 });
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success('Foto de perfil atualizada!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Erro ao atualizar foto');
    }
  };

  const handleLogout = async () => {
    if (!user) return;
    
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, username, avatar_url, email')
        .eq('id', user.id)
        .single();

      if (profileData) {
        const accounts = JSON.parse(localStorage.getItem('blynk_saved_accounts') || '[]');
        const existingIndex = accounts.findIndex((acc: any) => acc.userId === user.id);
        
        const accountData = {
          userId: user.id,
          email: profileData.email || user.email || '',
          firstName: profileData.first_name,
          username: profileData.username,
          avatarUrl: profileData.avatar_url,
        };

        if (existingIndex >= 0) {
          accounts[existingIndex] = accountData;
        } else {
          accounts.push(accountData);
        }

        localStorage.setItem('blynk_saved_accounts', JSON.stringify(accounts));

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          localStorage.setItem(`blynk_session_${user.id}`, JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }));
        }
      }
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
    }

    await supabase.auth.signOut();
    navigate('/');
  };

  const menuSections = [
    {
      title: 'Perfis',
      subtitle: `${profile.first_name}, ${profile.username}`,
      icon: User,
      count: 2,
      path: '/profile'
    }
  ];

  const experienceItems = [
    { label: 'Partilhar em vários perfis', icon: User, path: '#' },
    { label: 'Iniciar sessão com várias contas', icon: Smartphone, path: '/saved-accounts' },
  ];

  const accountSettings = [
    { label: 'Palavra-passe e segurança', icon: Lock, path: '/settings/change-password', description: 'Gere as tuas palavras-passe, as preferências de acesso e os métodos de recuperação.' },
    { label: 'Dados pessoais', icon: FileText, path: '/settings/contact-info', description: 'Informações da tua conta.' },
    { label: 'As tuas informações e permissões', icon: Eye, path: '/settings/security', description: 'Revê os problemas de segurança.' },
    { label: 'Preferências de publicidade', icon: Settings2, path: '#', description: 'Configura as preferências de anúncios.' },
    { label: 'Blynk Pay', icon: CreditCard, path: '#', description: 'Gerir pagamentos.' },
    { label: 'Subscrições', icon: Key, path: '/verification', description: 'Verificação e subscrições.' },
  ];

  return (
    <MainLayout title="Definições">
      <div className="h-[calc(100vh-8rem)] overflow-y-auto">
        <div className="max-w-2xl mx-auto pb-20">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background border-b border-border py-4 px-4">
            <div className="flex items-center justify-center">
              <span className="text-xl font-bold">Blynk</span>
            </div>
          </div>

          {/* Profile Section */}
          <Card 
            className="mx-4 mt-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/profile')}
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {profile.first_name[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-all shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Camera className="h-4 w-4" />
                  <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Perfis</p>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-lg">{profile.first_name}</span>
                  {profile.verified && <VerificationBadge verified={profile.verified} badgeType={profile.badge_type} size="sm" />}
                </div>
                <p className="text-muted-foreground text-sm">@{profile.username}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">2</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </Card>

          {/* Experiências interligadas */}
          <div className="px-4 mt-8">
            <h2 className="text-lg font-bold mb-1">Experiências interligadas</h2>
            <Card className="mt-3 overflow-hidden">
              {experienceItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate(item.path)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              ))}
              <button className="w-full p-4 text-left">
                <span className="text-primary font-medium">Ver tudo</span>
              </button>
            </Card>
          </div>

          {/* Definições da conta */}
          <div className="px-4 mt-8">
            <h2 className="text-lg font-bold mb-1">Definições da conta</h2>
            <Card className="mt-3 overflow-hidden">
              {accountSettings.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate(item.path)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              ))}
            </Card>
          </div>

          {/* Logout Button */}
          <div className="px-4 mt-8">
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="w-full h-12 rounded-xl"
            >
              <LogOut className="mr-2 h-5 w-5" />
              Terminar sessão
            </Button>
          </div>

          {/* Profile Link */}
          <div className="px-4 mt-6">
            <Card className="p-4 bg-muted/30">
              <p className="text-sm text-muted-foreground mb-2">Seu link de perfil:</p>
              <p className="font-mono text-sm text-primary break-all">
                blynk.app/perfil/{profile.username}
              </p>
            </Card>
          </div>

          {/* Footer */}
          <footer className="mt-8 mx-4 p-6 bg-gray-900 dark:bg-black rounded-xl text-gray-400">
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-200 mb-2">Blynk © 2024</p>
                <p className="text-xs">Todos os direitos reservados</p>
              </div>
              <div className="flex flex-wrap justify-center gap-4 text-xs">
                <a href="/terms" className="hover:text-gray-200 transition-colors">Termos</a>
                <span>•</span>
                <a href="/privacy" className="hover:text-gray-200 transition-colors">Privacidade</a>
                <span>•</span>
                <a href="/help" className="hover:text-gray-200 transition-colors">Ajuda</a>
                <span>•</span>
                <a href="/about" className="hover:text-gray-200 transition-colors">Sobre</a>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </MainLayout>
  );
}
