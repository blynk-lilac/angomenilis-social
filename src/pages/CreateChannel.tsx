import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Hash, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function CreateChannel() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;

    const file = e.target.files[0];
    
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Selecione uma imagem',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `channel-${user.id}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({
        title: 'Erro ao fazer upload',
        description: uploadError.message,
        variant: 'destructive',
      });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    setAvatarUrl(publicUrl);
    setUploading(false);
  };

  const createChannel = async () => {
    if (!name.trim() || !user) return;

    setCreating(true);

    const { data, error } = await supabase
      .from('channels')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        avatar_url: avatarUrl,
        created_by: user.id,
      })
      .select()
      .single();

    setCreating(false);

    if (error) {
      toast({
        title: 'Erro ao criar canal',
        description: error.message,
        variant: 'destructive',
      });
    } else if (data) {
      toast({
        title: 'Canal criado!',
      });
      navigate(`/canal/${data.id}`);
    }
  };

  return (
    <MainLayout title="Criar Canal">
      <div className="flex flex-col h-full p-4">
        <div className="flex-1 space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Hash className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>

            <input
              type="file"
              id="avatar-upload"
              className="hidden"
              accept="image/*"
              onChange={uploadAvatar}
              disabled={uploading}
            />

            <Button
              onClick={() => document.getElementById('avatar-upload')?.click()}
              disabled={uploading}
              variant="outline"
              size="sm"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Enviando...' : 'Escolher Foto'}
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Nome do Canal
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do canal"
                maxLength={50}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Descrição
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o seu canal..."
                rows={4}
                maxLength={200}
              />
            </div>
          </div>
        </div>

        <Button
          onClick={createChannel}
          disabled={!name.trim() || creating}
          className="w-full mt-4"
          size="lg"
        >
          {creating ? 'Criando...' : 'Criar Canal'}
        </Button>
      </div>
    </MainLayout>
  );
}
