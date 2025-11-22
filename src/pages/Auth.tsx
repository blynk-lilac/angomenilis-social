import { useState } from 'react';
import { Navigate } from 'react-router-dom';
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

type AuthMode = 'selection' | 'login' | 'signup' | 'forgotPassword' | 'resetPassword';
type SignupStep = 'firstName' | 'credentials' | 'phoneVerification' | 'password' | 'loading' | 'verification';

export default function Auth() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<AuthMode>('selection');
  const [signupStep, setSignupStep] = useState<SignupStep>('firstName');
  const [resetEmail, setResetEmail] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    credential: '',
    password: '',
    username: '',
  });

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Mode Selection */}
      {mode === 'selection' && (
        <AuthMode onSelectMode={(selectedMode) => setMode(selectedMode)} />
      )}

      {/* Login Flow */}
      {mode === 'login' && (
        <AuthLogin
          onBack={() => setMode('selection')}
          onForgotPassword={(email) => {
            setResetEmail(email);
            setMode('forgotPassword');
          }}
        />
      )}

      {/* Forgot Password Flow */}
      {mode === 'forgotPassword' && (
        <AuthForgotPassword
          initialEmail={resetEmail}
          onBack={() => setMode('login')}
          onCodeSent={(email) => {
            setResetEmail(email);
            setMode('resetPassword');
          }}
        />
      )}

      {/* Reset Password Flow */}
      {mode === 'resetPassword' && (
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Verifique seu E-mail</h2>
          <p className="text-muted-foreground">
            Enviamos um link de recuperação para
          </p>
          <p className="font-semibold text-foreground">{resetEmail}</p>
          <p className="text-sm text-muted-foreground">
            Clique no link recebido no e-mail para criar uma nova senha
          </p>
          <Button
            variant="outline"
            className="w-full h-14 text-lg rounded-2xl"
            onClick={() => setMode('login')}
          >
            Voltar para Login
          </Button>
        </div>
      )}

      {/* Signup Flow */}
      {mode === 'signup' && (
        <>
          {signupStep === 'firstName' && (
            <AuthFirstName
              onNext={(firstName) => {
                updateFormData({ firstName });
                setSignupStep('credentials');
              }}
            />
          )}
          
          {signupStep === 'credentials' && (
            <AuthCredentials
              onNext={(credential, username) => {
                updateFormData({ credential, username });
                // Se for telefone, verificar antes de continuar
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
        </>
      )}
    </div>
  );
}
