-- Criar tabela de hashtags
CREATE TABLE IF NOT EXISTS public.hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  post_count INTEGER DEFAULT 0
);

-- Criar tabela de relação entre posts e hashtags
CREATE TABLE IF NOT EXISTS public.post_hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  hashtag_id UUID NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, hashtag_id)
);

-- Criar tabela de seguidores de hashtags
CREATE TABLE IF NOT EXISTS public.hashtag_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hashtag_id UUID NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  followed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(hashtag_id, user_id)
);

-- Criar tabela de menções em posts
CREATE TABLE IF NOT EXISTS public.post_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, mentioned_user_id)
);

-- Criar tabela de menções em comentários
CREATE TABLE IF NOT EXISTS public.comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(comment_id, mentioned_user_id)
);

-- RLS para hashtags
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Qualquer um pode ver hashtags" ON public.hashtags FOR SELECT USING (true);
CREATE POLICY "Sistema pode criar hashtags" ON public.hashtags FOR INSERT WITH CHECK (true);
CREATE POLICY "Sistema pode atualizar hashtags" ON public.hashtags FOR UPDATE USING (true);

-- RLS para post_hashtags
ALTER TABLE public.post_hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Qualquer um pode ver post_hashtags" ON public.post_hashtags FOR SELECT USING (true);
CREATE POLICY "Usuários podem criar post_hashtags" ON public.post_hashtags FOR INSERT WITH CHECK (true);
CREATE POLICY "Usuários podem deletar post_hashtags" ON public.post_hashtags FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.posts WHERE id = post_hashtags.post_id AND user_id = auth.uid())
);

-- RLS para hashtag_followers
ALTER TABLE public.hashtag_followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Qualquer um pode ver seguidores" ON public.hashtag_followers FOR SELECT USING (true);
CREATE POLICY "Usuários podem seguir hashtags" ON public.hashtag_followers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem deixar de seguir" ON public.hashtag_followers FOR DELETE USING (auth.uid() = user_id);

-- RLS para post_mentions
ALTER TABLE public.post_mentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Qualquer um pode ver menções" ON public.post_mentions FOR SELECT USING (true);
CREATE POLICY "Usuários podem criar menções" ON public.post_mentions FOR INSERT WITH CHECK (true);
CREATE POLICY "Donos podem deletar menções" ON public.post_mentions FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.posts WHERE id = post_mentions.post_id AND user_id = auth.uid())
);

-- RLS para comment_mentions
ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Qualquer um pode ver menções" ON public.comment_mentions FOR SELECT USING (true);
CREATE POLICY "Usuários podem criar menções" ON public.comment_mentions FOR INSERT WITH CHECK (true);
CREATE POLICY "Donos podem deletar menções" ON public.comment_mentions FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.comments WHERE id = comment_mentions.comment_id AND user_id = auth.uid())
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_hashtags_name ON public.hashtags(name);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_post_id ON public.post_hashtags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag_id ON public.post_hashtags(hashtag_id);
CREATE INDEX IF NOT EXISTS idx_hashtag_followers_hashtag_id ON public.hashtag_followers(hashtag_id);
CREATE INDEX IF NOT EXISTS idx_hashtag_followers_user_id ON public.hashtag_followers(user_id);
CREATE INDEX IF NOT EXISTS idx_post_mentions_mentioned_user ON public.post_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_mentioned_user ON public.comment_mentions(mentioned_user_id);