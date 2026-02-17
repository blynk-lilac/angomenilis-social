import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, Eye, Heart, DollarSign, Wallet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Monetization() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<any[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [iban, setIban] = useState("");
  const [accountName, setAccountName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    const [earningsRes, profileRes] = await Promise.all([
      supabase.from("user_earnings").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("verified").eq("id", user!.id).single(),
    ]);

    setEarnings(earningsRes.data || []);
    setTotalEarnings((earningsRes.data || []).reduce((sum, e) => sum + e.amount, 0));
    setIsVerified(profileRes.data?.verified || false);
  };

  const handleWithdraw = async () => {
    const amount = parseInt(withdrawAmount);
    if (!amount || amount < 200) {
      toast.error("Valor mínimo de saque: 200 kz");
      return;
    }
    if (amount > totalEarnings) {
      toast.error("Saldo insuficiente");
      return;
    }
    if (!iban.trim() || !accountName.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("withdrawal_requests").insert({
        user_id: user!.id,
        amount,
        iban: iban.trim(),
        account_name: accountName.trim(),
        phone: phone.trim(),
      });

      if (error) throw error;
      toast.success("Pedido de saque enviado!");
      setWithdrawAmount("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao solicitar saque");
    } finally {
      setLoading(false);
    }
  };

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="app-header">
          <div className="flex items-center gap-4 p-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold">Monetização</h1>
          </div>
        </div>
        <div className="p-6 text-center space-y-4 mt-12">
          <DollarSign className="h-16 w-16 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-bold">Conta não verificada</h2>
          <p className="text-muted-foreground">Precisas ter o selo de verificação para monetizar o teu conteúdo.</p>
          <Button onClick={() => navigate("/verification-checkout")}>Obter Selo de Verificação</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="app-header">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Monetização</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Balance Card */}
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Saldo Disponível</p>
            <p className="text-4xl font-bold mt-1">{totalEarnings.toLocaleString()} <span className="text-lg">kz</span></p>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <Eye className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-sm font-bold">{earnings.filter(e => e.source_type === "views").length}</p>
            <p className="text-xs text-muted-foreground">Visualizações</p>
          </Card>
          <Card className="p-3 text-center">
            <Heart className="h-5 w-5 mx-auto text-red-500 mb-1" />
            <p className="text-sm font-bold">{earnings.filter(e => e.source_type === "likes").length}</p>
            <p className="text-xs text-muted-foreground">Curtidas</p>
          </Card>
          <Card className="p-3 text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-sm font-bold">{earnings.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </Card>
        </div>

        {/* Withdraw */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Solicitar Saque</h3>
          </div>
          <p className="text-xs text-muted-foreground">Mínimo: 200 kz</p>

          <Input placeholder="Valor (kz)" type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} />
          <Input placeholder="IBAN" value={iban} onChange={(e) => setIban(e.target.value)} />
          <Input placeholder="Nome do titular" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
          <Input placeholder="Telefone" value={phone} onChange={(e) => setPhone(e.target.value)} />

          <Button onClick={handleWithdraw} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Solicitar Saque
          </Button>
        </Card>

        {/* Earnings History */}
        <h3 className="font-semibold">Histórico de Ganhos</h3>
        {earnings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum ganho registrado ainda</p>
        ) : (
          earnings.slice(0, 20).map((e) => (
            <Card key={e.id} className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{e.description || e.source_type}</p>
                <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
              <p className="font-bold text-green-500">+{e.amount} kz</p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
