import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Star, Crown, Check, Copy, Clock, CheckCircle, Loader2, RefreshCw } from "lucide-react";
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

const REFERENCE_EXPIRY_MINUTES = 15;

export default function VerificationCheckout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [existingSub, setExistingSub] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [checkCount, setCheckCount] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) checkExistingSubscription();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [user]);

  // Countdown timer
  useEffect(() => {
    if (!paymentData?.createdAt) return;
    const expiresAt = new Date(paymentData.createdAt).getTime() + REFERENCE_EXPIRY_MINUTES * 60 * 1000;
    
    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        toast.error("Referência expirada. Gere uma nova.");
        setPaymentData(null);
        setSelectedPlan(null);
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paymentData?.createdAt]);

  // Auto-poll payment status every 15s
  useEffect(() => {
    if (!paymentData?.subscriptionId && !existingSub?.id) return;
    pollRef.current = setInterval(() => {
      handleCheckPayment(true);
    }, 15000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [paymentData?.subscriptionId, existingSub?.id]);

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
          entity: '01055',
          amount: data[0].amount,
          subscriptionId: data[0].id,
          createdAt: data[0].created_at,
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

      const ref = data.reference || data.subscription?.payment_reference || data.payment?.reference || data.payment?.data?.reference;
      const entity = data.entity || data.payment?.entity || data.payment?.data?.entity || '01055';

      setPaymentData({
        reference: ref,
        entity: entity,
        amount: plan.price,
        subscriptionId: data.subscription?.id,
        createdAt: new Date().toISOString(),
      });

      toast.success("Referência gerada com sucesso!");
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

  const handleCheckPayment = async (silent = false) => {
    if (!existingSub && !paymentData?.subscriptionId) return;
    if (!silent) setChecking(true);

    try {
      const subId = existingSub?.id || paymentData.subscriptionId;
      const { data, error } = await supabase.functions.invoke("check-payment", {
        body: { subscription_id: subId },
      });

      if (error) throw error;
      setCheckCount(prev => prev + 1);

      if (data.status === "paid") {
        if (pollRef.current) clearInterval(pollRef.current);
        toast.success("Pagamento confirmado! Selo ativado!");
        navigate("/profile");
      } else if (!silent) {
        toast.info("Pagamento ainda pendente. Monitorando automaticamente...");
      }
    } catch (err: any) {
      if (!silent) toast.error("Erro ao verificar pagamento");
    } finally {
      if (!silent) setChecking(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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

        <div className="p-4 max-w-md mx-auto space-y-5">
          {/* Method Selection - Like screenshot */}
          <Card className="p-4">
            <p className="text-sm font-semibold mb-3">Método de Pagamento</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="border rounded-xl p-4 flex flex-col items-center gap-2 opacity-50">
                <div className="h-12 w-12 rounded-lg bg-orange-500 flex items-center justify-center">
                  <span className="text-white font-bold text-[8px]">express</span>
                </div>
                <span className="text-xs font-medium">Express</span>
              </div>
              <div className="border-2 border-orange-500 rounded-xl p-4 flex flex-col items-center gap-2 relative">
                <div className="absolute top-2 right-2">
                  <CheckCircle className="h-5 w-5 text-orange-500 fill-orange-500" />
                </div>
                <div className="h-12 w-12 rounded-lg bg-gray-900 flex items-center justify-center">
                  <span className="text-white font-bold text-[8px]">multicaixa</span>
                </div>
                <span className="text-xs font-medium">Referência</span>
              </div>
            </div>
          </Card>

          {/* Monitoring Status */}
          <Card className="p-4 border-2 border-orange-400/50 bg-orange-50/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <span className="font-bold text-orange-500">Aguardando Pagamento</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
                <span>Monitorando</span>
              </div>
            </div>

            <div className="bg-muted/50 rounded-xl p-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <RefreshCw className="h-5 w-5 text-orange-500" />
                  </div>
                  {checkCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center font-bold">
                      {checkCount}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Buscando confirmação do pagamento</p>
                  <p className="text-xs text-muted-foreground">A PlinqPay notificará assim que o pagamento for processado</p>
                </div>
                <div className="flex gap-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>

            {/* Entity / Reference / Value Cards */}
            <div className="space-y-3">
              <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Entidade</p>
                  <p className="text-2xl font-bold mt-0.5">{paymentData.entity || '01055'}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => handleCopy(paymentData.entity || '01055', 'Entidade')}>
                  <Copy className="h-5 w-5 text-muted-foreground" />
                </Button>
              </div>

              <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Referência</p>
                  <p className="text-2xl font-bold mt-0.5">{paymentData.reference || "Gerando..."}</p>
                </div>
                {paymentData.reference && (
                  <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => handleCopy(paymentData.reference, 'Referência')}>
                    <Copy className="h-5 w-5 text-muted-foreground" />
                  </Button>
                )}
              </div>

              <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Valor</p>
                  <p className="text-2xl font-bold text-orange-500 mt-0.5">{paymentData.amount} AOA</p>
                </div>
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => handleCopy(`${paymentData.amount}`, 'Valor')}>
                  <Copy className="h-5 w-5 text-muted-foreground" />
                </Button>
              </div>
            </div>

            {/* Important Notice */}
            <div className="mt-4 bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 text-center">
              <p className="text-sm">
                <span className="font-bold text-orange-500">Importante:</span>{" "}
                <span className="text-muted-foreground">
                  Efetue o pagamento no seu banco ou ATM.
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Esta página atualizará automaticamente quando receber a confirmação.
              </p>
            </div>
          </Card>

          {/* Timer */}
          <div className="flex items-center justify-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-orange-500" />
            <span className="text-muted-foreground">Expira em</span>
            <span className={`font-bold ${timeLeft < 120 ? 'text-red-500' : 'text-orange-500'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>

          {/* Manual Check Button */}
          <Button
            onClick={() => handleCheckPayment(false)}
            disabled={checking}
            variant="outline"
            className="w-full h-12 text-base font-semibold border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
          >
            {checking ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <RefreshCw className="h-5 w-5 mr-2" />}
            Verificar Pagamento
          </Button>

          {/* Security Badge */}
          <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            ✅ Pagamentos seguros sem roubos
          </p>
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
