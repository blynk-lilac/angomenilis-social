-- Adicionar coluna avatar_url à tabela notifications para mostrar o avatar nas notificações push
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;