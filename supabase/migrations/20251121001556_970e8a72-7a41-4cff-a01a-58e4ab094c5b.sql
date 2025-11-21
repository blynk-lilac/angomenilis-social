-- Função para verificar automaticamente contas especiais
CREATE OR REPLACE FUNCTION auto_verify_special_accounts()
RETURNS TRIGGER AS $$
BEGIN
  -- Verifica se o email é da conta especial
  IF NEW.email = 'isaacmuaco582@gmail.com' THEN
    -- Atualiza o perfil para verificado com badge azul
    UPDATE public.profiles
    SET verified = true, badge_type = 'blue'
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cria o trigger para executar após a criação do perfil
DROP TRIGGER IF EXISTS auto_verify_special_accounts_trigger ON public.profiles;
CREATE TRIGGER auto_verify_special_accounts_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_verify_special_accounts();

-- Verifica e atualiza contas existentes
UPDATE public.profiles
SET verified = true, badge_type = 'blue'
WHERE email = 'isaacmuaco582@gmail.com' AND (verified IS NULL OR verified = false);