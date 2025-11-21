import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Shield, AlertTriangle, Key, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function Security() {
  const navigate = useNavigate();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [antiHackEnabled, setAntiHackEnabled] = useState(true);

  const handleTwoFactorToggle = (enabled: boolean) => {
    setTwoFactorEnabled(enabled);
    if (enabled) {
      toast.success('Autenticação de dois fatores ativada');
    } else {
      toast.success('Autenticação de dois fatores desativada');
    }
  };

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      <header className="sticky top-0 z-40 bg-card border-b border-border safe-area-top">
        <div className="flex items-center h-14 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Segurança</h1>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto pb-20">
        <div className="space-y-6">
          {/* Two Factor Authentication */}
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3 flex-1">
                <Smartphone className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Autenticação de Dois Fatores</h3>
                  <p className="text-sm text-muted-foreground">
                    Adicione uma camada extra de segurança à sua conta
                  </p>
                </div>
              </div>
              <Switch 
                checked={twoFactorEnabled}
                onCheckedChange={handleTwoFactorToggle}
              />
            </div>
          </div>

          {/* Anti-Hack Protection */}
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3 flex-1">
                <Shield className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Proteção Anti-Hack</h3>
                  <p className="text-sm text-muted-foreground">
                    Sistema ativo de proteção contra invasões
                  </p>
                </div>
              </div>
              <Switch 
                checked={antiHackEnabled}
                onCheckedChange={setAntiHackEnabled}
                disabled
              />
            </div>
          </div>
          {/* VPN Warning */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-destructive mb-2">Uso de VPN Não Permitido</h3>
                <p className="text-sm text-muted-foreground">
                  Por motivos de segurança, o uso de VPNs não é permitido nesta plataforma. 
                  Detectamos e bloqueamos automaticamente conexões através de VPNs para proteger 
                  a integridade do serviço e dos dados dos usuários.
                </p>
              </div>
            </div>
          </div>

          {/* Security Features */}
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/20">
            <div className="flex items-start gap-3">
              <Shield className="h-6 w-6 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-3 text-blue-500">Recursos de Segurança Ativos</h3>
                <ul className="text-sm space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Criptografia de ponta a ponta</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Proteção contra SQL Injection</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Firewall de aplicação ativo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Detecção de atividades suspeitas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Anti-vírus em tempo real</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Proteção contra força bruta</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Monitoramento de vulnerabilidades</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Additional Security Tips */}
          <div className="bg-muted/50 rounded-xl p-4">
            <h3 className="font-semibold mb-3">Dicas de Segurança</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>✓ Use uma senha forte e única</li>
              <li>✓ Não compartilhe suas credenciais</li>
              <li>✓ Atualize sua senha regularmente</li>
              <li>✓ Verifique atividades suspeitas na sua conta</li>
              <li>✓ Faça logout em dispositivos não utilizados</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
