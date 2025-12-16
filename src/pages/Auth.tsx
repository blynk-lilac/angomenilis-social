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
  Check,
  Loader2,
  AtSign,
  MessageCircle,
  Heart,
  Camera,
  Users
} from 'lucide-react';

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
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
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

  const floatingIcons = [
    { Icon: Heart, delay: 0 },
    { Icon: MessageCircle, delay: 0.5 },
    { Icon: Camera, delay: 1 },
    { Icon: Users, delay: 1.5 },
    { Icon: Sparkles, delay: 2 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col overflow-hidden relative">
      {/* Floating Background Icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {floatingIcons.map(({ Icon, delay }, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 100 }}
            animate={{ 
              opacity: [0.1, 0.2, 0.1], 
              y: [-20, 20, -20],
              x: [0, 10, 0]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              delay,
              ease: "easeInOut"
            }}
            className="absolute"
            style={{
              left: `${15 + i * 18}%`,
              top: `${10 + (i % 3) * 30}%`,
            }}
          >
            <Icon className="h-12 w-12 text-primary/10" />
          </motion.div>
        ))}
        
        {/* Gradient Orbs */}
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 5, repeat: Infinity }}
          className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl"
        />
        <motion.div
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.15, 0.1]
          }}
          transition={{ duration: 6, repeat: Infinity, delay: 1 }}
          className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-accent/20 to-transparent blur-3xl"
        />
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
            {/* Animated Logo */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", duration: 1, bounce: 0.5 }}
              className="mb-6"
            >
              <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/30">
                <motion.span
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="text-5xl font-black text-primary-foreground"
                >
                  B
                </motion.span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl font-black bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent mb-2"
            >
              Blynk
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground text-center text-lg mb-10 max-w-xs"
            >
              Conecte-se com amigos e compartilhe momentos
            </motion.p>

            {/* Feature Pills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap justify-center gap-2 mb-12"
            >
              {['Stories', 'Reels', 'Chat', 'Grupos'].map((feature, i) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  className="px-4 py-2 rounded-full bg-muted/80 backdrop-blur-sm text-sm font-medium"
                >
                  {feature}
                </motion.div>
              ))}
            </motion.div>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="w-full max-w-xs space-y-3"
            >
              <Button
                onClick={() => setMode('signup')}
                className="w-full h-14 rounded-2xl text-lg font-bold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
              >
                Criar Conta
              </Button>
              <Button
                onClick={() => setMode('login')}
                variant="outline"
                className="w-full h-14 rounded-2xl text-lg font-bold border-2 hover:bg-muted/50"
              >
                Entrar
              </Button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="text-xs text-muted-foreground text-center mt-8 max-w-xs"
            >
              Ao continuar, concordas com os nossos Termos de Serviço e Política de Privacidade
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
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6 mx-auto shadow-xl"
              >
                <User className="h-10 w-10 text-primary-foreground" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-3xl font-black text-center mb-1"
              >
                Bem-vindo de volta
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-muted-foreground text-center mb-8"
              >
                Entre na sua conta Blynk
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-4"
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
                      className="h-14 pl-12 rounded-2xl bg-muted/50 border-0 text-base focus:ring-2 focus:ring-primary"
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
                      className="h-14 pl-12 pr-12 rounded-2xl bg-muted/50 border-0 text-base focus:ring-2 focus:ring-primary"
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

                <Button
                  variant="link"
                  onClick={() => setMode('forgotPassword')}
                  className="px-0 text-sm text-primary font-semibold"
                >
                  Esqueceste a senha?
                </Button>

                <Button
                  onClick={handleLogin}
                  disabled={isLoading}
                  className="w-full h-14 rounded-2xl text-lg font-bold mt-2 bg-gradient-to-r from-primary to-primary/80 shadow-lg"
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
                transition={{ delay: 0.5 }}
                className="text-center text-muted-foreground mt-8"
              >
                Não tens conta?{' '}
                <Button
                  variant="link"
                  onClick={() => setMode('signup')}
                  className="px-0 font-bold text-primary"
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
                    backgroundColor: signupStep >= step ? 'hsl(var(--primary))' : 'hsl(var(--muted))'
                  }}
                  className="h-2 w-10 rounded-full transition-colors"
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
                        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 mx-auto shadow-xl"
                      >
                        <User className="h-10 w-10 text-primary-foreground" />
                      </motion.div>
                      <h1 className="text-3xl font-black">Como te chamas?</h1>
                      <p className="text-muted-foreground mt-2">Este será o teu nome de exibição</p>
                    </div>

                    <Input
                      placeholder="O teu nome"
                      value={formData.firstName}
                      onChange={(e) => updateFormData('firstName', e.target.value)}
                      className="h-14 rounded-2xl bg-muted/50 border-0 text-lg text-center focus:ring-2 focus:ring-primary"
                      autoFocus
                    />

                    <Button
                      onClick={() => {
                        if (!formData.firstName.trim()) {
                          toast.error('Digite o teu nome');
                          return;
                        }
                        setSignupStep(2);
                      }}
                      className="w-full h-14 rounded-2xl text-lg font-bold bg-gradient-to-r from-primary to-primary/80"
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
                        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 mx-auto shadow-xl"
                      >
                        <AtSign className="h-10 w-10 text-primary-foreground" />
                      </motion.div>
                      <h1 className="text-3xl font-black">Os teus dados</h1>
                      <p className="text-muted-foreground mt-2">Email e username</p>
                    </div>

                    <div className="space-y-4">
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="Email"
                          value={formData.email}
                          onChange={(e) => updateFormData('email', e.target.value)}
                          className="h-14 pl-12 rounded-2xl bg-muted/50 border-0 text-base focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div className="relative">
                        <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          placeholder="Username"
                          value={formData.username}
                          onChange={(e) => updateFormData('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          className="h-14 pl-12 rounded-2xl bg-muted/50 border-0 text-base focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={() => {
                        if (!formData.email || !formData.username) {
                          toast.error('Preenche todos os campos');
                          return;
                        }
                        setSignupStep(3);
                      }}
                      className="w-full h-14 rounded-2xl text-lg font-bold bg-gradient-to-r from-primary to-primary/80"
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
                        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 mx-auto shadow-xl"
                      >
                        <Lock className="h-10 w-10 text-primary-foreground" />
                      </motion.div>
                      <h1 className="text-3xl font-black">Cria uma senha</h1>
                      <p className="text-muted-foreground mt-2">Mínimo 6 caracteres</p>
                    </div>

                    <div className="space-y-4">
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Senha"
                          value={formData.password}
                          onChange={(e) => updateFormData('password', e.target.value)}
                          className="h-14 pl-12 pr-12 rounded-2xl bg-muted/50 border-0 text-base focus:ring-2 focus:ring-primary"
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

                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Confirmar senha"
                          value={formData.confirmPassword}
                          onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                          className="h-14 pl-12 rounded-2xl bg-muted/50 border-0 text-base focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={() => {
                        if (formData.password.length < 6) {
                          toast.error('A senha deve ter no mínimo 6 caracteres');
                          return;
                        }
                        if (formData.password !== formData.confirmPassword) {
                          toast.error('As senhas não coincidem');
                          return;
                        }
                        setSignupStep(4);
                      }}
                      className="w-full h-14 rounded-2xl text-lg font-bold bg-gradient-to-r from-primary to-primary/80"
                    >
                      Continuar <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </motion.div>
                )}

                {/* Step 4: Confirmation */}
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
                        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-4 mx-auto shadow-xl"
                      >
                        <Check className="h-10 w-10 text-white" />
                      </motion.div>
                      <h1 className="text-3xl font-black">Tudo pronto!</h1>
                      <p className="text-muted-foreground mt-2">Confirma os teus dados</p>
                    </div>

                    <div className="space-y-3 bg-muted/30 rounded-2xl p-4">
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">Nome</span>
                        <span className="font-semibold">{formData.firstName}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">Email</span>
                        <span className="font-semibold text-sm">{formData.email}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-muted-foreground">Username</span>
                        <span className="font-semibold">@{formData.username}</span>
                      </div>
                    </div>

                    <Button
                      onClick={handleSignup}
                      disabled={isLoading}
                      className="w-full h-14 rounded-2xl text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg"
                    >
                      {isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <>Criar Conta <Sparkles className="ml-2 h-5 w-5" /></>
                      )}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
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
                transition={{ type: "spring" }}
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6 mx-auto shadow-xl"
              >
                <Mail className="h-10 w-10 text-primary-foreground" />
              </motion.div>

              <h1 className="text-3xl font-black text-center mb-2">Recuperar senha</h1>
              <p className="text-muted-foreground text-center mb-8">
                Vamos enviar um link para redefinires a tua senha
              </p>

              <div className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="O teu email"
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                    className="h-14 pl-12 rounded-2xl bg-muted/50 border-0 text-base focus:ring-2 focus:ring-primary"
                  />
                </div>

                <Button
                  onClick={handleForgotPassword}
                  disabled={isLoading}
                  className="w-full h-14 rounded-2xl text-lg font-bold bg-gradient-to-r from-primary to-primary/80"
                >
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    'Enviar email'
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}