import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail } from 'lucide-react';

interface AuthVerificationProps {
  email: string;
}

export const AuthVerification = ({ email }: AuthVerificationProps) => {
  const navigate = useNavigate();
  const [verified, setVerified] = useState(false);

  // Auto-redirect since email is auto-confirmed
  useState(() => {
    const timer = setTimeout(() => {
      setVerified(true);
      setTimeout(() => navigate('/'), 1500);
    }, 2000);
    return () => clearTimeout(timer);
  });

  return (
    <div className="w-full max-w-md space-y-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      {!verified ? (
        <>
          <div className="flex justify-center">
            <div className="p-6 rounded-full bg-primary/10">
              <Mail className="h-16 w-16 text-primary animate-pulse" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Verificando sua conta</h2>
            <p className="text-muted-foreground">
              Aguarde um momento enquanto verificamos seu e-mail
            </p>
            <p className="text-sm text-muted-foreground font-mono bg-muted px-4 py-2 rounded-lg mt-4">
              {email}
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-center">
            <div className="p-6 rounded-full bg-primary/10">
              <CheckCircle className="h-16 w-16 text-primary" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Conta verificada!</h2>
            <p className="text-muted-foreground">
              Redirecionando para o Angomenilis...
            </p>
          </div>
        </>
      )}
    </div>
  );
};
