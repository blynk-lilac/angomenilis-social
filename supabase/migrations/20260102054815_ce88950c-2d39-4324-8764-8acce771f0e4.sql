-- Add music columns to posts table for displaying music in feed
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS music_name TEXT,
ADD COLUMN IF NOT EXISTS music_artist TEXT,
ADD COLUMN IF NOT EXISTS music_url TEXT;