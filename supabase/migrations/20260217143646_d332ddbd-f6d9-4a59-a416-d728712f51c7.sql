
-- Verification subscriptions (user badge payments)
CREATE TABLE public.verification_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_type text NOT NULL DEFAULT 'basic', -- basic (500kz), premium (2000kz), elite (5000kz)
  amount integer NOT NULL, -- amount in kz
  status text NOT NULL DEFAULT 'pending', -- pending, paid, expired, cancelled
  payment_reference text, -- PliqPay reference number
  external_id text, -- PliqPay external transaction ID
  transaction_id text, -- PliqPay transaction ID
  paid_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.verification_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.verification_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions"
  ON public.verification_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
  ON public.verification_subscriptions FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Admins can update all subscriptions"
  ON public.verification_subscriptions FOR UPDATE
  USING (public.is_super_admin());

-- Monetization earnings
CREATE TABLE public.user_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_type text NOT NULL, -- views, likes, payment
  amount integer NOT NULL DEFAULT 0, -- in kz
  description text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.user_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own earnings"
  ON public.user_earnings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert earnings"
  ON public.user_earnings FOR INSERT
  WITH CHECK (true);

-- Withdrawal requests
CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL, -- min 200kz
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected, completed
  iban text,
  account_name text,
  phone text,
  processed_by uuid,
  processed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own withdrawals"
  ON public.withdrawal_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own withdrawals"
  ON public.withdrawal_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all withdrawals"
  ON public.withdrawal_requests FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Admins can update withdrawals"
  ON public.withdrawal_requests FOR UPDATE
  USING (public.is_super_admin());

-- Admin payment logs (money received from subscriptions)
CREATE TABLE public.admin_payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES public.verification_subscriptions(id),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  payment_reference text,
  status text NOT NULL DEFAULT 'received', -- received, withdrawn
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.admin_payment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view payment logs"
  ON public.admin_payment_logs FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "System can insert payment logs"
  ON public.admin_payment_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update payment logs"
  ON public.admin_payment_logs FOR UPDATE
  USING (public.is_super_admin());
