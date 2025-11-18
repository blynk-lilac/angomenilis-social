import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthMode } from '@/components/auth/AuthMode';
import { AuthLogin } from '@/components/auth/AuthLogin';
import { AuthFirstName } from '@/components/auth/AuthFirstName';
import { AuthCredentials } from '@/components/auth/AuthCredentials';
import { AuthPassword } from '@/components/auth/AuthPassword';
import { AuthLoading } from '@/components/auth/AuthLoading';
import { AuthVerification } from '@/components/auth/AuthVerification';
import { AuthForgotPassword } from '@/components/auth/AuthForgotPassword';
import { AuthResetPassword } from '@/components/auth/AuthResetPassword';

type AuthMode = 'selection' | 'login' | 'signup' | 'forgotPassword' | 'resetPassword';
type SignupStep = 'firstName' | 'credentials' | 'password' | 'loading' | 'verification';

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
    return <Navigate to="/" replace />;
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
        <AuthResetPassword
          email={resetEmail}
          onSuccess={() => setMode('login')}
        />
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
                setSignupStep('password');
              }}
              onBack={() => setSignupStep('firstName')}
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
