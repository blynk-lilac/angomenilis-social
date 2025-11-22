-- Criar tabela para perfis/páginas associadas
CREATE TABLE IF NOT EXISTS public.page_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  page_type TEXT DEFAULT 'page' CHECK (page_type IN ('page', 'profile')),
  email TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_page_profiles_user_id ON public.page_profiles(user_id);

-- Habilitar RLS
ALTER TABLE public.page_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para page_profiles
CREATE POLICY "Users can view their own page profiles"
  ON public.page_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own page profiles"
  ON public.page_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own page profiles"
  ON public.page_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own page profiles"
  ON public.page_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Criar tabela para convites de canal
CREATE TABLE IF NOT EXISTS public.channel_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL,
  invited_user_id UUID NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_channel_invites_channel ON public.channel_invites(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_invites_invited ON public.channel_invites(invited_user_id);

-- Habilitar RLS
ALTER TABLE public.channel_invites ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para channel_invites
CREATE POLICY "Users can view their invites"
  ON public.channel_invites FOR SELECT
  USING (auth.uid() = invited_user_id OR auth.uid() = inviter_id);

CREATE POLICY "Channel admins can create invites"
  ON public.channel_invites FOR INSERT
  WITH CHECK (is_channel_admin(auth.uid(), channel_id));

CREATE POLICY "Invited users can update their invites"
  ON public.channel_invites FOR UPDATE
  USING (auth.uid() = invited_user_id);

-- Adicionar bucket para avatares de páginas se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('page-avatars', 'page-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para page-avatars
CREATE POLICY "Users can upload their page avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'page-avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their page avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'page-avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Page avatars are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'page-avatars');

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_page_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_page_profiles_updated_at
  BEFORE UPDATE ON public.page_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_page_profiles_updated_at();