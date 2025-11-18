import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { LogOut, Camera, ChevronRight, Lock, User, Mail, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    first_name: '',
    username: '',
    avatar_url: '',
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
      .select('first_name, username, avatar_url')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile({
        first_name: data.first_name || '',
        username: data.username || '',
        avatar_url: data.avatar_url || '',
      });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;

    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/avatar.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

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
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const menuItems = [
    {
      title: 'Palavra-passe e segurança',
      subtitle: 'Gere as tuas palavras-passe, as preferências de acesso e os métodos de recuperação.',
      items: [
        { label: 'Alterar palavra-passe', icon: Lock, path: '/settings/change-password' },
        { label: 'Editar perfil', icon: User, path: '/settings/edit-profile' },
      ]
    },
    {
      title: 'Verificações de segurança',
      subtitle: 'Revê os problemas de segurança efetuando verificações nas apps, nos dispositivos e nos e-mails enviados.',
      items: [
        { label: 'Informações de contato', icon: Mail, path: '/settings/contact-info' },
        { label: 'Verificação de Segurança', icon: Shield, path: '/settings/security' },
      ]
    }
  ];

  return (
    <MainLayout title="Definições">
      <div className="p-4 max-w-2xl mx-auto pb-20">
        {/* Avatar Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <Avatar className="h-32 w-32">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
                {profile.first_name[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
            >
              <Camera className="h-5 w-5" />
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </label>
          </div>
          <h2 className="mt-4 text-xl font-bold">{profile.first_name}</h2>
          <p className="text-muted-foreground">@{profile.username}</p>
        </div>

        {/* Settings Menu */}
        <div className="space-y-8">
          {menuItems.map((section, idx) => (
            <div key={idx} className="space-y-4">
              <div>
                <h3 className="text-lg font-bold mb-1">{section.title}</h3>
                <p className="text-sm text-muted-foreground">{section.subtitle}</p>
              </div>
              
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                {section.items.map((item, itemIdx) => (
                  <button
                    key={itemIdx}
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
              </div>
            </div>
          ))}
        </div>

        {/* Logout Button */}
        <Button
          variant="destructive"
          onClick={handleLogout}
          className="w-full h-12 rounded-xl mt-8"
        >
          <LogOut className="mr-2 h-5 w-5" />
          Sair
        </Button>

        {/* Profile Link */}
        <div className="mt-6 p-4 bg-muted/50 rounded-xl">
          <p className="text-sm text-muted-foreground mb-2">Seu link de perfil:</p>
          <p className="font-mono text-sm text-primary break-all">
            angomenilis.netlify.app/perfil/{profile.username}
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
