import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthPasswordProps {
  firstName: string;
  credential: string;
  username: string;
  onNext: (password: string) => void;
  onBack: () => void;
}

export const AuthPassword = ({ firstName, credential, username, onNext, onBack }: AuthPasswordProps) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credential);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação de senha forte
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    if (!/[A-Za-z]/.test(password)) {
      toast.error('A senha deve conter pelo menos uma letra');
      return;
    }
    
    if (!/[0-9]/.test(password)) {
      toast.error('A senha deve conter pelo menos um número');
      return;
    }

    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email: isEmail ? credential : undefined,
        phone: !isEmail ? credential : undefined,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            username: username,
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('Este e-mail/telefone já está cadastrado');
        } else {
          toast.error('Erro ao criar conta. Tente novamente.');
        }
        setLoading(false);
      } else {
        toast.success('Conta criada com sucesso!');
        onNext(password);
      }
    } catch (error) {
      toast.error('Erro ao criar conta. Verifique sua conexão.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
      <div className="space-y-3">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4 hover:scale-105 transition-transform duration-200"
          disabled={loading}
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Voltar
        </Button>
        <h2 className="text-3xl font-bold text-foreground animate-in slide-in-from-bottom-2 duration-500">
          Crie uma senha
        </h2>
        <p className="text-lg text-muted-foreground animate-in slide-in-from-bottom-3 duration-500">
          Proteja sua conta com uma senha forte
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-500">
          <label className="text-sm font-semibold text-foreground">
            Senha
          </label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres, com letras e números"
              className="h-14 text-lg rounded-2xl border-2 pr-12 shadow-sm hover:shadow-md focus:shadow-lg transition-all duration-300 bg-background/50 backdrop-blur-sm"
              required
              autoFocus
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground hover:scale-110 transition-all duration-200"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            A senha deve conter letras e números
          </p>
        </div>

        <Button
          type="submit"
          className="w-full h-14 text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] animate-in slide-in-from-bottom-5 duration-500"
          disabled={password.length < 6 || loading}
        >
          {loading ? 'Criando conta...' : 'Criar Conta'}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </form>
    </div>
  );
};
