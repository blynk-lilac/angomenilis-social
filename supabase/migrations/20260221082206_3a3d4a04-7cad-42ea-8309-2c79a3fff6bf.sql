
-- Update monetization: each like = 80kz
CREATE OR REPLACE FUNCTION public.award_earnings_on_post_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  post_owner_id UUID;
  is_verified BOOLEAN;
BEGIN
  SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
  
  IF post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  SELECT verified INTO is_verified FROM profiles WHERE id = post_owner_id;
  
  IF is_verified = true THEN
    INSERT INTO user_earnings (user_id, source_type, amount, description)
    VALUES (post_owner_id, 'likes', 80, 'Curtida na publicação (80kz)');
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.award_earnings_on_video_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  video_owner_id UUID;
  is_verified BOOLEAN;
BEGIN
  SELECT user_id INTO video_owner_id FROM verification_videos WHERE id = NEW.video_id;
  
  IF video_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  SELECT verified INTO is_verified FROM profiles WHERE id = video_owner_id;
  
  IF is_verified = true THEN
    INSERT INTO user_earnings (user_id, source_type, amount, description)
    VALUES (video_owner_id, 'likes', 80, 'Curtida no vídeo (80kz)');
  END IF;
  
  RETURN NEW;
END;
$function$;
