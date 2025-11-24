-- Criar bucket de storage para anúncios se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('ads', 'ads', true)
ON CONFLICT (id) DO NOTHING;

-- Criar políticas de storage para o bucket ads
CREATE POLICY "Anyone can view ads"
ON storage.objects FOR SELECT
USING (bucket_id = 'ads');

CREATE POLICY "Authenticated users can upload ads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ads' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own ads"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ads' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own ads"
ON storage.objects FOR DELETE
USING (bucket_id = 'ads' AND auth.role() = 'authenticated');