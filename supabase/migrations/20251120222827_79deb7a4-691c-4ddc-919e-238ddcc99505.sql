-- Create table for channel message reactions
CREATE TABLE IF NOT EXISTS public.channel_message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.channel_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS
ALTER TABLE public.channel_message_reactions ENABLE ROW LEVEL SECURITY;

-- Users can add reactions to channel messages
CREATE POLICY "Users can add reactions to channel messages"
ON public.channel_message_reactions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.channel_messages cm
    WHERE cm.id = channel_message_reactions.message_id
    AND (
      is_channel_follower(auth.uid(), cm.channel_id) OR 
      is_channel_admin(auth.uid(), cm.channel_id)
    )
  )
);

-- Users can remove their channel message reactions
CREATE POLICY "Users can remove their channel message reactions"
ON public.channel_message_reactions
FOR DELETE
USING (auth.uid() = user_id);

-- Users can view channel message reactions
CREATE POLICY "Users can view channel message reactions"
ON public.channel_message_reactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.channel_messages cm
    WHERE cm.id = channel_message_reactions.message_id
    AND (
      is_channel_follower(auth.uid(), cm.channel_id) OR 
      is_channel_admin(auth.uid(), cm.channel_id)
    )
  )
);

-- Create indexes for better performance
CREATE INDEX idx_channel_message_reactions_message_id ON public.channel_message_reactions(message_id);
CREATE INDEX idx_channel_message_reactions_user_id ON public.channel_message_reactions(user_id);