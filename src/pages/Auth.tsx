import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthFirstName } from '@/components/auth/AuthFirstName';
import { AuthCredentials } from '@/components/auth/AuthCredentials';
import { AuthPassword } from '@/components/auth/AuthPassword';
import { AuthLoading } from '@/components/auth/AuthLoading';
import { AuthVerification } from '@/components/auth/AuthVerification';

type AuthStep = 'firstName' | 'credentials' | 'password' | 'loading' | 'verification';

export default function Auth() {
  const { user, loading } = useAuth();
  const [step, setStep] = useState<AuthStep>('firstName');
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
      {step === 'firstName' && (
        <AuthFirstName
          onNext={(firstName) => {
            updateFormData({ firstName });
            setStep('credentials');
          }}
        />
      )}
      
      {step === 'credentials' && (
        <AuthCredentials
          onNext={(credential, username) => {
            updateFormData({ credential, username });
            setStep('password');
          }}
          onBack={() => setStep('firstName')}
        />
      )}
      
      {step === 'password' && (
        <AuthPassword
          firstName={formData.firstName}
          credential={formData.credential}
          username={formData.username}
          onNext={(password) => {
            updateFormData({ password });
            setStep('loading');
          }}
          onBack={() => setStep('credentials')}
        />
      )}
      
      {step === 'loading' && (
        <AuthLoading
          onComplete={() => setStep('verification')}
        />
      )}
      
      {step === 'verification' && (
        <AuthVerification
          email={formData.credential}
        />
      )}
    </div>
  );
}
