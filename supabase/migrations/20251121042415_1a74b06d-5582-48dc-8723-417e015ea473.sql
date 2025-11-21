-- Criar tabela para armazenar configurações de autenticação de dois fatores
CREATE TABLE IF NOT EXISTS public.two_factor_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Habilitar RLS
ALTER TABLE public.two_factor_auth ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver suas próprias configurações 2FA"
  ON public.two_factor_auth
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias configurações 2FA"
  ON public.two_factor_auth
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias configurações 2FA"
  ON public.two_factor_auth
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Criar tabela para armazenar códigos 2FA temporários
CREATE TABLE IF NOT EXISTS public.two_factor_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.two_factor_codes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para códigos 2FA
CREATE POLICY "Sistema pode gerenciar códigos 2FA"
  ON public.two_factor_codes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_two_factor_auth_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_two_factor_auth_timestamp
  BEFORE UPDATE ON public.two_factor_auth
  FOR EACH ROW
  EXECUTE FUNCTION update_two_factor_auth_updated_at();

-- Função para limpar códigos expirados
CREATE OR REPLACE FUNCTION delete_expired_two_factor_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.two_factor_codes
  WHERE expires_at < now() OR used = true;
END;
$$;