import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Hook global para gerenciar presença do usuário
export const useGlobalUserPresence = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Marcar como online ao entrar
    const setOnline = async () => {
      await supabase.from('user_presence').upsert({
        user_id: user.id,
        is_online: true,
        last_seen: new Date().toISOString(),
      });
    };

    // Marcar como offline ao sair
    const setOffline = async () => {
      await supabase.from('user_presence').update({
        is_online: false,
        last_seen: new Date().toISOString(),
      }).eq('user_id', user.id);
    };

    setOnline();

    // Atualizar presença a cada 30 segundos
    const interval = setInterval(setOnline, 30000);

    // Eventos de visibilidade
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setOffline();
      } else {
        setOnline();
      }
    };

    // Evento de beforeunload
    const handleBeforeUnload = () => {
      setOffline();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      setOffline();
    };
  }, [user]);
};
