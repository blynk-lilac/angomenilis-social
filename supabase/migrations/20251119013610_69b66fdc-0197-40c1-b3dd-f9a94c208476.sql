-- Create channels table
CREATE TABLE public.channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT true,
  follower_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create channel_followers table
CREATE TABLE public.channel_followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

-- Create channel_admins table
CREATE TABLE public.channel_admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

-- Create channel_messages table
CREATE TABLE public.channel_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  message_type TEXT DEFAULT 'text',
  duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;

-- Create security definer functions
CREATE OR REPLACE FUNCTION public.is_channel_admin(_user_id UUID, _channel_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.channel_admins
    WHERE user_id = _user_id
      AND channel_id = _channel_id
  ) OR EXISTS (
    SELECT 1
    FROM public.channels
    WHERE id = _channel_id
      AND created_by = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_channel_follower(_user_id UUID, _channel_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.channel_followers
    WHERE user_id = _user_id
      AND channel_id = _channel_id
  )
$$;

-- RLS Policies for channels
CREATE POLICY "Users can view public channels"
ON public.channels FOR SELECT
USING (is_public = true);

CREATE POLICY "Users can create channels"
ON public.channels FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Channel creators and admins can update"
ON public.channels FOR UPDATE
USING (is_channel_admin(auth.uid(), id));

-- RLS Policies for channel_followers
CREATE POLICY "Users can view channel followers"
ON public.channel_followers FOR SELECT
USING (is_channel_follower(auth.uid(), channel_id) OR is_channel_admin(auth.uid(), channel_id));

CREATE POLICY "Users can follow channels"
ON public.channel_followers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow channels"
ON public.channel_followers FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for channel_admins
CREATE POLICY "Admins can view channel admins"
ON public.channel_admins FOR SELECT
USING (is_channel_admin(auth.uid(), channel_id));

CREATE POLICY "Channel creators can add admins"
ON public.channel_admins FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.channels
  WHERE id = channel_id AND created_by = auth.uid()
));

-- RLS Policies for channel_messages
CREATE POLICY "Followers can view channel messages"
ON public.channel_messages FOR SELECT
USING (is_channel_follower(auth.uid(), channel_id) OR is_channel_admin(auth.uid(), channel_id));

CREATE POLICY "Only admins can send messages"
ON public.channel_messages FOR INSERT
WITH CHECK (is_channel_admin(auth.uid(), channel_id));

CREATE POLICY "Admins can delete messages"
ON public.channel_messages FOR DELETE
USING (is_channel_admin(auth.uid(), channel_id));

-- Create trigger to update follower count
CREATE OR REPLACE FUNCTION public.update_channel_follower_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.channels
    SET follower_count = follower_count + 1
    WHERE id = NEW.channel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.channels
    SET follower_count = follower_count - 1
    WHERE id = OLD.channel_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_follower_count_trigger
AFTER INSERT OR DELETE ON public.channel_followers
FOR EACH ROW
EXECUTE FUNCTION public.update_channel_follower_count();

-- Create trigger to auto-add creator as admin
CREATE OR REPLACE FUNCTION public.add_creator_as_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.channel_admins (channel_id, user_id)
  VALUES (NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$;

CREATE TRIGGER add_creator_as_admin_trigger
AFTER INSERT ON public.channels
FOR EACH ROW
EXECUTE FUNCTION public.add_creator_as_admin();