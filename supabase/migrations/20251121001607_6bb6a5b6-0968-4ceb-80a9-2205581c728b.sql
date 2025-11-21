-- Corrige o search_path da função auto_verify_special_accounts
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;