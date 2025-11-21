-- Tabela para armazenar códigos de verificação de telefone
CREATE TABLE IF NOT EXISTS public.phone_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca rápida
CREATE INDEX idx_phone_verification_phone ON public.phone_verification_codes(phone_number);
CREATE INDEX idx_phone_verification_expires ON public.phone_verification_codes(expires_at);

-- RLS policies
ALTER TABLE public.phone_verification_codes ENABLE ROW LEVEL SECURITY;

-- Permitir inserção durante cadastro (antes de autenticação)
CREATE POLICY "Allow insert for phone verification"
  ON public.phone_verification_codes
  FOR INSERT
  WITH CHECK (true);

-- Permitir leitura apenas do próprio número
CREATE POLICY "Allow select own phone verification"
  ON public.phone_verification_codes
  FOR SELECT
  USING (true);

-- Permitir atualização apenas do próprio número
CREATE POLICY "Allow update own phone verification"
  ON public.phone_verification_codes
  FOR UPDATE
  USING (true);

-- Função para limpar códigos expirados
CREATE OR REPLACE FUNCTION delete_expired_phone_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.phone_verification_codes
  WHERE expires_at < NOW() OR verified = true;
END;
$$;