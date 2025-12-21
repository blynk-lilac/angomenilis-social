import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  ArrowLeft, 
  Smartphone, 
  Laptop, 
  Tablet, 
  MapPin, 
  Shield, 
  AlertTriangle,
  Check,
  X,
  Clock,
  Globe,
  Monitor,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  RefreshCw
} from 'lucide-react';
import { useDeviceManager } from '@/hooks/useDeviceManager';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function DeviceSecurity() {
  const navigate = useNavigate();
  const {
    devices,
    accessHistory,
    securitySettings,
    loading,
    currentDeviceId,
    trustDevice,
    removeDevice,
    updateSecuritySettings,
    reportSuspiciousActivity,
    refreshDevices,
    refreshHistory
  } = useDeviceManager();

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile': return <Smartphone className="h-6 w-6" />;
      case 'tablet': return <Tablet className="h-6 w-6" />;
      default: return <Laptop className="h-6 w-6" />;
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'high':
        return <Badge variant="destructive">Alto Risco</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">Médio</Badge>;
      default:
        return <Badge variant="secondary">Baixo</Badge>;
    }
  };

  const getActionIcon = (action: string, success: boolean) => {
    if (!success) return <X className="h-4 w-4 text-destructive" />;
    
    switch (action) {
      case 'login':
      case 'new_device_login':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'suspicious_report':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Shield className="h-4 w-4 text-primary" />;
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'login': 'Início de sessão',
      'new_device_login': 'Novo dispositivo',
      'logout': 'Término de sessão',
      'password_change': 'Alteração de senha',
      'email_change': 'Alteração de e-mail',
      'suspicious_report': 'Atividade reportada'
    };
    return labels[action] || action;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="flex items-center h-14 px-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold ml-2">Dispositivos e Segurança</h1>
          </div>
        </header>
        <main className="p-4 space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold ml-2">Dispositivos e Segurança</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => { refreshDevices(); refreshHistory(); }}>
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto pb-20">
        {/* Account at Risk Alert */}
        {securitySettings?.account_at_risk && (
          <div className="bg-destructive/10 border border-destructive rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-6 w-6 text-destructive flex-shrink-0" />
              <div>
                <h3 className="font-bold text-destructive">Conta em Modo de Risco</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  A sua conta está em modo de proteção. Todas as ações sensíveis estão bloqueadas.
                </p>
                <Button 
                  size="sm" 
                  className="mt-3"
                  onClick={() => updateSecuritySettings({ account_at_risk: false })}
                >
                  Desativar Modo de Risco
                </Button>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="devices" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="devices">Dispositivos</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="settings">Definições</TabsTrigger>
          </TabsList>

          {/* Devices Tab */}
          <TabsContent value="devices" className="space-y-4">
            {/* Device Map Placeholder */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Mapa de Dispositivos</h3>
                </div>
              </div>
              <div className="h-48 bg-muted flex items-center justify-center relative">
                <Globe className="h-16 w-16 text-muted-foreground/30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      {devices.length} dispositivo(s) registado(s)
                    </p>
                    {devices.filter(d => d.city).map((device, i) => (
                      <div key={device.id} className="flex items-center justify-center gap-1 mt-1">
                        <div className={`w-2 h-2 rounded-full ${device.is_current ? 'bg-green-500' : 'bg-primary'}`} />
                        <span className="text-xs">{device.city}, {device.country}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Device List */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Dispositivos ({devices.length})
              </h3>
              
              {devices.map(device => (
                <div 
                  key={device.id} 
                  className={`bg-card rounded-xl p-4 border ${device.is_current ? 'border-green-500' : 'border-border'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${device.is_trusted ? 'bg-green-500/10' : 'bg-muted'}`}>
                        {getDeviceIcon(device.device_type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{device.device_name || 'Dispositivo'}</h4>
                          {device.is_current && (
                            <Badge variant="outline" className="text-green-500 border-green-500">
                              Atual
                            </Badge>
                          )}
                          {device.is_trusted && (
                            <ShieldCheck className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {device.browser} • {device.os}
                        </p>
                        {device.city && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {device.city}, {device.country}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          Último acesso: {format(new Date(device.last_active), "d MMM yyyy, HH:mm", { locale: pt })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!device.is_trusted && !device.is_current && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => trustDevice(device.id)}
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </Button>
                      )}
                      {!device.is_current && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeDevice(device.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <div className="space-y-3">
              {accessHistory.map(log => (
                <div key={log.id} className="bg-card rounded-xl p-4 border border-border">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        {getActionIcon(log.action_type, log.success)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{getActionLabel(log.action_type)}</h4>
                          {getRiskBadge(log.risk_level)}
                        </div>
                        {log.city && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {log.city}, {log.country}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(log.created_at), "d MMM yyyy, HH:mm", { locale: pt })}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => reportSuspiciousActivity(log.id)}
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Não fui eu
                    </Button>
                  </div>
                </div>
              ))}

              {accessHistory.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum histórico de acesso</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <div className="bg-card rounded-xl border border-border divide-y divide-border">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Máximo de Dispositivos</h4>
                  <p className="text-sm text-muted-foreground">
                    Limite de {securitySettings?.max_devices || 5} dispositivos ativos
                  </p>
                </div>
                <select 
                  className="bg-muted rounded-lg px-3 py-2"
                  value={securitySettings?.max_devices || 5}
                  onChange={(e) => updateSecuritySettings({ max_devices: parseInt(e.target.value) })}
                >
                  {[1, 2, 3, 5, 10].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Derrubar Sessões Antigas</h4>
                  <p className="text-sm text-muted-foreground">
                    Novo login encerra sessões anteriores
                  </p>
                </div>
                <Switch 
                  checked={securitySettings?.kick_old_sessions || false}
                  onCheckedChange={(checked) => updateSecuritySettings({ kick_old_sessions: checked })}
                />
              </div>

              <div className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Apenas Dispositivos Confiáveis</h4>
                  <p className="text-sm text-muted-foreground">
                    Bloquear login em dispositivos não aprovados
                  </p>
                </div>
                <Switch 
                  checked={securitySettings?.trusted_devices_only || false}
                  onCheckedChange={(checked) => updateSecuritySettings({ trusted_devices_only: checked })}
                />
              </div>

              <div className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Confirmar Alteração de E-mail</h4>
                  <p className="text-sm text-muted-foreground">
                    Requer confirmação para mudar e-mail
                  </p>
                </div>
                <Switch 
                  checked={securitySettings?.require_confirmation_email || false}
                  onCheckedChange={(checked) => updateSecuritySettings({ require_confirmation_email: checked })}
                />
              </div>

              <div className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Confirmar Alteração de Senha</h4>
                  <p className="text-sm text-muted-foreground">
                    Requer confirmação para mudar senha
                  </p>
                </div>
                <Switch 
                  checked={securitySettings?.require_confirmation_password || false}
                  onCheckedChange={(checked) => updateSecuritySettings({ require_confirmation_password: checked })}
                />
              </div>

              <div className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Confirmar Criação de Anúncios</h4>
                  <p className="text-sm text-muted-foreground">
                    Requer confirmação para criar anúncios
                  </p>
                </div>
                <Switch 
                  checked={securitySettings?.require_confirmation_ads || false}
                  onCheckedChange={(checked) => updateSecuritySettings({ require_confirmation_ads: checked })}
                />
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
              <h4 className="font-semibold text-destructive flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5" />
                Zona de Perigo
              </h4>
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={() => updateSecuritySettings({ account_at_risk: true })}
              >
                <ShieldAlert className="h-4 w-4 mr-2" />
                Ativar Modo "Conta em Risco"
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Bloqueia todas as ações sensíveis até confirmar identidade
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
