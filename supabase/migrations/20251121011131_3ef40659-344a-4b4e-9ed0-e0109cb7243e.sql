-- Create story_reactions table
CREATE TABLE IF NOT EXISTS public.story_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view story reactions"
ON public.story_reactions FOR SELECT
USING (true);

CREATE POLICY "Users can create their own reactions"
ON public.story_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
ON public.story_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_story_reactions_story_id ON public.story_reactions(story_id);
CREATE INDEX idx_story_reactions_user_id ON public.story_reactions(user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_reactions;