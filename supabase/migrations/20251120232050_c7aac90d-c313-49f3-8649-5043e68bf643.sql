-- Adicionar coluna full_name à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Copiar first_name para full_name para usuários existentes
UPDATE public.profiles 
SET full_name = first_name 
WHERE full_name IS NULL;