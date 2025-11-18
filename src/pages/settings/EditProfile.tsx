import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function EditProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('first_name, username')
      .eq('id', user.id)
      .single();

    if (data) {
      setFirstName(data.first_name || '');
      setUsername(data.username || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Check if username is unique
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .neq('id', user.id)
        .single();

      if (existingUser) {
        toast.error('Este nome de usuário já está em uso');
        setLoading(false);
        return;
      }

      // Check if first_name is unique
      const { data: existingName } = await supabase
        .from('profiles')
        .select('id')
        .eq('first_name', firstName)
        .neq('id', user.id)
        .single();

      if (existingName) {
        toast.error('Este nome já está em uso');
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          username: username.toLowerCase().replace(/\s+/g, '')
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Perfil atualizado!');
      navigate('/settings');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      <header className="sticky top-0 z-40 bg-card border-b border-border safe-area-top">
        <div className="flex items-center h-14 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Editar Perfil</h1>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="firstName">Nome</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="h-12 rounded-xl"
              required
            />
            <p className="text-sm text-muted-foreground">Deve ser único no sistema</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Nome de Usuário</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
              className="h-12 rounded-xl"
              required
            />
            <p className="text-sm text-muted-foreground">Deve ser único, sem espaços</p>
          </div>

          <Button
            type="submit"
            className="w-full h-12 rounded-xl"
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </form>
      </main>
    </div>
  );
}
