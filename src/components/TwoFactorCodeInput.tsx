import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Timer } from 'lucide-react';

interface TwoFactorCodeInputProps {
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  loading?: boolean;
}

export default function TwoFactorCodeInput({ onVerify, onResend, loading }: TwoFactorCodeInputProps) {
  const [digit1, setDigit1] = useState('');
  const [digit2, setDigit2] = useState('');
  const [timeLeft, setTimeLeft] = useState(10);
  const [isExpired, setIsExpired] = useState(false);
  const input1Ref = useRef<HTMLInputElement>(null);
  const input2Ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input1Ref.current?.focus();
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) {
      setIsExpired(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleDigit1Change = (value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '').slice(0, 1);
    setDigit1(sanitized);
    if (sanitized && input2Ref.current) {
      input2Ref.current.focus();
    }
  };

  const handleDigit2Change = (value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '').slice(0, 1);
    setDigit2(sanitized);
    if (sanitized && digit1 && !isExpired) {
      onVerify(digit1 + sanitized);
    }
  };

  const handleResendClick = () => {
    setDigit1('');
    setDigit2('');
    setTimeLeft(10);
    setIsExpired(false);
    onResend();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, position: number) => {
    if (e.key === 'Backspace' && !e.currentTarget.value && position === 2) {
      input1Ref.current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    if (isExpired) return;
    
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 2);
    if (pastedData.length >= 1) {
      setDigit1(pastedData[0]);
    }
    if (pastedData.length >= 2) {
      setDigit2(pastedData[1]);
      onVerify(pastedData);
    } else if (pastedData.length === 1) {
      input2Ref.current?.focus();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6 p-6">
      <div className="flex flex-col items-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Código de Verificação</h2>
        <p className="text-sm text-muted-foreground text-center">
          Digite o código de 2 dígitos que foi enviado
        </p>
        
        {/* Timer */}
        <div className="flex items-center gap-2 mt-2">
          <Timer className={`w-4 h-4 ${isExpired ? 'text-destructive' : 'text-primary'}`} />
          <span className={`text-sm font-mono font-bold ${isExpired ? 'text-destructive' : 'text-primary'}`}>
            {isExpired ? 'Expirado' : `${timeLeft}s`}
          </span>
        </div>
        
        {isExpired && (
          <p className="text-xs text-destructive text-center mt-2">
            O código expirou. Clique em "Reenviar código" para receber um novo.
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Input
          ref={input1Ref}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit1}
          onChange={(e) => handleDigit1Change(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 1)}
          onPaste={handlePaste}
          className="w-16 h-16 text-center text-2xl font-bold"
          disabled={loading || isExpired}
        />
        <Input
          ref={input2Ref}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit2}
          onChange={(e) => handleDigit2Change(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 2)}
          className="w-16 h-16 text-center text-2xl font-bold"
          disabled={loading || isExpired}
        />
      </div>

      <Button
        variant="ghost"
        onClick={handleResendClick}
        disabled={loading}
        className="text-sm"
      >
        Reenviar código
      </Button>
    </div>
  );
}