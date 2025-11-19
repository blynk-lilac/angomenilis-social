import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';

interface AuthLoginProps {
  onBack: () => void;
  onForgotPassword: (email: string) => void;
}

export const AuthLogin = ({ onBack, onForgotPassword }: AuthLoginProps) => {
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credential);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação de entrada
    if (!credential.trim()) {
      toast.error('Digite seu e-mail ou telefone');
      return;
    }
    
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: isEmail ? credential.trim() : undefined,
        phone: !isEmail ? credential.trim() : undefined,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('E-mail/telefone ou senha incorretos');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Confirme seu e-mail antes de fazer login');
        } else {
          toast.error('Erro ao fazer login. Tente novamente.');
        }
      } else {
        toast.success('Login realizado com sucesso!');
      }
    } catch (error) {
      toast.error('Erro ao fazer login. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4"
          disabled={loading}
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Voltar
        </Button>
        
        <div className="text-center space-y-2">
          <img src={logo} alt="Angomenilis" className="h-16 w-16 mx-auto" />
          <h2 className="text-3xl font-bold text-foreground">Bem-vindo de volta!</h2>
          <p className="text-muted-foreground">Entre na sua conta</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            E-mail ou Telefone
          </label>
          <Input
            type="text"
            value={credential}
            onChange={(e) => setCredential(e.target.value)}
            placeholder="exemplo@email.com ou +244..."
            className="h-14 text-lg rounded-2xl border-2"
            required
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Senha
          </label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              className="h-14 text-lg rounded-2xl border-2 pr-12"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <Button
          type="button"
          variant="link"
          className="w-full text-primary"
          onClick={() => {
            if (credential && isEmail) {
              onForgotPassword(credential);
            } else {
              toast.error('Digite um e-mail válido primeiro');
            }
          }}
        >
          Esqueci minha senha
        </Button>

        <Button
          type="submit"
          className="w-full h-14 text-lg rounded-2xl"
          disabled={!credential || password.length < 6 || loading}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
    </div>
  );
};