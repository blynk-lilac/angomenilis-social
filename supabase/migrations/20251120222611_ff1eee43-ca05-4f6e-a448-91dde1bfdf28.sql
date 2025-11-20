-- Create table for message reactions
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Users can add reactions
CREATE POLICY "Users can add reactions"
ON public.message_reactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can remove their own reactions
CREATE POLICY "Users can remove their reactions"
ON public.message_reactions
FOR DELETE
USING (auth.uid() = user_id);

-- Users can view reactions on messages they can see
CREATE POLICY "Users can view reactions"
ON public.message_reactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.messages
    WHERE messages.id = message_reactions.message_id
    AND (messages.sender_id = auth.uid() OR messages.receiver_id = auth.uid())
  )
);

-- Create index for better performance
CREATE INDEX idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON public.message_reactions(user_id);

-- Add similar for group messages
CREATE TABLE IF NOT EXISTS public.group_message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.group_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE public.group_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can add reactions to group messages"
ON public.group_message_reactions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.group_messages gm
    JOIN public.group_members mem ON mem.group_id = gm.group_id
    WHERE gm.id = group_message_reactions.message_id
    AND mem.user_id = auth.uid()
  )
);

CREATE POLICY "Users can remove their group message reactions"
ON public.group_message_reactions
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view group message reactions"
ON public.group_message_reactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_messages gm
    JOIN public.group_members mem ON mem.group_id = gm.group_id
    WHERE gm.id = group_message_reactions.message_id
    AND mem.user_id = auth.uid()
  )
);

CREATE INDEX idx_group_message_reactions_message_id ON public.group_message_reactions(message_id);
CREATE INDEX idx_group_message_reactions_user_id ON public.group_message_reactions(user_id);