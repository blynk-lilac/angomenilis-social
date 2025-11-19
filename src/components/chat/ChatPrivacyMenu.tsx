import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Image, Clock, Shield, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ChatPrivacyMenuProps {
  chatPartnerId: string;
  chatPartnerName: string;
}

export default function ChatPrivacyMenu({ chatPartnerId, chatPartnerName }: ChatPrivacyMenuProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState({
    media_visibility: true,
    temporary_messages_duration: 'disabled',
    is_locked: false,
    pin_code: '',
  });
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState('');

  useEffect(() => {
    if (user && chatPartnerId) {
      loadSettings();
    }
  }, [user, chatPartnerId]);

  const loadSettings = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('chat_settings')
      .select('*')
      .eq('user_id', user.id)
      .eq('chat_partner_id', chatPartnerId)
      .single();

    if (data) {
      setSettings({
        media_visibility: data.media_visibility,
        temporary_messages_duration: data.temporary_messages_duration,
        is_locked: data.is_locked,
        pin_code: data.pin_code || '',
      });
    }
  };

  const updateSettings = async (updates: Partial<typeof settings>) => {
    if (!user) return;

    const newSettings = { ...settings, ...updates };
    
    const { error } = await supabase
      .from('chat_settings')
      .upsert({
        user_id: user.id,
        chat_partner_id: chatPartnerId,
        ...newSettings,
      });

    if (error) {
      toast({
        title: 'Erro ao atualizar configurações',
        variant: 'destructive',
      });
    } else {
      setSettings(newSettings);
      toast({
        title: 'Configurações atualizadas',
      });
      
      // Trigger reload of settings in Chat component
      window.dispatchEvent(new CustomEvent('chatSettingsUpdated', { 
        detail: { chatPartnerId } 
      }));
    }
  };

  const handlePinSetup = async () => {
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      toast({
        title: 'PIN inválido',
        description: 'O PIN deve ter 4 dígitos',
        variant: 'destructive',
      });
      return;
    }

    await updateSettings({ pin_code: newPin, is_locked: true });
    setNewPin('');
    setShowPinSetup(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10">
          <Lock className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-center text-xl">
            {chatPartnerName} (Eu)
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto h-[calc(100%-80px)] pb-6">
          {/* Media Visibility */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-3">
              <Image className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Visibilidade dos ficheiros</p>
                <p className="text-sm text-muted-foreground">
                  {settings.media_visibility ? 'Sim' : 'Não'}
                </p>
              </div>
            </div>
            <Switch
              checked={settings.media_visibility}
              onCheckedChange={(checked) => updateSettings({ media_visibility: checked })}
            />
          </div>

          {/* Temporary Messages */}
          <div className="p-4 rounded-xl bg-muted/50 space-y-3">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Mensagens temporárias</p>
                <p className="text-sm text-muted-foreground">
                  {settings.temporary_messages_duration === 'disabled'
                    ? 'Desativadas'
                    : settings.temporary_messages_duration}
                </p>
              </div>
            </div>
            <Select
              value={settings.temporary_messages_duration}
              onValueChange={(value) => updateSettings({ temporary_messages_duration: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="disabled">Desativadas</SelectItem>
                <SelectItem value="5min">5 minutos</SelectItem>
                <SelectItem value="1h">1 hora</SelectItem>
                <SelectItem value="24h">24 horas</SelectItem>
                <SelectItem value="7d">7 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lock Chat */}
          <div className="p-4 rounded-xl bg-muted/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Trancar conversa</p>
                  <p className="text-sm text-muted-foreground">
                    Proteger com PIN de 4 dígitos
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.is_locked}
                onCheckedChange={(checked) => {
                  if (checked && !settings.pin_code) {
                    setShowPinSetup(true);
                  } else {
                    updateSettings({ is_locked: checked });
                  }
                }}
              />
            </div>

            {showPinSetup && (
              <div className="space-y-3 animate-in slide-in-from-top-2">
                <Label htmlFor="pin">Criar PIN de 4 dígitos</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-widest"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handlePinSetup}
                    className="flex-1"
                  >
                    Confirmar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPinSetup(false);
                      setNewPin('');
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {settings.is_locked && settings.pin_code && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPinSetup(true)}
                className="w-full"
              >
                Alterar PIN
              </Button>
            )}
          </div>

          {/* Privacy */}
          <div className="p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Privacidade avançada da conversa</p>
                <p className="text-sm text-muted-foreground">Ativado</p>
              </div>
            </div>
          </div>

          {/* Remove from Favorites */}
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-14 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Heart className="h-5 w-5" />
            Remover dos favoritos
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
