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
  Smartphone,
  Shield,
  Sparkles,
  Check,
  Loader2
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-8 w-8 text-primary" />
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

      toast.success('Conta criada! Verifique seu email.');
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

  const pageVariants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 }
  };

  const iconVariants = {
    initial: { scale: 0, rotate: -180 },
    animate: { scale: 1, rotate: 0 },
    hover: { scale: 1.1, rotate: 5 }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.15, scale: 1 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
          className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/30 to-accent/20 blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.1, scale: 1.2 }}
          transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", delay: 1 }}
          className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-accent/20 to-primary/30 blur-3xl"
        />
      </div>

      <AnimatePresence mode="wait">
        {/* Welcome Screen */}
        {mode === 'welcome' && (
          <motion.div
            key="welcome"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col items-center justify-center px-6 relative z-10"
          >
            {/* Logo Animation */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", duration: 0.8 }}
              className="mb-8"
            >
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-2xl">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl font-black text-primary-foreground"
                >
                  B
                </motion.span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl font-black text-foreground mb-3"
            >
              Blynk
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground text-center mb-12 max-w-xs"
            >
              Conecte-se com amigos e compartilhe momentos incríveis
            </motion.p>

            {/* Feature Icons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex gap-8 mb-12"
            >
              {[
                { icon: Sparkles, label: 'Stories' },
                { icon: Shield, label: 'Seguro' },
                { icon: Smartphone, label: 'Mobile' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  variants={iconVariants}
                  initial="initial"
                  animate="animate"
                  whileHover="hover"
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                    <item.icon className="h-6 w-6 text-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="w-full max-w-xs space-y-3"
            >
              <Button
                onClick={() => setMode('signup')}
                className="w-full h-14 rounded-2xl text-lg font-semibold bg-primary hover:bg-primary/90 transition-all"
              >
                Criar Conta
              </Button>
              <Button
                onClick={() => setMode('login')}
                variant="outline"
                className="w-full h-14 rounded-2xl text-lg font-semibold border-2"
              >
                Já tenho conta
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* Login Screen */}
        {mode === 'login' && (
          <motion.div
            key="login"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col px-6 pt-12 relative z-10"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMode('welcome')}
              className="absolute top-4 left-4 rounded-full"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>

            <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" }}
                className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-8 mx-auto"
              >
                <User className="h-8 w-8 text-primary-foreground" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-3xl font-black text-center mb-2"
              >
                Bem-vindo de volta
              </motion.h1>
              <p className="text-muted-foreground text-center mb-8">
                Entre na sua conta Blynk
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={(e) => updateFormData('email', e.target.value)}
                      className="h-14 pl-12 rounded-2xl bg-muted border-0 text-lg"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => updateFormData('password', e.target.value)}
                      className="h-14 pl-12 pr-12 rounded-2xl bg-muted border-0 text-lg"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>

                <Button
                  variant="link"
                  onClick={() => setMode('forgotPassword')}
                  className="px-0 text-muted-foreground hover:text-foreground"
                >
                  Esqueceu a senha?
                </Button>

                <Button
                  onClick={handleLogin}
                  disabled={isLoading}
                  className="w-full h-14 rounded-2xl text-lg font-semibold mt-4"
                >
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      Entrar <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>

              <p className="text-center text-muted-foreground mt-8">
                Não tem conta?{' '}
                <Button
                  variant="link"
                  onClick={() => setMode('signup')}
                  className="px-0 font-semibold text-foreground"
                >
                  Criar agora
                </Button>
              </p>
            </div>
          </motion.div>
        )}

        {/* Signup Screen */}
        {mode === 'signup' && (
          <motion.div
            key="signup"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col px-6 pt-12 relative z-10"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signupStep > 1 ? setSignupStep((signupStep - 1) as SignupStep) : setMode('welcome')}
              className="absolute top-4 left-4 rounded-full"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>

            {/* Progress Steps */}
            <div className="flex justify-center gap-2 mb-8 mt-8">
              {[1, 2, 3, 4].map((step) => (
                <motion.div
                  key={step}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: signupStep >= step ? 1 : 0.8 }}
                  className={`h-2 w-8 rounded-full transition-colors ${
                    signupStep >= step ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
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
                        className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4 mx-auto"
                      >
                        <User className="h-8 w-8 text-primary-foreground" />
                      </motion.div>
                      <h1 className="text-3xl font-black">Como te chamas?</h1>
                      <p className="text-muted-foreground mt-2">Este será seu nome de exibição</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Primeiro nome</Label>
                      <Input
                        placeholder="Seu nome"
                        value={formData.firstName}
                        onChange={(e) => updateFormData('firstName', e.target.value)}
                        className="h-14 rounded-2xl bg-muted border-0 text-lg text-center"
                        autoFocus
                      />
                    </div>

                    <Button
                      onClick={() => {
                        if (!formData.firstName) {
                          toast.error('Digite seu nome');
                          return;
                        }
                        setSignupStep(2);
                      }}
                      className="w-full h-14 rounded-2xl text-lg font-semibold"
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
                        className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4 mx-auto"
                      >
                        <Mail className="h-8 w-8 text-primary-foreground" />
                      </motion.div>
                      <h1 className="text-3xl font-black">Seus dados</h1>
                      <p className="text-muted-foreground mt-2">Email e nome de usuário</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="seu@email.com"
                            value={formData.email}
                            onChange={(e) => updateFormData('email', e.target.value)}
                            className="h-14 pl-12 rounded-2xl bg-muted border-0 text-lg"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Nome de usuário</Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                          <Input
                            placeholder="username"
                            value={formData.username}
                            onChange={(e) => updateFormData('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                            className="h-14 pl-10 rounded-2xl bg-muted border-0 text-lg"
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => {
                        if (!formData.email || !formData.username) {
                          toast.error('Preencha todos os campos');
                          return;
                        }
                        setSignupStep(3);
                      }}
                      className="w-full h-14 rounded-2xl text-lg font-semibold"
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
                        className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4 mx-auto"
                      >
                        <Lock className="h-8 w-8 text-primary-foreground" />
                      </motion.div>
                      <h1 className="text-3xl font-black">Crie uma senha</h1>
                      <p className="text-muted-foreground mt-2">Mínimo de 6 caracteres</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Senha</Label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => updateFormData('password', e.target.value)}
                            className="h-14 pl-12 pr-12 rounded-2xl bg-muted border-0 text-lg"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2"
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Confirmar senha</Label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                            className="h-14 pl-12 rounded-2xl bg-muted border-0 text-lg"
                          />
                        </div>
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
                      className="w-full h-14 rounded-2xl text-lg font-semibold"
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
                        className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4 mx-auto"
                      >
                        <Check className="h-8 w-8 text-primary-foreground" />
                      </motion.div>
                      <h1 className="text-3xl font-black">Tudo pronto!</h1>
                      <p className="text-muted-foreground mt-2">Confirme seus dados</p>
                    </div>

                    <div className="bg-muted rounded-2xl p-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Nome</span>
                        <span className="font-semibold">{formData.firstName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Email</span>
                        <span className="font-semibold">{formData.email}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Usuário</span>
                        <span className="font-semibold">@{formData.username}</span>
                      </div>
                    </div>

                    <Button
                      onClick={handleSignup}
                      disabled={isLoading}
                      className="w-full h-14 rounded-2xl text-lg font-semibold"
                    >
                      {isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <>
                          Criar conta <Sparkles className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Forgot Password */}
        {mode === 'forgotPassword' && (
          <motion.div
            key="forgot"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col px-6 pt-12 relative z-10"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMode('login')}
              className="absolute top-4 left-4 rounded-full"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>

            <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-8 mx-auto"
              >
                <Lock className="h-8 w-8 text-primary-foreground" />
              </motion.div>

              <h1 className="text-3xl font-black text-center mb-2">Esqueceu a senha?</h1>
              <p className="text-muted-foreground text-center mb-8">
                Digite seu email para receber um link de recuperação
              </p>

              <div className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                    className="h-14 pl-12 rounded-2xl bg-muted border-0 text-lg"
                  />
                </div>

                <Button
                  onClick={handleForgotPassword}
                  disabled={isLoading}
                  className="w-full h-14 rounded-2xl text-lg font-semibold"
                >
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    'Enviar link'
                  )}
                </Button>
              </div>

              <Button
                variant="link"
                onClick={() => setMode('login')}
                className="mt-6 text-muted-foreground"
              >
                Voltar ao login
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
