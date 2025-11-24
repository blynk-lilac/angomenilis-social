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
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading settings:', error);
          return;
        }

        if (data) {
          const newSettings = {
            theme: (data.theme || 'light') as 'light' | 'dark',
            language: data.language || 'pt',
            media_quality: (data.media_quality || 'high') as any,
          };
          setSettings(newSettings);
          
          // Aplicar tema imediatamente ao DOM
          document.documentElement.classList.remove('light', 'dark');
          document.documentElement.classList.add(newSettings.theme);
          
          console.log('Settings loaded:', newSettings);
        } else {
          // Criar configurações padrão se não existirem
          const defaultSettings = {
            user_id: user.id,
            theme: 'light',
            language: 'pt',
            media_quality: 'high',
          };
          
          const { error: insertError } = await supabase
            .from('user_settings')
            .insert(defaultSettings);
            
          if (insertError) {
            console.error('Error creating default settings:', insertError);
          } else {
            setSettings({
              theme: 'light',
              language: 'pt',
              media_quality: 'high',
            });
            document.documentElement.classList.add('light');
          }
        }
      } catch (err) {
        console.error('Unexpected error loading settings:', err);
      }
    };

    loadSettings();
  }, [user]);

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) return;

    const updatedSettings = { ...settings, ...newSettings };
    
    // Aplicar tema imediatamente ao DOM
    if (newSettings.theme) {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newSettings.theme);
    }
    
    // Atualizar estado local
    setSettings(updatedSettings);

    try {
      // Salvar no banco de dados
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          theme: updatedSettings.theme,
          language: updatedSettings.language,
          media_quality: updatedSettings.media_quality,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error updating settings:', error);
      } else {
        console.log('Settings updated successfully:', updatedSettings);
      }
    } catch (err) {
      console.error('Unexpected error updating settings:', err);
    }
  };

  const translateText = async (text: string, targetLang?: string): Promise<string> => {
    const lang = targetLang || settings.language;
    
    try {
      console.log('Translating text to:', lang);
      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: { text, targetLanguage: lang },
      });

      if (error) {
        console.error('Translation error:', error);
        throw error;
      }
      
      console.log('Translation result:', data);
      return data?.translatedText || text;
    } catch (error) {
      console.error('Translation failed:', error);
      return text;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, translateText }}>
      {children}
    </SettingsContext.Provider>
  );
};
