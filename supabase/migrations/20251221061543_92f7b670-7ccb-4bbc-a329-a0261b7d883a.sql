-- Add view count tracking for videos
CREATE TABLE IF NOT EXISTS public.video_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.verification_videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(video_id, user_id)
);

-- Enable RLS
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view video views" 
ON public.video_views 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert views" 
ON public.video_views 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime for video_views
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_views;