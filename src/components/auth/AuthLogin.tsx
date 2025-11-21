import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logo from '@/assets/blynk-logo.jpg';
import { PhoneVerification } from '@/components/auth/PhoneVerification';
import { requestNotificationPermission, showNotification } from '@/utils/pushNotifications';

interface AuthLoginProps {
  onBack: () => void;
  onForgotPassword: (email: string) => void;
}

export const AuthLogin = ({ onBack, onForgotPassword }: AuthLoginProps) => {
  const navigate = useNavigate();
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [tempUserId, setTempUserId] = useState<string | null>(null);

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credential);

  const generateTwoFactorCode = () => {
    return Math.floor(10 + Math.random() * 90).toString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      const { data, error } = await supabase.auth.signInWithPassword({
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
        setLoading(false);
        return;
      }

      // Verificar se 2FA está ativado
      const { data: twoFactorData } = await supabase
        .from('two_factor_auth')
        .select('enabled')
        .eq('user_id', data.user.id)
        .single();

      if (twoFactorData?.enabled) {
        // Fazer logout temporário
        await supabase.auth.signOut();
        
        // Gerar código de 2FA
        const code = generateTwoFactorCode();
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + 10); // 10 segundos

        // Salvar código no banco
        await supabase.from('two_factor_codes').insert({
          user_id: data.user.id,
          code,
          expires_at: expiresAt.toISOString(),
        });
        
        // Solicitar permissão de notificação e enviar
        const hasPermission = await requestNotificationPermission();
        if (hasPermission) {
          showNotification('Código de Verificação Blynk', {
            body: `Seu código de autenticação de dois fatores é: ${code}`,
            icon: logo,
            requireInteraction: true,
          });
        }
        
        // Exibir código na tela também
        toast.success(`Seu código de verificação é: ${code}`, { duration: 10000 });

        // Redirecionar para página de verificação
        navigate('/two-factor-verification', {
          state: {
            tempUserId: data.user.id,
            credential: credential.trim(),
            password,
            isEmail
          }
        });
        return;
      } else if (!isEmail) {
        // Se é login por telefone, verificar número
        await supabase.auth.signOut();
        setTempUserId(data.user.id);
        setShowPhoneVerification(true);
      } else {
        toast.success('Login realizado com sucesso!');
      }
    } catch (error) {
      toast.error('Erro ao fazer login. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  // Verificação de telefone
  if (showPhoneVerification) {
    return (
      <PhoneVerification
        phoneNumber={credential}
        onVerified={async () => {
          // Re-fazer login após verificação
          if (!tempUserId) return;
          
          try {
            const { error } = await supabase.auth.signInWithPassword({
              phone: credential.trim(),
              password,
            });

            if (error) throw error;
            
            toast.success('Login realizado com sucesso!');
            setShowPhoneVerification(false);
          } catch (error) {
            toast.error('Erro ao completar login');
          }
        }}
        onBack={() => {
          setShowPhoneVerification(false);
          setTempUserId(null);
        }}
      />
    );
  }

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
          <img src={logo} alt="Blynk" className="h-16 w-16 mx-auto rounded-full" />
          <h2 className="text-3xl font-bold text-foreground">Bem-vindo de volta!</h2>
          <p className="text-muted-foreground">Entre no Blynk</p>
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