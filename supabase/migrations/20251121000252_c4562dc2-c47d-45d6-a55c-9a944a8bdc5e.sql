-- ============================================
-- PARTE 1: Criar função is_super_admin necessária
-- ============================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
$$;

-- ============================================
-- PARTE 2: Adicionar colunas faltantes em group_members
-- ============================================
ALTER TABLE public.group_members
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- ============================================
-- PARTE 3: Adicionar colunas de mídia em group_messages
-- ============================================
ALTER TABLE public.group_messages
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS read_by UUID[] DEFAULT ARRAY[]::UUID[];

-- ============================================
-- PARTE 4: Função para verificar admin de grupo
-- ============================================
CREATE OR REPLACE FUNCTION public.is_group_admin(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM groups
    WHERE id = _group_id AND created_by = _user_id
  ) OR EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = _group_id 
    AND user_id = _user_id 
    AND is_admin = true
  );
$$;

-- ============================================
-- PARTE 5: Posts temporários (banners)
-- ============================================
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_posts_expires_at ON public.posts(expires_at)
WHERE expires_at IS NOT NULL;

-- ============================================
-- PARTE 6: Stream Viewers
-- ============================================
CREATE TABLE IF NOT EXISTS public.stream_viewers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(stream_id, user_id)
);

ALTER TABLE public.stream_viewers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Viewers visíveis para usuários autenticados" ON stream_viewers;
CREATE POLICY "Viewers visíveis para usuários autenticados"
ON stream_viewers FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Usuários podem se juntar a streams" ON stream_viewers;
CREATE POLICY "Usuários podem se juntar a streams"
ON stream_viewers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem sair de streams" ON stream_viewers;
CREATE POLICY "Usuários podem sair de streams"
ON stream_viewers FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Função para atualizar contagem de viewers
CREATE OR REPLACE FUNCTION update_viewer_count()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE live_streams
    SET viewer_count = viewer_count + 1
    WHERE id = NEW.stream_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE live_streams
    SET viewer_count = viewer_count - 1
    WHERE id = OLD.stream_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_viewer_count_trigger ON stream_viewers;
CREATE TRIGGER update_viewer_count_trigger
AFTER INSERT OR DELETE ON stream_viewers
FOR EACH ROW
EXECUTE FUNCTION update_viewer_count();

-- ============================================
-- PARTE 7: Políticas de Storage para áudios
-- ============================================
DROP POLICY IF EXISTS "Usuários podem fazer upload de áudios" ON storage.objects;
CREATE POLICY "Usuários podem fazer upload de áudios"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'voice-messages'
);

DROP POLICY IF EXISTS "Áudios são publicamente acessíveis" ON storage.objects;
CREATE POLICY "Áudios são publicamente acessíveis"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'voice-messages'
);

-- ============================================
-- PARTE 8: Melhorias de Segurança - Política para likes de boost
-- ============================================
DROP POLICY IF EXISTS "Super admins podem criar likes para boost" ON post_likes;
CREATE POLICY "Super admins podem criar likes para boost"
ON post_likes FOR INSERT
TO authenticated
WITH CHECK (is_super_admin());

-- ============================================
-- PARTE 9: Políticas de Segurança para blocked_accounts
-- ============================================
DROP POLICY IF EXISTS "Bloqueios visíveis só para admins" ON public.blocked_accounts;
DROP POLICY IF EXISTS "Users can view blocked accounts" ON public.blocked_accounts;
CREATE POLICY "Bloqueios visíveis só para admins"
ON public.blocked_accounts
FOR SELECT
TO authenticated
USING (is_super_admin());

-- ============================================
-- PARTE 10: Atualizar política de group_messages para segurança
-- ============================================
DROP POLICY IF EXISTS "Membros podem atualizar suas próprias mensagens" ON public.group_messages;
DROP POLICY IF EXISTS "Group members can send messages" ON public.group_messages;
CREATE POLICY "Membros podem atualizar suas próprias mensagens"
ON public.group_messages
FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- ============================================
-- PARTE 11: Funções para deletar conteúdo expirado
-- ============================================
CREATE OR REPLACE FUNCTION public.delete_expired_posts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM posts
  WHERE expires_at IS NOT NULL 
  AND expires_at < NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_expired_stories()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  
SET search_path = public
AS $$
BEGIN
  DELETE FROM stories
  WHERE expires_at < NOW();
END;
$$;

-- ============================================
-- PARTE 12: Habilitar realtime
-- ============================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE stream_viewers;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;