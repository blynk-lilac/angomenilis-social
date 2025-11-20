-- Create verification_requests table
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create verification_videos table
CREATE TABLE IF NOT EXISTS public.verification_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  caption TEXT,
  share_code TEXT UNIQUE NOT NULL DEFAULT substring(md5(random()::text) from 1 for 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create verification_video_comments table
CREATE TABLE IF NOT EXISTS public.verification_video_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.verification_videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create verification_video_likes table
CREATE TABLE IF NOT EXISTS public.verification_video_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.verification_videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(video_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_video_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_video_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for verification_requests
CREATE POLICY "Users can create their own verification requests"
  ON public.verification_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own verification requests"
  ON public.verification_requests FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for verification_videos
CREATE POLICY "Users can create their own videos"
  ON public.verification_videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all videos"
  ON public.verification_videos FOR SELECT
  USING (true);

CREATE POLICY "Users can delete their own videos"
  ON public.verification_videos FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos"
  ON public.verification_videos FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for verification_video_comments
CREATE POLICY "Users can create video comments"
  ON public.verification_video_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all video comments"
  ON public.verification_video_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can delete their own video comments"
  ON public.verification_video_comments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for verification_video_likes
CREATE POLICY "Users can like videos"
  ON public.verification_video_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all video likes"
  ON public.verification_video_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can unlike videos"
  ON public.verification_video_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_verification_requests_user_id ON public.verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_videos_user_id ON public.verification_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_videos_share_code ON public.verification_videos(share_code);
CREATE INDEX IF NOT EXISTS idx_verification_video_comments_video_id ON public.verification_video_comments(video_id);
CREATE INDEX IF NOT EXISTS idx_verification_video_likes_video_id ON public.verification_video_likes(video_id);

-- Enable realtime for video tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.verification_videos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.verification_video_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.verification_video_likes;