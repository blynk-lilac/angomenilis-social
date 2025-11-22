import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSettings } from '@/contexts/SettingsContext';
import { Moon, Sun, Wifi, WifiOff, Languages } from 'lucide-react';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const { settings, updateSettings } = useSettings();

  const languages = [
    { value: 'pt', label: 'Português' },
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
    { value: 'it', label: 'Italiano' },
    { value: 'zh', label: '中文' },
    { value: 'ja', label: '日本語' },
    { value: 'ko', label: '한국어' },
    { value: 'ar', label: 'العربية' },
    { value: 'ru', label: 'Русский' },
    { value: 'hi', label: 'हिन्दी' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tema */}
          <div className="space-y-3">
            <Label className="text-base flex items-center gap-2">
              {settings.theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              Tema
            </Label>
            <RadioGroup
              value={settings.theme}
              onValueChange={(value) => updateSettings({ theme: value as 'light' | 'dark' })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="light" id="light" />
                <Label htmlFor="light" className="font-normal cursor-pointer">Claro</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="dark" />
                <Label htmlFor="dark" className="font-normal cursor-pointer">Escuro</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Idioma */}
          <div className="space-y-3">
            <Label className="text-base flex items-center gap-2">
              <Languages className="h-4 w-4" />
              Idioma de Tradução
            </Label>
            <Select
              value={settings.language}
              onValueChange={(value) => updateSettings({ language: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Idioma para o qual os posts serão traduzidos quando você clicar em "Traduzir"
            </p>
          </div>

          {/* Qualidade de Mídia */}
          <div className="space-y-3">
            <Label className="text-base flex items-center gap-2">
              {settings.media_quality === 'data-saver' ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
              Qualidade de Mídia
            </Label>
            <RadioGroup
              value={settings.media_quality}
              onValueChange={(value) => updateSettings({ media_quality: value as any })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="high" />
                <Label htmlFor="high" className="font-normal cursor-pointer">
                  Alta - Melhor qualidade
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium" className="font-normal cursor-pointer">
                  Média - Equilibrado
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="low" />
                <Label htmlFor="low" className="font-normal cursor-pointer">
                  Baixa - Poupa dados
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="data-saver" id="data-saver" />
                <Label htmlFor="data-saver" className="font-normal cursor-pointer">
                  Poupança de Dados - Mínimo
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
