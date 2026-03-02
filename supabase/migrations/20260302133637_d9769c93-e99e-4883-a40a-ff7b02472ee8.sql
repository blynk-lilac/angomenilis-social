
-- Trigger: notify on post reaction (like)
CREATE OR REPLACE FUNCTION public.notify_on_post_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  post_owner_id UUID;
  reactor_name TEXT;
  reactor_avatar TEXT;
BEGIN
  SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
  IF post_owner_id IS NULL OR post_owner_id = NEW.user_id THEN RETURN NEW; END IF;

  SELECT first_name, avatar_url INTO reactor_name, reactor_avatar
  FROM profiles WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, type, title, message, related_id, avatar_url)
  VALUES (post_owner_id, 'post_like', COALESCE(reactor_name, 'Alguém'),
    'gostou da tua publicação', NEW.post_id, reactor_avatar);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_reaction ON post_reactions;
CREATE TRIGGER trg_notify_post_reaction
AFTER INSERT ON post_reactions
FOR EACH ROW EXECUTE FUNCTION notify_on_post_reaction();

-- Trigger: notify on comment
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  post_owner_id UUID;
  commenter_name TEXT;
  commenter_avatar TEXT;
BEGIN
  SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
  IF post_owner_id IS NULL OR post_owner_id = NEW.user_id THEN RETURN NEW; END IF;

  SELECT first_name, avatar_url INTO commenter_name, commenter_avatar
  FROM profiles WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, type, title, message, related_id, avatar_url)
  VALUES (post_owner_id, 'comment', COALESCE(commenter_name, 'Alguém'),
    'comentou na tua publicação', NEW.post_id, commenter_avatar);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_comment ON comments;
CREATE TRIGGER trg_notify_comment
AFTER INSERT ON comments
FOR EACH ROW EXECUTE FUNCTION notify_on_comment();

-- Trigger: notify on follow
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  follower_name TEXT;
  follower_avatar TEXT;
BEGIN
  IF NEW.follower_id = NEW.following_id THEN RETURN NEW; END IF;

  SELECT first_name, avatar_url INTO follower_name, follower_avatar
  FROM profiles WHERE id = NEW.follower_id;

  INSERT INTO notifications (user_id, type, title, message, related_id, avatar_url)
  VALUES (NEW.following_id, 'follow', COALESCE(follower_name, 'Alguém'),
    'começou a filhar-te', NEW.follower_id, follower_avatar);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_follow ON follows;
CREATE TRIGGER trg_notify_follow
AFTER INSERT ON follows
FOR EACH ROW EXECUTE FUNCTION notify_on_follow();

-- Trigger: notify on mention in post
CREATE OR REPLACE FUNCTION public.notify_on_post_mention()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  mentioner_name TEXT;
  mentioner_avatar TEXT;
  post_user_id UUID;
BEGIN
  SELECT user_id INTO post_user_id FROM posts WHERE id = NEW.post_id;
  IF NEW.mentioned_user_id = post_user_id THEN RETURN NEW; END IF;

  SELECT first_name, avatar_url INTO mentioner_name, mentioner_avatar
  FROM profiles WHERE id = post_user_id;

  INSERT INTO notifications (user_id, type, title, message, related_id, avatar_url)
  VALUES (NEW.mentioned_user_id, 'mention', COALESCE(mentioner_name, 'Alguém'),
    'mencionou-te numa publicação', NEW.post_id, mentioner_avatar);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_mention ON post_mentions;
CREATE TRIGGER trg_notify_post_mention
AFTER INSERT ON post_mentions
FOR EACH ROW EXECUTE FUNCTION notify_on_post_mention();

-- Trigger: notify on comment mention
CREATE OR REPLACE FUNCTION public.notify_on_comment_mention()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  commenter_name TEXT;
  commenter_avatar TEXT;
  the_post_id UUID;
BEGIN
  SELECT c.user_id, c.post_id INTO commenter_name, the_post_id
  FROM comments c WHERE c.id = NEW.comment_id;

  SELECT first_name, avatar_url INTO commenter_name, commenter_avatar
  FROM profiles WHERE id = (SELECT user_id FROM comments WHERE id = NEW.comment_id);

  INSERT INTO notifications (user_id, type, title, message, related_id, avatar_url)
  VALUES (NEW.mentioned_user_id, 'mention', COALESCE(commenter_name, 'Alguém'),
    'mencionou-te num comentário', the_post_id, commenter_avatar);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_comment_mention ON comment_mentions;
CREATE TRIGGER trg_notify_comment_mention
AFTER INSERT ON comment_mentions
FOR EACH ROW EXECUTE FUNCTION notify_on_comment_mention();
