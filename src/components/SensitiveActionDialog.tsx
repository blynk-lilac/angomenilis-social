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
import { Shield, AlertTriangle, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SensitiveActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: 'email_change' | 'password_change' | 'ad_creation' | 'account_delete';
  actionTitle: string;
  actionDescription: string;
  onConfirm: () => void;
}

export function SensitiveActionDialog({
  open,
  onOpenChange,
  actionType,
  actionTitle,
  actionDescription,
  onConfirm
}: SensitiveActionDialogProps) {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'confirm' | 'password'>('confirm');

  const handleConfirmStep = () => {
    setStep('password');
  };

  const handlePasswordConfirm = async () => {
    if (!user || !password) return;

    setLoading(true);
    try {
      // Verify password by attempting to sign in
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email || '',
        password: password
      });

      if (error) {
        toast.error('Palavra-passe incorreta');
        setLoading(false);
        return;
      }

      // Log the sensitive action
      await supabase.from('access_history').insert({
        user_id: user.id,
        action_type: actionType,
        success: true,
        risk_level: 'high'
      });

      // Create security alert
      await supabase.from('security_alerts').insert({
        user_id: user.id,
        alert_type: 'sensitive_action',
        message: `Ação sensível confirmada: ${actionTitle}`
      });

      toast.success('Ação confirmada com sucesso');
      onConfirm();
      onOpenChange(false);
      setPassword('');
      setStep('confirm');
    } catch (error) {
      console.error('Error confirming action:', error);
      toast.error('Erro ao confirmar ação');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setPassword('');
    setStep('confirm');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-yellow-500" />
          </div>
          <DialogTitle className="text-center">{actionTitle}</DialogTitle>
          <DialogDescription className="text-center">
            {step === 'confirm' 
              ? actionDescription 
              : 'Por favor, insira a sua palavra-passe para confirmar esta ação.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'confirm' ? (
          <>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 my-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-600 dark:text-yellow-400">Ação Sensível</p>
                  <p className="text-muted-foreground mt-1">
                    Esta ação requer confirmação adicional para proteger a sua conta.
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button onClick={handleConfirmStep} className="w-full sm:w-auto">
                Continuar
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 my-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Palavra-passe
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Insira a sua palavra-passe"
                  disabled={loading}
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => setStep('confirm')} 
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Voltar
              </Button>
              <Button 
                onClick={handlePasswordConfirm} 
                disabled={loading || !password}
                className="w-full sm:w-auto"
              >
                {loading ? 'A verificar...' : 'Confirmar'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
