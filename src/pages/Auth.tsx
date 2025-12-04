import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { AuthMode } from '@/components/auth/AuthMode';
import { AuthLogin } from '@/components/auth/AuthLogin';
import { AuthFirstName } from '@/components/auth/AuthFirstName';
import { AuthCredentials } from '@/components/auth/AuthCredentials';
import { AuthPassword } from '@/components/auth/AuthPassword';
import { AuthLoading } from '@/components/auth/AuthLoading';
import { AuthVerification } from '@/components/auth/AuthVerification';
import { AuthForgotPassword } from '@/components/auth/AuthForgotPassword';
import { PhoneVerification } from '@/components/auth/PhoneVerification';
import { motion, AnimatePresence } from 'framer-motion';

type AuthModeType = 'selection' | 'login' | 'signup' | 'forgotPassword' | 'resetPassword';
type SignupStep = 'firstName' | 'credentials' | 'phoneVerification' | 'password' | 'loading' | 'verification';

export default function Auth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState<AuthModeType>('login');
  const [signupStep, setSignupStep] = useState<SignupStep>('firstName');
  const [resetEmail, setResetEmail] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    credential: '',
    password: '',
    username: '',
  });

  useEffect(() => {
    if (location.state?.mode === 'signup') {
      setMode('signup');
    } else {
      setMode('login');
    }
  }, [location]);

  if (loading) {
    return <AuthLoading isInitial />;
  }

  if (user) {
    return <Navigate to="/feed" replace />;
  }

  const updateFormData = (data: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 2 }}
          className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ duration: 2, delay: 0.5 }}
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/20 rounded-full blur-3xl"
        />
      </div>

      <AnimatePresence mode="wait">
        {/* Login Flow */}
        {mode === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <AuthLogin
              onBack={() => window.history.back()}
              onForgotPassword={(email) => {
                setResetEmail(email);
                setMode('forgotPassword');
              }}
              onSwitchToSignup={() => setMode('signup')}
            />
          </motion.div>
        )}

        {/* Forgot Password Flow */}
        {mode === 'forgotPassword' && (
          <motion.div
            key="forgot"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <AuthForgotPassword
              initialEmail={resetEmail}
              onBack={() => setMode('login')}
              onCodeSent={(email) => {
                setResetEmail(email);
                setMode('resetPassword');
              }}
            />
          </motion.div>
        )}

        {/* Reset Password Flow */}
        {mode === 'resetPassword' && (
          <motion.div
            key="reset"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="text-center space-y-6 bg-card/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-border/50"
          >
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground">Verifique seu E-mail</h2>
            <p className="text-muted-foreground">
              Enviamos um link de recuperação para
            </p>
            <p className="font-semibold text-foreground bg-muted/50 py-2 px-4 rounded-lg">{resetEmail}</p>
            <p className="text-sm text-muted-foreground">
              Clique no link recebido no e-mail para criar uma nova senha
            </p>
            <Button
              variant="link"
              onClick={() => setMode('login')}
              className="text-foreground hover:text-primary"
            >
              Já tem conta? <span className="font-semibold ml-1">Entrar</span>
            </Button>
          </motion.div>
        )}

        {/* Signup Flow */}
        {mode === 'signup' && (
          <motion.div
            key="signup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {signupStep === 'firstName' && (
              <AuthFirstName
                onNext={(firstName) => {
                  updateFormData({ firstName });
                  setSignupStep('credentials');
                }}
                onBack={() => window.history.back()}
              />
            )}
            
            {signupStep === 'credentials' && (
              <AuthCredentials
                onNext={(credential, username) => {
                  updateFormData({ credential, username });
                  if (credential.startsWith('+')) {
                    setSignupStep('phoneVerification');
                  } else {
                    setSignupStep('password');
                  }
                }}
                onBack={() => setSignupStep('firstName')}
              />
            )}
            
            {signupStep === 'phoneVerification' && (
              <PhoneVerification
                phoneNumber={formData.credential}
                onVerified={() => setSignupStep('password')}
                onBack={() => {
                  if (formData.credential.startsWith('+')) {
                    setSignupStep('phoneVerification');
                  } else {
                    setSignupStep('credentials');
                  }
                }}
              />
            )}
            
            {signupStep === 'password' && (
              <AuthPassword
                firstName={formData.firstName}
                credential={formData.credential}
                username={formData.username}
                onNext={(password) => {
                  updateFormData({ password });
                  setSignupStep('loading');
                }}
                onBack={() => setSignupStep('credentials')}
              />
            )}
            
            {signupStep === 'loading' && (
              <AuthLoading
                onComplete={() => setSignupStep('verification')}
              />
            )}
            
            {signupStep === 'verification' && (
              <AuthVerification
                email={formData.credential}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}