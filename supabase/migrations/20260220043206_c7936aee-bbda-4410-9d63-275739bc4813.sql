
-- Create function to award earnings when a post gets a reaction (like)
CREATE OR REPLACE FUNCTION public.award_earnings_on_post_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  post_owner_id UUID;
  is_verified BOOLEAN;
BEGIN
  -- Get the post owner
  SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
  
  -- Don't award if user liked their own post
  IF post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Check if post owner is verified
  SELECT verified INTO is_verified FROM profiles WHERE id = post_owner_id;
  
  IF is_verified = true THEN
    -- Award 1 kz per like
    INSERT INTO user_earnings (user_id, source_type, amount, description)
    VALUES (post_owner_id, 'likes', 1, 'Curtida na publicação');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create function to award earnings on video views
CREATE OR REPLACE FUNCTION public.award_earnings_on_video_view()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  video_owner_id UUID;
  is_verified BOOLEAN;
BEGIN
  -- Get the video owner
  SELECT user_id INTO video_owner_id FROM verification_videos WHERE id = NEW.video_id;
  
  -- Don't award if user viewed their own video
  IF video_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Check if video owner is verified
  SELECT verified INTO is_verified FROM profiles WHERE id = video_owner_id;
  
  IF is_verified = true THEN
    -- Award 0.5 kz per view (use 1 since amount is integer)
    INSERT INTO user_earnings (user_id, source_type, amount, description)
    VALUES (video_owner_id, 'views', 1, 'Visualização de vídeo');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create function to award earnings on post views (via comments as proxy)
CREATE OR REPLACE FUNCTION public.award_earnings_on_video_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  video_owner_id UUID;
  is_verified BOOLEAN;
BEGIN
  -- Get the video owner
  SELECT user_id INTO video_owner_id FROM verification_videos WHERE id = NEW.video_id;
  
  -- Don't award if user liked their own video
  IF video_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Check if video owner is verified
  SELECT verified INTO is_verified FROM profiles WHERE id = video_owner_id;
  
  IF is_verified = true THEN
    -- Award 2 kz per video like
    INSERT INTO user_earnings (user_id, source_type, amount, description)
    VALUES (video_owner_id, 'likes', 2, 'Curtida no vídeo');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_earn_on_post_reaction ON post_reactions;
CREATE TRIGGER trigger_earn_on_post_reaction
  AFTER INSERT ON post_reactions
  FOR EACH ROW
  EXECUTE FUNCTION award_earnings_on_post_reaction();

DROP TRIGGER IF EXISTS trigger_earn_on_video_view ON video_views;
CREATE TRIGGER trigger_earn_on_video_view
  AFTER INSERT ON video_views
  FOR EACH ROW
  EXECUTE FUNCTION award_earnings_on_video_view();

DROP TRIGGER IF EXISTS trigger_earn_on_video_like ON verification_video_likes;
CREATE TRIGGER trigger_earn_on_video_like
  AFTER INSERT ON verification_video_likes
  FOR EACH ROW
  EXECUTE FUNCTION award_earnings_on_video_like();
