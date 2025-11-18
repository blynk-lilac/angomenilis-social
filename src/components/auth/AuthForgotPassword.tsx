import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthForgotPasswordProps {
  initialEmail?: string;
  onBack: () => void;
  onCodeSent: (email: string) => void;
}

export const AuthForgotPassword = ({ initialEmail, onBack, onCodeSent }: AuthForgotPasswordProps) => {
  const [email, setEmail] = useState(initialEmail || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Link de recuperação enviado para seu e-mail! Verifique sua caixa de entrada.');
        onCodeSent(email);
      }
    } catch (error) {
      toast.error('Erro ao enviar link de recuperação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="space-y-2">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4"
          disabled={loading}
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Voltar
        </Button>
        <h2 className="text-3xl font-bold text-foreground">Recuperar Senha</h2>
        <p className="text-muted-foreground">
          Digite seu e-mail e enviaremos um link para redefinir sua senha
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            E-mail
          </label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="exemplo@email.com"
            className="h-14 text-lg rounded-2xl border-2"
            required
            autoFocus
          />
        </div>

        <Button
          type="submit"
          className="w-full h-14 text-lg rounded-2xl"
          disabled={!email || loading}
        >
          {loading ? 'Enviando...' : 'Enviar Link'}
        </Button>
      </form>
    </div>
  );
};