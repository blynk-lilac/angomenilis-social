import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  Loader2,
  AtSign
} from 'lucide-react';

type AuthModeType = 'login' | 'signup' | 'forgotPassword';

export default function Auth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState<AuthModeType>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    email: '',
    username: '',
    password: '',
  });

  useEffect(() => {
    if (location.state?.mode === 'signup') {
      setMode('signup');
    }
  }, [location]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-[#1877f2] animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/feed" replace />;
  }

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Email ou senha incorretos');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Confirme seu email antes de fazer login');
        } else {
          toast.error(error.message || 'Erro ao fazer login');
        }
        return;
      }
      
      toast.success('Login realizado com sucesso!');
    } catch (error: any) {
      if (error.message?.includes('Failed to fetch') || error.message?.includes('fetch')) {
        toast.error('Erro de conexao. Verifique sua internet e tente novamente.');
      } else {
        toast.error(error.message || 'Erro ao fazer login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!formData.firstName || !formData.email || !formData.username || !formData.password) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: formData.firstName,
            username: formData.username,
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          toast.error('Este email ja esta registrado. Tente fazer login.');
        } else if (error.message.includes('password')) {
          toast.error('A senha deve ter pelo menos 6 caracteres');
        } else {
          toast.error(error.message || 'Erro ao criar conta');
        }
        return;
      }

      if (data.user) {
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            first_name: formData.firstName,
            username: formData.username,
            email: formData.email.trim(),
          });
        } catch (profileError) {
          console.error('Error creating profile:', profileError);
        }
      }

      toast.success('Conta criada com sucesso! Verifique seu email.');
      setMode('login');
    } catch (error: any) {
      if (error.message?.includes('Failed to fetch') || error.message?.includes('fetch')) {
        toast.error('Erro de conexao. Verifique sua internet e tente novamente.');
      } else {
        toast.error(error.message || 'Erro ao criar conta');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast.error('Digite seu email');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      toast.success('Email de recuperação enviado!');
      setMode('login');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo Section - Facebook Style */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="text-[#1877f2] text-5xl font-bold tracking-tight">blynk</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Conecta-te com amigos e o mundo à tua volta.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* Login Form */}
          {mode === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-lg shadow-lg p-6 space-y-4"
            >
              <Input
                type="email"
                placeholder="Email ou telemóvel"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                className="h-14 rounded-md border-gray-300 text-base focus:border-[#1877f2] focus:ring-[#1877f2]"
              />

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Palavra-passe"
                  value={formData.password}
                  onChange={(e) => updateFormData('password', e.target.value)}
                  className="h-14 rounded-md border-gray-300 text-base pr-12 focus:border-[#1877f2] focus:ring-[#1877f2]"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9"
                >
                  {showPassword ? <EyeOff className="h-5 w-5 text-gray-500" /> : <Eye className="h-5 w-5 text-gray-500" />}
                </Button>
              </div>

              <Button
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full h-14 rounded-md text-xl font-bold bg-[#1877f2] hover:bg-[#166fe5] text-white"
              >
                {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Iniciar sessão'}
              </Button>

              <div className="text-center">
                <Button
                  variant="link"
                  onClick={() => setMode('forgotPassword')}
                  className="text-[#1877f2] text-sm font-medium h-auto p-0"
                >
                  Esqueceste-te da palavra-passe?
                </Button>
              </div>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-sm text-gray-500">ou</span>
                </div>
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={() => setMode('signup')}
                  className="h-12 px-8 rounded-md text-lg font-bold bg-[#42b72a] hover:bg-[#36a420] text-white"
                >
                  Criar nova conta
                </Button>
              </div>
            </motion.div>
          )}

          {/* Signup Form */}
          {mode === 'signup' && (
            <motion.div
              key="signup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-lg shadow-lg p-6"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Criar uma conta nova</h2>
                <p className="text-gray-600 text-sm mt-1">É rápido e fácil.</p>
              </div>

              <div className="space-y-3">
                <Input
                  placeholder="Nome"
                  value={formData.firstName}
                  onChange={(e) => updateFormData('firstName', e.target.value)}
                  className="h-12 rounded-md border-gray-300 focus:border-[#1877f2] focus:ring-[#1877f2]"
                />

                <Input
                  placeholder="Nome de utilizador"
                  value={formData.username}
                  onChange={(e) => updateFormData('username', e.target.value)}
                  className="h-12 rounded-md border-gray-300 focus:border-[#1877f2] focus:ring-[#1877f2]"
                />

                <Input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  className="h-12 rounded-md border-gray-300 focus:border-[#1877f2] focus:ring-[#1877f2]"
                />

                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Palavra-passe nova"
                    value={formData.password}
                    onChange={(e) => updateFormData('password', e.target.value)}
                    className="h-12 rounded-md border-gray-300 pr-12 focus:border-[#1877f2] focus:ring-[#1877f2]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                  </Button>
                </div>

                <p className="text-xs text-gray-500 px-1">
                  Ao clicares em Registar, concordas com os nossos Termos, Política de Privacidade e Política de Cookies.
                </p>

                <Button
                  onClick={handleSignup}
                  disabled={isLoading}
                  className="w-full h-12 rounded-md text-lg font-bold bg-[#42b72a] hover:bg-[#36a420] text-white mt-4"
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Registar'}
                </Button>

                <div className="text-center pt-2">
                  <Button
                    variant="link"
                    onClick={() => setMode('login')}
                    className="text-[#1877f2] font-medium h-auto p-0"
                  >
                    Já tens uma conta?
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Forgot Password Form */}
          {mode === 'forgotPassword' && (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-lg shadow-lg p-6"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Encontra a tua conta</h2>
                <p className="text-gray-600 text-sm mt-2">
                  Introduz o teu email para procurar a tua conta.
                </p>
              </div>

              <Input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                className="h-12 rounded-md border-gray-300 mb-4 focus:border-[#1877f2] focus:ring-[#1877f2]"
              />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setMode('login')}
                  className="flex-1 h-11 rounded-md font-semibold"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleForgotPassword}
                  disabled={isLoading}
                  className="flex-1 h-11 rounded-md font-semibold bg-[#1877f2] hover:bg-[#166fe5] text-white"
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Procurar'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            © 2026/2027 Blynk
          </p>
        </div>
      </div>
    </div>
  );
}
