-- Criar bucket para músicas customizadas
INSERT INTO storage.buckets (id, name, public)
VALUES ('music-uploads', 'music-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies para música
CREATE POLICY "Usuários podem fazer upload de música"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'music-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Músicas são públicas"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'music-uploads');