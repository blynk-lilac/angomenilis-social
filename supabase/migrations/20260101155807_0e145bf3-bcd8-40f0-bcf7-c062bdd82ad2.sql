-- Add username_last_changed column to track when username was last updated
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username_last_changed TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create unique index on username to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles (LOWER(username));

-- Create function to check username availability and enforce change limit
CREATE OR REPLACE FUNCTION public.check_username_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If username is being changed
  IF OLD.username IS DISTINCT FROM NEW.username THEN
    -- Check if username was changed in the last 10 days
    IF OLD.username_last_changed IS NOT NULL 
       AND OLD.username_last_changed > NOW() - INTERVAL '10 days' THEN
      RAISE EXCEPTION 'Só podes alterar o nome de usuário uma vez a cada 10 dias';
    END IF;
    
    -- Check if new username already exists (case insensitive)
    IF EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE LOWER(username) = LOWER(NEW.username) 
      AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Este nome de usuário já está em uso';
    END IF;
    
    -- Check if username belongs to a verified user
    IF EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE LOWER(username) = LOWER(NEW.username) 
      AND verified = true
      AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Este nome de usuário pertence a uma conta verificada e não pode ser usado';
    END IF;
    
    -- Update the last changed timestamp
    NEW.username_last_changed := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for username validation
DROP TRIGGER IF EXISTS check_username_change_trigger ON public.profiles;
CREATE TRIGGER check_username_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_username_change();

-- Also validate on insert
CREATE OR REPLACE FUNCTION public.check_username_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if username already exists (case insensitive)
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE LOWER(username) = LOWER(NEW.username)
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Este nome de usuário já está em uso';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS check_username_insert_trigger ON public.profiles;
CREATE TRIGGER check_username_insert_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_username_insert();