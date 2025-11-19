-- Create chat_settings table to store chat privacy configurations
CREATE TABLE IF NOT EXISTS public.chat_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_partner_id UUID NOT NULL,
  pin_code TEXT,
  temporary_messages_duration TEXT DEFAULT 'disabled',
  is_locked BOOLEAN DEFAULT false,
  media_visibility BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, chat_partner_id)
);

-- Enable RLS
ALTER TABLE public.chat_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own chat settings"
ON public.chat_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat settings"
ON public.chat_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat settings"
ON public.chat_settings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat settings"
ON public.chat_settings
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_chat_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_settings_updated_at
BEFORE UPDATE ON public.chat_settings
FOR EACH ROW
EXECUTE FUNCTION update_chat_settings_updated_at();