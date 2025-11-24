import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Plus, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<PageProfile | null>(null);
  const [password, setPassword] = useState("");

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

  const handleLoginClick = (account: PageProfile) => {
    if (account.is_authenticated && account.email) {
      setSelectedAccount(account);
      setLoginDialogOpen(true);
    }
  };

  const handleLogin = async () => {
    if (!selectedAccount || !password) {
      toast.error("Por favor, insira a senha");
      return;
    }

    try {
      if (!selectedAccount.email) {
        toast.error("Esta conta não tem email configurado");
        return;
      }

      // Fazer login com o email e senha da conta associada
      const { error } = await supabase.auth.signInWithPassword({
        email: selectedAccount.email,
        password: password,
      });

      if (error) {
        console.error("Login error:", error);
        toast.error("Senha incorreta ou erro ao fazer login");
        return;
      }

      toast.success(`Conectado como ${selectedAccount.name}`);
      setLoginDialogOpen(false);
      setPassword("");
      navigate("/feed");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error("Erro ao fazer login");
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
            {account.is_authenticated && account.email ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleLoginClick(account)}
                className="h-8 px-3 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <LogIn className="h-4 w-4 mr-1" />
                Entrar
              </Button>
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>
      
      {accounts.some(a => a.is_authenticated) && (
        <p className="text-xs text-muted-foreground mt-3 px-2">
          💡 Clica em "Entrar" para mudar para esta conta. Usa a senha desta conta associada.
        </p>
      )}

      <AlertDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Iniciar sessão como {selectedAccount?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              Insira a senha desta conta ({selectedAccount?.email}) para entrar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleLogin();
                }
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPassword("")}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogin}>Entrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
