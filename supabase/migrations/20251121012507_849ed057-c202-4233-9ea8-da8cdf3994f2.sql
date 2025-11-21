-- Adicionar campo de música na tabela stories
ALTER TABLE public.stories 
ADD COLUMN IF NOT EXISTS music_name TEXT,
ADD COLUMN IF NOT EXISTS music_artist TEXT;