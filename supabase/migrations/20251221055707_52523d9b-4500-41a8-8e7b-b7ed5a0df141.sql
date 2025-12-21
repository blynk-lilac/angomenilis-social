-- Tabela de dispositivos do utilizador
CREATE TABLE public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_name TEXT,
  device_type TEXT DEFAULT 'unknown',
  browser TEXT,
  os TEXT,
  ip_address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  city TEXT,
  country TEXT,
  is_trusted BOOLEAN DEFAULT false,
  is_current BOOLEAN DEFAULT false,
  last_active TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de sessões ativas
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_id UUID REFERENCES public.user_devices(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de histórico de acessos
CREATE TABLE public.access_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_id UUID REFERENCES public.user_devices(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  ip_address TEXT,
  city TEXT,
  country TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  risk_level TEXT DEFAULT 'low',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de configurações de segurança
CREATE TABLE public.security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  max_devices INTEGER DEFAULT 5,
  kick_old_sessions BOOLEAN DEFAULT false,
  account_at_risk BOOLEAN DEFAULT false,
  require_confirmation_email BOOLEAN DEFAULT true,
  require_confirmation_password BOOLEAN DEFAULT true,
  require_confirmation_ads BOOLEAN DEFAULT true,
  two_factor_enabled BOOLEAN DEFAULT false,
  trusted_devices_only BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de ações sensíveis pendentes
CREATE TABLE public.sensitive_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  action_data JSONB,
  confirmation_code TEXT,
  confirmed BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de alertas de segurança
CREATE TABLE public.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  device_id UUID REFERENCES public.user_devices(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensitive_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_devices
CREATE POLICY "Users can view own devices" ON public.user_devices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices" ON public.user_devices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices" ON public.user_devices
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices" ON public.user_devices
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_sessions
CREATE POLICY "Users can view own sessions" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON public.user_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for access_history
CREATE POLICY "Users can view own access history" ON public.access_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own access history" ON public.access_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for security_settings
CREATE POLICY "Users can view own security settings" ON public.security_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own security settings" ON public.security_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own security settings" ON public.security_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for sensitive_actions
CREATE POLICY "Users can view own sensitive actions" ON public.sensitive_actions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sensitive actions" ON public.sensitive_actions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sensitive actions" ON public.sensitive_actions
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for security_alerts
CREATE POLICY "Users can view own security alerts" ON public.security_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own security alerts" ON public.security_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own security alerts" ON public.security_alerts
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to update security_settings updated_at
CREATE OR REPLACE FUNCTION public.update_security_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_security_settings_updated_at
  BEFORE UPDATE ON public.security_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_security_settings_updated_at();

-- Enable realtime for security alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.security_alerts;