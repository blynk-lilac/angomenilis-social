-- Create ad_comments table for sponsored ads
CREATE TABLE public.ad_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id UUID NOT NULL REFERENCES public.sponsored_ads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ad_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view ad comments"
ON public.ad_comments
FOR SELECT
USING (true);

CREATE POLICY "Users can create ad comments"
ON public.ad_comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ad comments"
ON public.ad_comments
FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for ad_comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.ad_comments;