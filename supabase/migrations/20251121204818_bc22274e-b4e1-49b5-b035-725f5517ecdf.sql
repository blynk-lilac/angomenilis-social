-- Criar bucket para músicas customizadas (upload do usuário)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'music-uploads',
  'music-uploads',
  true,
  10485760, -- 10MB max
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao bucket de músicas
CREATE POLICY "Músicas públicas são visíveis para todos"
ON storage.objects FOR SELECT
USING (bucket_id = 'music-uploads');

CREATE POLICY "Usuários autenticados podem fazer upload de músicas"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'music-uploads' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Usuários podem deletar suas próprias músicas"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'music-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Adicionar campo para URL de música customizada na tabela stories
ALTER TABLE public.stories
ADD COLUMN IF NOT EXISTS custom_music_url TEXT;