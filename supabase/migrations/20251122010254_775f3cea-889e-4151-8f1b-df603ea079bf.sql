-- Criar tabela para anúncios patrocinados
CREATE TABLE IF NOT EXISTS public.sponsored_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  company_logo TEXT NOT NULL,
  content TEXT NOT NULL,
  link_url TEXT NOT NULL,
  link_title TEXT,
  link_description TEXT,
  link_image TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela para curtidas de anúncios
CREATE TABLE IF NOT EXISTS public.ad_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id UUID NOT NULL REFERENCES public.sponsored_ads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(ad_id, user_id)
);

-- Enable RLS
ALTER TABLE public.sponsored_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_likes ENABLE ROW LEVEL SECURITY;

-- Policies para anúncios (todos podem ver anúncios ativos)
CREATE POLICY "Anyone can view active ads"
  ON public.sponsored_ads
  FOR SELECT
  USING (is_active = true);

-- Policies para curtidas de anúncios
CREATE POLICY "Users can view ad likes"
  ON public.ad_likes
  FOR SELECT
  USING (true);

CREATE POLICY "Users can like ads"
  ON public.ad_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike ads"
  ON public.ad_likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Inserir anúncio da Nuvex Angola
INSERT INTO public.sponsored_ads (company_name, company_logo, content, link_url, link_title, link_description)
VALUES (
  'Nuvex Angola',
  '/src/assets/nuvex-logo.png',
  'A TECNOLOGIA QUE IMPULSIONA O SEU SUCESSO',
  'https://nuvexangola.com',
  'Nuvex Angola - Soluções Tecnológicas',
  'Descubra as melhores soluções em tecnologia para impulsionar o seu negócio em Angola.'
);