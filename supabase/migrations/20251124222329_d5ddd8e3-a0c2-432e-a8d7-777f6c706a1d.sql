-- Create chat_wallpapers table to store wallpaper preferences
CREATE TABLE IF NOT EXISTS public.chat_wallpapers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  chat_partner_id UUID NOT NULL,
  wallpaper_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, chat_partner_id)
);

-- Enable RLS
ALTER TABLE public.chat_wallpapers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own wallpapers"
  ON public.chat_wallpapers
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallpapers"
  ON public.chat_wallpapers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallpapers"
  ON public.chat_wallpapers
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wallpapers"
  ON public.chat_wallpapers
  FOR DELETE
  USING (auth.uid() = user_id);