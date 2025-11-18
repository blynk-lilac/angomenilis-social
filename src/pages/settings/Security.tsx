import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, AlertTriangle } from 'lucide-react';

export default function Security() {
  const navigate = useNavigate();

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

      <main className="p-4 max-w-2xl mx-auto">
        <div className="space-y-6">
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

          {/* Security Info */}
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-2">Segurança da Conta</h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• Todas as senhas são criptografadas</li>
                  <li>• Conexões protegidas por HTTPS</li>
                  <li>• Autenticação de dois fatores disponível</li>
                  <li>• Monitoramento de atividades suspeitas</li>
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
