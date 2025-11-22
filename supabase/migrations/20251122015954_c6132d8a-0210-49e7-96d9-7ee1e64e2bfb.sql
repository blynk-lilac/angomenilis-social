-- Criar bucket para anúncios
INSERT INTO storage.buckets (id, name, public)
VALUES ('ads', 'ads', true);

-- Políticas RLS para o bucket ads
CREATE POLICY "Anúncios são públicos"
ON storage.objects FOR SELECT
USING (bucket_id = 'ads');

CREATE POLICY "Usuários autenticados podem fazer upload de anúncios"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ads' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Usuários podem atualizar seus próprios anúncios"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'ads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Usuários podem deletar seus próprios anúncios"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);