import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface ActiveProfile {
  id: string;
  name: string;
  type: 'user' | 'page';
  avatar_url?: string;
  username?: string;
}

interface ActiveProfileContextType {
  activeProfile: ActiveProfile | null;
  setActiveProfile: (profile: ActiveProfile) => void;
  loading: boolean;
}

const ActiveProfileContext = createContext<ActiveProfileContextType>({
  activeProfile: null,
  setActiveProfile: () => {},
  loading: true,
});

export const useActiveProfile = () => {
  const context = useContext(ActiveProfileContext);
  if (!context) {
    throw new Error('useActiveProfile must be used within ActiveProfileProvider');
  }
  return context;
};

export const ActiveProfileProvider = ({ children }: { children: ReactNode }) => {
  const [activeProfile, setActiveProfileState] = useState<ActiveProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const loadActiveProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      // Verificar se há um perfil ativo salvo no localStorage
      const savedProfileId = localStorage.getItem('active_profile_id');
      const savedProfileType = localStorage.getItem('active_profile_type');
      const savedProfileName = localStorage.getItem('active_profile_name');

      if (savedProfileId && savedProfileType === 'page') {
        // Carregar perfil de página associada
        const { data: pageProfile } = await supabase
          .from('page_profiles')
          .select('*')
          .eq('id', savedProfileId)
          .single();

        if (pageProfile) {
          setActiveProfileState({
            id: pageProfile.id,
            name: pageProfile.name,
            type: 'page',
            avatar_url: pageProfile.avatar_url || undefined,
          });
        } else {
          // Se não encontrar a página, usar perfil principal
          loadMainProfile();
        }
      } else {
        // Usar perfil principal
        loadMainProfile();
      }

      setLoading(false);
    };

    const loadMainProfile = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setActiveProfileState({
          id: user.id,
          name: profile.full_name || profile.username,
          type: 'user',
          avatar_url: profile.avatar_url || undefined,
          username: profile.username,
        });
        // Limpar localStorage
        localStorage.removeItem('active_profile_id');
        localStorage.removeItem('active_profile_type');
        localStorage.removeItem('active_profile_name');
      }
    };

    loadActiveProfile();
  }, [user]);

  const setActiveProfile = (profile: ActiveProfile) => {
    setActiveProfileState(profile);
    
    // Salvar no localStorage
    if (profile.type === 'page') {
      localStorage.setItem('active_profile_id', profile.id);
      localStorage.setItem('active_profile_type', profile.type);
      localStorage.setItem('active_profile_name', profile.name);
    } else {
      // Se for perfil principal, limpar localStorage
      localStorage.removeItem('active_profile_id');
      localStorage.removeItem('active_profile_type');
      localStorage.removeItem('active_profile_name');
    }
  };

  return (
    <ActiveProfileContext.Provider value={{ activeProfile, setActiveProfile, loading }}>
      {children}
    </ActiveProfileContext.Provider>
  );
};
