import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Shield, AlertCircle } from 'lucide-react';

interface PinRecoveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatPartnerId: string;
  onSuccess: () => void;
}

export default function PinRecoveryDialog({ 
  open, 
  onOpenChange, 
  chatPartnerId,
  onSuccess 
}: PinRecoveryDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'confirm' | 'reset'>('confirm');

  const handleReset = async () => {
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      toast({
        title: 'PIN inválido',
        description: 'O PIN deve ter 4 dígitos',
        variant: 'destructive',
      });
      return;
    }

    if (newPin !== confirmPin) {
      toast({
        title: 'PINs não coincidem',
        description: 'Digite o mesmo PIN nos dois campos',
        variant: 'destructive',
      });
      return;
    }

    if (!user) return;

    const { error } = await supabase
      .from('chat_settings')
      .upsert({
        user_id: user.id,
        chat_partner_id: chatPartnerId,
        pin_code: newPin,
        is_locked: true,
      });

    if (error) {
      toast({
        title: 'Erro ao redefinir PIN',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'PIN redefinido com sucesso',
      });
      setNewPin('');
      setConfirmPin('');
      setStep('confirm');
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === 'confirm' ? (
          <>
            <DialogHeader>
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <DialogTitle className="text-center">Esqueceu o PIN?</DialogTitle>
              <DialogDescription className="text-center">
                Você deseja redefinir o PIN desta conversa? Esta ação irá desbloquear 
                a conversa e permitir que você configure um novo PIN.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button onClick={() => setStep('reset')} className="w-full">
                Sim, redefinir PIN
              </Button>
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="w-full"
              >
                Cancelar
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
              </div>
              <DialogTitle className="text-center">Novo PIN</DialogTitle>
              <DialogDescription className="text-center">
                Digite um novo PIN de 4 dígitos para proteger esta conversa
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-pin">Novo PIN</Label>
                <Input
                  id="new-pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-widest"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-pin">Confirmar PIN</Label>
                <Input
                  id="confirm-pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-widest"
                />
              </div>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button 
                onClick={handleReset} 
                className="w-full"
                disabled={newPin.length !== 4 || confirmPin.length !== 4}
              >
                Confirmar
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setStep('confirm');
                  setNewPin('');
                  setConfirmPin('');
                }}
                className="w-full"
              >
                Voltar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
