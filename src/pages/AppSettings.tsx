import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSettings } from '@/contexts/SettingsContext';
import { Moon, Sun, Wifi, WifiOff, Languages } from 'lucide-react';

export default function AppSettings() {
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container max-w-2xl mx-auto px-4 h-16 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Configurações do App</h1>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* Tema */}
        <div className="bg-card rounded-xl p-6 shadow-sm border space-y-4">
          <div className="flex items-center gap-3">
            {settings.theme === 'dark' ? (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Moon className="h-6 w-6 text-primary" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Sun className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <Label className="text-lg font-semibold">Aparência</Label>
              <p className="text-sm text-muted-foreground">Escolha o tema do aplicativo</p>
            </div>
          </div>
          
          <RadioGroup
            value={settings.theme}
            onValueChange={(value) => updateSettings({ theme: value as 'light' | 'dark' })}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="light" id="light" />
              <Label htmlFor="light" className="font-normal cursor-pointer flex-1">
                Claro
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="dark" id="dark" />
              <Label htmlFor="dark" className="font-normal cursor-pointer flex-1">
                Escuro
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Idioma */}
        <div className="bg-card rounded-xl p-6 shadow-sm border space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Languages className="h-6 w-6 text-primary" />
            </div>
            <div>
              <Label className="text-lg font-semibold">Idioma de Tradução</Label>
              <p className="text-sm text-muted-foreground">Para tradução de posts e comentários</p>
            </div>
          </div>
          
          <Select
            value={settings.language}
            onValueChange={(value) => updateSettings({ language: value })}
          >
            <SelectTrigger className="w-full h-12">
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
        <div className="bg-card rounded-xl p-6 shadow-sm border space-y-4">
          <div className="flex items-center gap-3">
            {settings.media_quality === 'data-saver' ? (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <WifiOff className="h-6 w-6 text-primary" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Wifi className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <Label className="text-lg font-semibold">Qualidade de Mídia</Label>
              <p className="text-sm text-muted-foreground">Economize dados móveis</p>
            </div>
          </div>
          
          <RadioGroup
            value={settings.media_quality}
            onValueChange={(value) => updateSettings({ media_quality: value as any })}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="high" id="high" />
              <Label htmlFor="high" className="font-normal cursor-pointer flex-1">
                <div className="font-medium">Alta</div>
                <div className="text-xs text-muted-foreground">Melhor qualidade</div>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="medium" id="medium" />
              <Label htmlFor="medium" className="font-normal cursor-pointer flex-1">
                <div className="font-medium">Média</div>
                <div className="text-xs text-muted-foreground">Equilibrado</div>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="low" id="low" />
              <Label htmlFor="low" className="font-normal cursor-pointer flex-1">
                <div className="font-medium">Baixa</div>
                <div className="text-xs text-muted-foreground">Poupa dados</div>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="data-saver" id="data-saver" />
              <Label htmlFor="data-saver" className="font-normal cursor-pointer flex-1">
                <div className="font-medium">Poupança de Dados</div>
                <div className="text-xs text-muted-foreground">Mínimo de dados</div>
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>
    </div>
  );
}
