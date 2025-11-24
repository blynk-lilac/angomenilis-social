import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserSettings {
  theme: 'light' | 'dark';
  language: string;
  media_quality: 'high' | 'medium' | 'low' | 'data-saver';
}

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  translateText: (text: string, targetLang?: string) => Promise<string>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: { theme: 'light', language: 'pt', media_quality: 'high' },
  updateSettings: async () => {},
  translateText: async (text) => text,
});

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'light',
    language: 'pt',
    media_quality: 'high',
  });

  useEffect(() => {
    if (!user) return;

    const loadSettings = async () => {
      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        const newSettings = {
          theme: data.theme as 'light' | 'dark',
          language: data.language,
          media_quality: data.media_quality as any,
        };
        setSettings(newSettings);
        
        // Aplicar tema imediatamente
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(data.theme || 'light');
      } else {
        // Criar configurações padrão
        const defaultSettings = {
          user_id: user.id,
          theme: 'light',
          language: 'pt',
          media_quality: 'high',
        };
        await supabase.from('user_settings').insert(defaultSettings);
        document.documentElement.classList.add('light');
      }
    };

    loadSettings();
  }, [user]);

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) return;

    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    // Aplicar tema imediatamente
    if (newSettings.theme) {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newSettings.theme);
    }

    // Salvar no banco de dados
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        theme: updatedSettings.theme,
        language: updatedSettings.language,
        media_quality: updatedSettings.media_quality,
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Error updating settings:', error);
    }
  };

  const translateText = async (text: string, targetLang?: string): Promise<string> => {
    const lang = targetLang || settings.language;
    
    try {
      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: { text, targetLanguage: lang },
      });

      if (error) throw error;
      return data.translatedText || text;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, translateText }}>
      {children}
    </SettingsContext.Provider>
  );
};
