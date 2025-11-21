-- Alterar a tabela posts para suportar múltiplas mídias
ALTER TABLE posts DROP COLUMN IF EXISTS media_url;
ALTER TABLE posts DROP COLUMN IF EXISTS media_type;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_urls text[];

-- Atualizar posts existentes que possam ter dados antigos
UPDATE posts SET media_urls = NULL WHERE media_urls IS NULL;