import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logo from '@/assets/blynk-logo.jpg';
import { PhoneVerification } from '@/components/auth/PhoneVerification';
import { requestNotificationPermission, showNotification } from '@/utils/pushNotifications';

interface AuthLoginProps {
  onBack: () => void;
  onForgotPassword: (email: string) => void;
  onSwitchToSignup?: () => void;
}

export const AuthLogin = ({ onBack, onForgotPassword, onSwitchToSignup }: AuthLoginProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  // Carregar credenciais salvas ou email pré-preenchido
  useEffect(() => {
    const prefilledEmail = location.state?.prefilledEmail;
    if (prefilledEmail) {
      setCredential(prefilledEmail);
      setRememberMe(true);
    } else {
      const savedCredential = localStorage.getItem('blynk_saved_credential');
      if (savedCredential) {
        setCredential(savedCredential);
        setRememberMe(true);
      }
    }
  }, [location]);

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credential);

  const saveAccount = async (userId: string, email: string) => {
    try {
      // Buscar dados do perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, username, avatar_url')
        .eq('id', userId)
        .single();

      if (profile) {
        // Salvar conta na lista
        const accounts = JSON.parse(localStorage.getItem('blynk_saved_accounts') || '[]');
        const existingIndex = accounts.findIndex((acc: any) => acc.userId === userId);
        
        const accountData = {
          userId,
          email,
          firstName: profile.first_name,
          username: profile.username,
          avatarUrl: profile.avatar_url,
        };

        if (existingIndex >= 0) {
          accounts[existingIndex] = accountData;
        } else {
          accounts.push(accountData);
        }

        localStorage.setItem('blynk_saved_accounts', JSON.stringify(accounts));
        localStorage.setItem('blynk_saved_credential', email);

        // Salvar sessão
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          localStorage.setItem(`blynk_session_${userId}`, JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }));
        }
      }
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
    }
  };

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
        // Salvar conta se "lembrar-me" estiver marcado
        if (rememberMe) {
          await saveAccount(data.user.id, credential.trim());
        } else {
          localStorage.removeItem('blynk_saved_credential');
        }
        toast.success('Login realizado com sucesso!');
        navigate('/feed');
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
    <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4 hover:scale-105 transition-transform duration-200"
          disabled={loading}
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Voltar
        </Button>
        
        <div className="text-center space-y-3">
          <div className="relative inline-block">
            <img 
              src={logo} 
              alt="Blynk" 
              className="h-20 w-20 mx-auto rounded-full shadow-lg ring-4 ring-primary/20 animate-in zoom-in duration-500" 
            />
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/20 to-transparent animate-pulse" />
          </div>
          <h2 className="text-4xl font-bold text-foreground animate-in slide-in-from-bottom-2 duration-500">
            Bem-vindo de volta!
          </h2>
          <p className="text-lg text-muted-foreground animate-in slide-in-from-bottom-3 duration-500">
            Entre no Blynk
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-500">
          <label className="text-sm font-semibold text-foreground">
            E-mail ou Telefone
          </label>
          <Input
            type="text"
            value={credential}
            onChange={(e) => setCredential(e.target.value)}
            placeholder="exemplo@email.com ou +244..."
            className="h-14 text-lg rounded-2xl border-2 shadow-sm hover:shadow-md focus:shadow-lg transition-all duration-300 bg-background/50 backdrop-blur-sm"
            required
            autoFocus
          />
        </div>

        <div className="space-y-3 animate-in slide-in-from-bottom-5 duration-500">
          <label className="text-sm font-semibold text-foreground">
            Senha
          </label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              className="h-14 text-lg rounded-2xl border-2 pr-12 shadow-sm hover:shadow-md focus:shadow-lg transition-all duration-300 bg-background/50 backdrop-blur-sm"
              required
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
        </div>

        <div className="flex items-center justify-between animate-in slide-in-from-bottom-6 duration-500">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="remember" 
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              className="transition-all duration-200 hover:scale-110"
            />
            <label
              htmlFor="remember"
              className="text-sm font-medium text-foreground cursor-pointer select-none hover:text-primary transition-colors"
            >
              Lembrar-me
            </label>
          </div>
          
          <Button
            type="button"
            variant="link"
            className="text-primary hover:underline p-0 h-auto font-medium"
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
        </div>

        <Button
          type="submit"
          className="w-full h-14 text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] animate-in slide-in-from-bottom-7 duration-500"
          disabled={!credential || password.length < 6 || loading}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>

        {onSwitchToSignup && (
          <div className="text-center animate-in slide-in-from-bottom-8 duration-500">
            <Button
              type="button"
              variant="link"
              onClick={onSwitchToSignup}
              className="text-foreground hover:text-primary"
            >
              Não tem conta? <span className="font-semibold ml-1">Criar conta</span>
            </Button>
          </div>
        )}
      </form>
    </div>
  );
};