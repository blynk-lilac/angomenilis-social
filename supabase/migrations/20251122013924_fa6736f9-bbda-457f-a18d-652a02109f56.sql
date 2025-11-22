-- Adicionar campos de autenticação nas page_profiles
ALTER TABLE public.page_profiles
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_authenticated BOOLEAN DEFAULT false;

-- Adicionar índice
CREATE INDEX IF NOT EXISTS idx_page_profiles_auth_user ON public.page_profiles(auth_user_id);

-- Atualizar RLS para permitir ver perfis autenticados
DROP POLICY IF EXISTS "Users can view their own page profiles" ON public.page_profiles;
CREATE POLICY "Users can view their own page profiles"
  ON public.page_profiles FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = auth_user_id);