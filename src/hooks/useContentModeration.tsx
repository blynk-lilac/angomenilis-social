import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const useContentModeration = () => {
  const moderateContent = async (content: string, type: 'post' | 'comment' | 'message') => {
    try {
      const { data, error } = await supabase.functions.invoke('moderate-content', {
        body: { content, type }
      });

      if (error) throw error;

      if (data.isViolation) {
        // Se for violação crítica, bloquear usuário
        if (data.severity === 'critical' || data.severity === 'high') {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            await supabase
              .from('blocked_accounts')
              .insert({
                user_id: user.id,
                reason: `Violação das diretrizes: ${data.reason}`,
                blocked_by: null
              });

            toast.error("Sua conta foi bloqueada por violar as diretrizes da comunidade.");
            
            // Redirecionar para página de bloqueio
            window.location.href = '/blocked';
            return false;
          }
        } else {
          toast.error(`Conteúdo não permitido: ${data.reason}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Erro na moderação:', error);
      return true; // Em caso de erro, permitir (fail-safe)
    }
  };

  return { moderateContent };
};
