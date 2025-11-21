-- Adicionar coluna para armazenar o segredo único de 2FA para cada usuário
ALTER TABLE public.two_factor_auth 
ADD COLUMN IF NOT EXISTS secret TEXT;

-- Função para gerar um segredo único quando 2FA é ativado
CREATE OR REPLACE FUNCTION generate_2fa_secret()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret TEXT;
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; -- Base32 characters
  i INT;
BEGIN
  secret := '';
  FOR i IN 1..16 LOOP
    secret := secret || substr(chars, floor(random() * 32 + 1)::int, 1);
  END LOOP;
  RETURN secret;
END;
$$;