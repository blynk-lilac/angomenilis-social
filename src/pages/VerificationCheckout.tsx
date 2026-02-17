import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Star, Crown, Check, Copy, Clock, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const plans = [
  {
    id: "basic",
    name: "Básico",
    price: 500,
    icon: Shield,
    features: ["Selo de verificação azul", "Proteção de conta básica", "Prioridade no suporte"],
    color: "from-blue-500 to-blue-600",
  },
  {
    id: "premium",
    name: "Premium",
    price: 2000,
    icon: Star,
    popular: true,
    features: ["Selo de verificação azul", "Proteção avançada", "Monetização por visualizações", "Prioridade no feed", "Suporte prioritário"],
    color: "from-purple-500 to-purple-600",
  },
  {
    id: "elite",
    name: "Elite",
    price: 5000,
    icon: Crown,
    features: ["Selo de verificação azul", "Proteção máxima", "Monetização completa", "Monetização por curtidas", "Destaque nos resultados", "Badge exclusiva", "100+ funções premium"],
    color: "from-amber-500 to-orange-600",
  },
];

export default function VerificationCheckout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [existingSub, setExistingSub] = useState<any>(null);

  useEffect(() => {
    if (user) {
      checkExistingSubscription();
    }
  }, [user]);

  const checkExistingSubscription = async () => {
    const { data } = await supabase
      .from("verification_subscriptions")
      .select("*")
      .eq("user_id", user!.id)
      .in("status", ["pending", "paid"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      setExistingSub(data[0]);
      if (data[0].status === "pending") {
        setPaymentData({
          reference: data[0].payment_reference,
          amount: data[0].amount,
        });
        setSelectedPlan(data[0].plan_type);
      }
    }
  };

  const handleSelectPlan = async (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan || !user) return;

    setSelectedPlan(planId);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: { plan_type: planId, amount: plan.price },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setPaymentData({
        reference: data.subscription?.payment_reference || data.payment?.reference || data.payment?.data?.reference,
        amount: plan.price,
        subscriptionId: data.subscription?.id,
      });

      toast.success("Referência de pagamento gerada!");
    } catch (err: any) {
      console.error("Payment error:", err);
      toast.error(err.message || "Erro ao gerar pagamento");
      setSelectedPlan(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const handleCheckPayment = async () => {
    if (!existingSub && !paymentData?.subscriptionId) return;
    setChecking(true);

    try {
      const subId = existingSub?.id || paymentData.subscriptionId;
      const { data, error } = await supabase.functions.invoke("check-payment", {
        body: { subscription_id: subId },
      });

      if (error) throw error;

      if (data.status === "paid") {
        toast.success("Pagamento confirmado! Selo ativado!");
        navigate("/profile");
      } else {
        toast.info("Pagamento ainda pendente. Tente novamente em alguns minutos.");
      }
    } catch (err: any) {
      toast.error("Erro ao verificar pagamento");
    } finally {
      setChecking(false);
    }
  };

  if (existingSub?.status === "paid") {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="app-header">
          <div className="flex items-center gap-4 p-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold">Verificação</h1>
          </div>
        </div>
        <div className="p-6 flex flex-col items-center gap-4 mt-12">
          <div className="p-4 rounded-full bg-green-500/10">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold">Conta Verificada!</h2>
          <p className="text-muted-foreground text-center">O seu selo de verificação está ativo.</p>
          <Button onClick={() => navigate("/profile")} className="mt-4">Ver Perfil</Button>
        </div>
      </div>
    );
  }

  if (paymentData) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="app-header">
          <div className="flex items-center gap-4 p-4">
            <Button variant="ghost" size="icon" onClick={() => { setPaymentData(null); setSelectedPlan(null); }} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold">Confirmar Pagamento</h1>
          </div>
        </div>

        <div className="p-6 max-w-md mx-auto space-y-6">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">Pagamento pela referência</p>
            <div className="w-16 h-16 mx-auto bg-orange-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xs">express</span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-muted-foreground">Valor:</p>
            <p className="text-3xl font-bold">{paymentData.amount} <span className="text-lg">kz</span></p>
          </div>

          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Referência</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-lg">{paymentData.reference || "Gerando..."}</span>
                {paymentData.reference && (
                  <Button variant="ghost" size="sm" onClick={() => handleCopy(paymentData.reference, "Referência")} className="text-primary">
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Entidade</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-lg">01055</span>
                <Button variant="ghost" size="sm" onClick={() => handleCopy("01055", "Entidade")} className="text-primary">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>

          <div className="bg-muted rounded-xl p-4 text-sm text-muted-foreground space-y-2">
            <p>Abra o aplicativo Multicaixa Express, acesse a interface de pagamento por referência, insira a referência e a entidade acima para concluir o pagamento.</p>
            <p className="flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              Referência expira em 24 horas
            </p>
          </div>

          <Button
            onClick={handleCheckPayment}
            disabled={checking}
            className="w-full h-12 text-base font-semibold"
          >
            {checking ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
            Verificar Resultados
          </Button>
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
          <h1 className="text-lg font-bold">Selo de Verificação</h1>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Escolha o seu plano</h2>
          <p className="text-muted-foreground">Obtém o selo de verificação e desbloqueia funcionalidades premium</p>
        </div>

        <div className="space-y-4">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`p-5 cursor-pointer transition-all press-effect relative overflow-hidden ${
                selectedPlan === plan.id ? "ring-2 ring-primary" : "hover:shadow-lg"
              }`}
              onClick={() => !loading && handleSelectPlan(plan.id)}
            >
              {plan.popular && (
                <Badge className="absolute top-3 right-3 bg-primary">Popular</Badge>
              )}

              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${plan.color} text-white`}>
                  <plan.icon className="h-6 w-6" />
                </div>

                <div className="flex-1">
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <p className="text-2xl font-bold mt-1">
                    {plan.price.toLocaleString()} <span className="text-sm text-muted-foreground">kz/mês</span>
                  </p>

                  <ul className="mt-3 space-y-1.5">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {loading && selectedPlan === plan.id && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
            </Card>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Pagamento mensal por Multicaixa Express. O selo é removido automaticamente se o pagamento não for renovado.
        </p>
      </div>
    </div>
  );
}
