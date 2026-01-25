-- Message views table for view-once functionality
CREATE TABLE IF NOT EXISTS public.message_views (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    viewed_at timestamp with time zone DEFAULT now(),
    UNIQUE(message_id, user_id)
);

-- Add view_once column to messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS view_once boolean DEFAULT false;

-- Enable RLS
ALTER TABLE public.message_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their message views" ON public.message_views
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert message views" ON public.message_views
FOR INSERT WITH CHECK (auth.uid() = user_id);