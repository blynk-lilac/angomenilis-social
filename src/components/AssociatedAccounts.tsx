import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Plus, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface PageProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  email: string | null;
  is_authenticated: boolean;
  auth_user_id: string | null;
}

interface AssociatedAccountsProps {
  userId: string;
}

export default function AssociatedAccounts({ userId }: AssociatedAccountsProps) {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<PageProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchAccounts();
    }
  }, [userId]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("page_profiles")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchProfile = async (account: PageProfile) => {
    try {
      // Salvar o ID da conta associada no localStorage para manter o contexto
      localStorage.setItem("active_profile_id", account.id);
      localStorage.setItem("active_profile_name", account.name);
      localStorage.setItem("active_profile_type", "page");
      
      toast.success(`Trocado para ${account.name}`);
      
      // Recarregar a página para aplicar o novo perfil
      window.location.reload();
    } catch (error: any) {
      console.error("Switch profile error:", error);
      toast.error("Erro ao trocar de perfil");
    }
  };

  if (loading) return null;
  if (accounts.length === 0) return null;

  return (
    <div className="mt-4 p-4 border border-border rounded-xl bg-muted/30">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Contas Associadas</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/create-page-profile")}
          className="h-8 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Adicionar
        </Button>
      </div>
      
      <div className="space-y-2">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={account.avatar_url || ""} />
              <AvatarFallback>{account.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{account.name}</p>
              {account.is_authenticated && account.email && (
                <p className="text-xs text-muted-foreground truncate">
                  {account.email}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSwitchProfile(account)}
              className="h-8 px-3 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <LogIn className="h-4 w-4 mr-1" />
              Trocar
            </Button>
          </div>
        ))}
      </div>
      
      <p className="text-xs text-muted-foreground mt-3 px-2">
        💡 Clica em "Trocar" para mudar para esta conta.
      </p>
    </div>
  );
}
