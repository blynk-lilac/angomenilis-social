import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  ArrowRight,
  Sparkles,
  Loader2,
  AtSign,
  Zap,
  Shield,
  Globe
} from 'lucide-react';
import { Logo2026 } from '@/components/Logo2026';

type AuthModeType = 'welcome' | 'login' | 'signup' | 'forgotPassword';
type SignupStep = 1 | 2 | 3 | 4;

export default function Auth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState<AuthModeType>('welcome');
  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (location.state?.mode === 'signup') {
      setMode('signup');
    }
  }, [location]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-10 w-10 text-primary" />
        </motion.div>
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
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;
      toast.success('Login realizado com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem');
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

      if (error) throw error;

      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          first_name: formData.firstName,
          username: formData.username,
          email: formData.email,
        });
      }

      toast.success('Conta criada com sucesso!');
      setMode('login');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar conta');
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

  const features = [
    { icon: Zap, text: 'Conexões instantâneas' },
    { icon: Shield, text: 'Segurança avançada' },
    { icon: Globe, text: 'Comunidade global' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-b from-primary/20 via-primary/5 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-accent/20 to-transparent blur-3xl" />
        <div className="absolute top-1/3 right-0 w-[300px] h-[300px] rounded-full bg-gradient-to-bl from-primary/10 to-transparent blur-3xl" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--muted)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--muted)/0.3)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <AnimatePresence mode="wait">
        {/* Welcome Screen */}
        {mode === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center px-6 relative z-10"
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0, y: -50 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", duration: 0.8, bounce: 0.4 }}
              className="mb-8"
            >
              <Logo2026 size="xl" />
            </motion.div>

            {/* Tagline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center mb-10"
            >
              <h1 className="text-3xl font-black mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Conecte. Compartilhe. Inspire.
              </h1>
              <p className="text-muted-foreground text-lg max-w-sm">
                A rede social que valoriza conexões autênticas
              </p>
            </motion.div>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap justify-center gap-4 mb-12"
            >
              {features.map((feature, i) => (
                <motion.div
                  key={feature.text}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-muted/60 backdrop-blur-sm border border-border/50"
                >
                  <feature.icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{feature.text}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="w-full max-w-sm space-y-3"
            >
              <Button
                onClick={() => setMode('signup')}
                className="w-full h-14 rounded-2xl text-lg font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02]"
              >
                Criar Conta Grátis
                <Sparkles className="ml-2 h-5 w-5" />
              </Button>
              <Button
                onClick={() => setMode('login')}
                variant="outline"
                className="w-full h-14 rounded-2xl text-lg font-bold border-2 border-border hover:bg-muted/50 transition-all hover:scale-[1.02]"
              >
                Já tenho conta
              </Button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-xs text-muted-foreground text-center mt-10 max-w-xs"
            >
              Ao continuar, concordas com os nossos{' '}
              <span className="text-primary cursor-pointer hover:underline">Termos de Serviço</span>
              {' '}e{' '}
              <span className="text-primary cursor-pointer hover:underline">Política de Privacidade</span>
            </motion.p>
          </motion.div>
        )}

        {/* Login Screen */}
        {mode === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="flex-1 flex flex-col px-6 pt-safe relative z-10"
          >
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pt-4"
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMode('welcome')}
                className="h-10 w-10 rounded-full hover:bg-muted"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </motion.div>

            <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full pb-10">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center mb-8 mx-auto shadow-2xl shadow-primary/30"
              >
                <User className="h-10 w-10 text-primary-foreground" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-8"
              >
                <h1 className="text-3xl font-black mb-2">Bem-vindo de volta</h1>
                <p className="text-muted-foreground">Entre na sua conta Blynk</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={(e) => updateFormData('email', e.target.value)}
                      className="h-14 pl-12 rounded-2xl bg-muted/50 border-border/50 text-base focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => updateFormData('password', e.target.value)}
                      className="h-14 pl-12 pr-12 rounded-2xl bg-muted/50 border-border/50 text-base focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="link"
                    onClick={() => setMode('forgotPassword')}
                    className="px-0 text-sm text-primary font-semibold h-auto"
                  >
                    Esqueceste a senha?
                  </Button>
                </div>

                <Button
                  onClick={handleLogin}
                  disabled={isLoading}
                  className="w-full h-14 rounded-2xl text-lg font-bold bg-primary hover:bg-primary/90 shadow-lg transition-all hover:scale-[1.02]"
                >
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>Entrar <ArrowRight className="ml-2 h-5 w-5" /></>
                  )}
                </Button>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-center text-muted-foreground mt-8"
              >
                Não tens conta?{' '}
                <Button
                  variant="link"
                  onClick={() => setMode('signup')}
                  className="px-0 font-bold text-primary h-auto"
                >
                  Criar agora
                </Button>
              </motion.p>
            </div>
          </motion.div>
        )}

        {/* Signup Screen */}
        {mode === 'signup' && (
          <motion.div
            key="signup"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="flex-1 flex flex-col px-6 pt-safe relative z-10"
          >
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pt-4"
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signupStep > 1 ? setSignupStep((signupStep - 1) as SignupStep) : setMode('welcome')}
                className="h-10 w-10 rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </motion.div>

            {/* Progress Steps */}
            <div className="flex justify-center gap-2 my-6">
              {[1, 2, 3, 4].map((step) => (
                <motion.div
                  key={step}
                  initial={{ scale: 0.8 }}
                  animate={{ 
                    scale: signupStep >= step ? 1 : 0.8,
                  }}
                  className={`h-2 w-12 rounded-full transition-colors ${signupStep >= step ? 'bg-primary' : 'bg-muted'}`}
                />
              ))}
            </div>

            <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full pb-10">
              <AnimatePresence mode="wait">
                {/* Step 1: Name */}
                {signupStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring" }}
                        className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6 mx-auto shadow-2xl shadow-primary/30"
                      >
                        <User className="h-10 w-10 text-primary-foreground" />
                      </motion.div>
                      <h1 className="text-3xl font-black">Como te chamas?</h1>
                      <p className="text-muted-foreground mt-2">Este será o teu nome de exibição</p>
                    </div>

                    <div className="space-y-2">
                      <Input
                        placeholder="O teu nome"
                        value={formData.firstName}
                        onChange={(e) => updateFormData('firstName', e.target.value)}
                        className="h-14 rounded-2xl bg-muted/50 border-border/50 text-center text-lg font-medium focus:ring-2 focus:ring-primary/50"
                      />
                    </div>

                    <Button
                      onClick={() => setSignupStep(2)}
                      disabled={!formData.firstName.trim()}
                      className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg transition-all hover:scale-[1.02]"
                    >
                      Continuar <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </motion.div>
                )}

                {/* Step 2: Email & Username */}
                {signupStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring" }}
                        className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-6 mx-auto shadow-2xl"
                      >
                        <AtSign className="h-10 w-10 text-white" />
                      </motion.div>
                      <h1 className="text-3xl font-black">Dados da conta</h1>
                      <p className="text-muted-foreground mt-2">Email e nome de usuário</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="seu@email.com"
                            value={formData.email}
                            onChange={(e) => updateFormData('email', e.target.value)}
                            className="h-14 pl-12 rounded-2xl bg-muted/50 border-border/50 text-base focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Nome de usuário</Label>
                        <div className="relative">
                          <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input
                            placeholder="seu_username"
                            value={formData.username}
                            onChange={(e) => updateFormData('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                            className="h-14 pl-12 rounded-2xl bg-muted/50 border-border/50 text-base focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => setSignupStep(3)}
                      disabled={!formData.email || !formData.username}
                      className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg transition-all hover:scale-[1.02]"
                    >
                      Continuar <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </motion.div>
                )}

                {/* Step 3: Password */}
                {signupStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring" }}
                        className="w-20 h-20 rounded-3xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-6 mx-auto shadow-2xl"
                      >
                        <Lock className="h-10 w-10 text-white" />
                      </motion.div>
                      <h1 className="text-3xl font-black">Cria uma senha</h1>
                      <p className="text-muted-foreground mt-2">Usa pelo menos 8 caracteres</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Senha</Label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => updateFormData('password', e.target.value)}
                            className="h-14 pl-12 pr-12 rounded-2xl bg-muted/50 border-border/50 text-base focus:ring-2 focus:ring-primary/50"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full"
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Confirmar senha</Label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                            className="h-14 pl-12 rounded-2xl bg-muted/50 border-border/50 text-base focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => setSignupStep(4)}
                      disabled={formData.password.length < 8 || formData.password !== formData.confirmPassword}
                      className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg transition-all hover:scale-[1.02]"
                    >
                      Continuar <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </motion.div>
                )}

                {/* Step 4: Confirm */}
                {signupStep === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring" }}
                        className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6 mx-auto shadow-2xl"
                      >
                        <Sparkles className="h-10 w-10 text-white" />
                      </motion.div>
                      <h1 className="text-3xl font-black">Tudo pronto!</h1>
                      <p className="text-muted-foreground mt-2">Confirma os teus dados</p>
                    </div>

                    {/* Summary */}
                    <div className="bg-muted/50 rounded-2xl p-5 space-y-4 border border-border/50">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">Nome</span>
                        <span className="font-semibold">{formData.firstName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">Email</span>
                        <span className="font-semibold text-sm">{formData.email}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">Username</span>
                        <span className="font-semibold">@{formData.username}</span>
                      </div>
                    </div>

                    <Button
                      onClick={handleSignup}
                      disabled={isLoading}
                      className="w-full h-14 rounded-2xl text-lg font-bold bg-gradient-to-r from-primary to-accent shadow-lg transition-all hover:scale-[1.02]"
                    >
                      {isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <>
                          Criar minha conta
                          <Sparkles className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {signupStep === 1 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-center text-muted-foreground mt-8"
                >
                  Já tens conta?{' '}
                  <Button
                    variant="link"
                    onClick={() => setMode('login')}
                    className="px-0 font-bold text-primary h-auto"
                  >
                    Entrar
                  </Button>
                </motion.p>
              )}
            </div>
          </motion.div>
        )}

        {/* Forgot Password Screen */}
        {mode === 'forgotPassword' && (
          <motion.div
            key="forgot"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="flex-1 flex flex-col px-6 pt-safe relative z-10"
          >
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pt-4"
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMode('login')}
                className="h-10 w-10 rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </motion.div>

            <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full pb-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-8 mx-auto shadow-2xl"
              >
                <Mail className="h-10 w-10 text-white" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-8"
              >
                <h1 className="text-3xl font-black mb-2">Recuperar senha</h1>
                <p className="text-muted-foreground">Enviaremos um link para o teu email</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={(e) => updateFormData('email', e.target.value)}
                      className="h-14 pl-12 rounded-2xl bg-muted/50 border-border/50 text-base focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleForgotPassword}
                  disabled={isLoading || !formData.email}
                  className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg transition-all hover:scale-[1.02]"
                >
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    'Enviar link de recuperação'
                  )}
                </Button>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-center text-muted-foreground mt-8"
              >
                Lembrou a senha?{' '}
                <Button
                  variant="link"
                  onClick={() => setMode('login')}
                  className="px-0 font-bold text-primary h-auto"
                >
                  Voltar ao login
                </Button>
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}