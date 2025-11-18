import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function ContactInfo() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('email, phone')
      .eq('id', user.id)
      .single();

    if (data) {
      setEmail(data.email || '');
      setPhone(data.phone || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          email,
          phone
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Informações atualizadas!');
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
          <h1 className="text-xl font-bold">Informações de Contato</h1>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-12 rounded-xl"
            />
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
