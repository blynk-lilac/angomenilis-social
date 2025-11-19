import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface ChatPinProtectionProps {
  correctPin: string;
  chatPartnerName: string;
  onUnlock: () => void;
}

export default function ChatPinProtection({ correctPin, chatPartnerName, onUnlock }: ChatPinProtectionProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === correctPin) {
        onUnlock();
      } else {
        setError(true);
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 1000);
      }
    }
  }, [pin, correctPin, onUnlock]);

  const handleForgotPin = () => {
    toast({
      title: 'Recuperação de PIN',
      description: 'Entre em contato com o suporte para redefinir seu PIN',
    });
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-4">
        {/* Lock Icon */}
        <div className="flex justify-center">
          <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-12 w-12 text-primary" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Conversa Protegida</h2>
          <p className="text-muted-foreground">
            Digite o PIN para acessar a conversa com {chatPartnerName}
          </p>
        </div>

        {/* PIN Input */}
        <div className="space-y-4">
          <div className="relative">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={(e) => {
                setError(false);
                setPin(e.target.value.replace(/\D/g, ''));
              }}
              className={`text-center text-3xl tracking-[1em] font-bold h-16 ${
                error ? 'border-destructive animate-shake' : ''
              }`}
              autoFocus
            />
            {error && (
              <div className="absolute -bottom-6 left-0 right-0 flex items-center justify-center gap-1 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>PIN incorreto</span>
              </div>
            )}
          </div>

          {/* PIN Dots Indicator */}
          <div className="flex justify-center gap-3 mt-8">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-3 w-3 rounded-full transition-all ${
                  pin.length > i
                    ? error
                      ? 'bg-destructive scale-110'
                      : 'bg-primary scale-110'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            variant="outline"
            onClick={handleForgotPin}
            className="w-full"
          >
            Esqueci meu PIN
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate('/messages')}
            className="w-full"
          >
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );
}
