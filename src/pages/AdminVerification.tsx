import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, DollarSign, CheckCircle, Clock, XCircle, Wallet, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PaymentLog {
  id: string;
  user_id: string;
  amount: number;
  payment_reference: string;
  status: string;
  created_at: string;
  subscription_id: string;
}

interface Subscription {
  id: string;
  user_id: string;
  plan_type: string;
  amount: number;
  status: string;
  payment_reference: string;
  paid_at: string | null;
  created_at: string;
}

export default function AdminVerification() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentLog[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"payments" | "subscriptions" | "withdraw">("payments");
  const [totalReceived, setTotalReceived] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [paymentsRes, subsRes] = await Promise.all([
        supabase.from("admin_payment_logs").select("*").order("created_at", { ascending: false }),
        supabase.from("verification_subscriptions").select("*").order("created_at", { ascending: false }),
      ]);

      const paymentData = paymentsRes.data || [];
      const subsData = subsRes.data || [];
      setPayments(paymentData);
      setSubscriptions(subsData);

      // Calculate total
      const total = paymentData.filter(p => p.status === "received").reduce((sum, p) => sum + p.amount, 0);
      setTotalReceived(total);

      // Fetch profiles
      const userIds = [...new Set([...paymentData.map(p => p.user_id), ...subsData.map(s => s.user_id)])];
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, first_name, full_name, username, avatar_url, email")
          .in("id", userIds);

        const profileMap: Record<string, any> = {};
        (profilesData || []).forEach(p => { profileMap[p.id] = p; });
        setProfiles(profileMap);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
      case "received":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/30">Pago</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">Pendente</Badge>;
      default:
        return <Badge variant="destructive">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="app-header">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Pagamentos Verificação</h1>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <Card className="p-4 text-center">
          <DollarSign className="h-6 w-6 mx-auto text-green-500 mb-1" />
          <p className="text-2xl font-bold">{totalReceived.toLocaleString()} kz</p>
          <p className="text-xs text-muted-foreground">Total Recebido</p>
        </Card>
        <Card className="p-4 text-center">
          <Users className="h-6 w-6 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold">{subscriptions.filter(s => s.status === "paid").length}</p>
          <p className="text-xs text-muted-foreground">Assinantes Ativos</p>
        </Card>
      </div>

      {/* Admin Withdrawal Info */}
      <Card className="mx-4 p-4 bg-primary/5 border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Conta de Saque</h3>
        </div>
        <div className="text-sm space-y-1 text-muted-foreground">
          <p>IBAN: <span className="font-mono text-foreground">AO06042000000000076790387</span></p>
          <p>Titular: <span className="text-foreground">ISAAC CUNHA PINTO</span></p>
          <p>Telefone: <span className="text-foreground">943443400</span></p>
          <p>KwikPay</p>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-border mt-4">
        {(["payments", "subscriptions"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
            }`}
          >
            {t === "payments" ? "Pagamentos" : "Assinaturas"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : tab === "payments" ? (
          payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum pagamento registrado</div>
          ) : (
            payments.map((p) => {
              const profile = profiles[p.user_id];
              return (
                <Card key={p.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{profile?.full_name || profile?.first_name || "Usuário"}</p>
                      <p className="text-sm text-muted-foreground">@{profile?.username}</p>
                      <p className="text-xs text-muted-foreground mt-1">Ref: {p.payment_reference}</p>
                      <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{p.amount} kz</p>
                      {getStatusBadge(p.status)}
                    </div>
                  </div>
                </Card>
              );
            })
          )
        ) : (
          subscriptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma assinatura</div>
          ) : (
            subscriptions.map((s) => {
              const profile = profiles[s.user_id];
              return (
                <Card key={s.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{profile?.full_name || profile?.first_name || "Usuário"}</p>
                      <p className="text-sm text-muted-foreground">@{profile?.username} - {s.plan_type}</p>
                      <p className="text-xs text-muted-foreground">Ref: {s.payment_reference || "N/A"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{s.amount} kz</p>
                      {getStatusBadge(s.status)}
                    </div>
                  </div>
                </Card>
              );
            })
          )
        )}
      </div>
    </div>
  );
}
