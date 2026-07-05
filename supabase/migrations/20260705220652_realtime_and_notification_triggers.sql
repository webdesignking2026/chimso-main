
-- ============================================================================
-- 1. ENABLE REALTIME ON KEY TABLES
-- ============================================================================

-- Add tables to supabase_realtime publication for live subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'follows'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

-- ============================================================================
-- 2. FOLLOW COUNT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET follower_count = GREATEST(0, follower_count - 1) WHERE id = OLD.following_id;
    UPDATE public.profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_follow_count_change ON public.follows;
CREATE TRIGGER on_follow_count_change
AFTER INSERT OR DELETE ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.update_follow_counts();

-- Sync current follow counts from existing data
UPDATE public.profiles SET
  follower_count = (SELECT COUNT(*) FROM public.follows WHERE follows.following_id = profiles.id),
  following_count = (SELECT COUNT(*) FROM public.follows WHERE follows.follower_id = profiles.id);

-- ============================================================================
-- 3. NOTIFICATION TRIGGER: NEW FOLLOWER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_follow_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_display_name text;
BEGIN
  SELECT display_name INTO v_display_name FROM public.profiles WHERE id = NEW.follower_id;

  INSERT INTO public.notifications (profile_id, type, actor_id, reference_type, reference_id, title, body, data)
  VALUES (
    NEW.following_id,
    'follow',
    NEW.follower_id,
    'profile',
    NEW.follower_id,
    COALESCE(v_display_name, 'Someone') || ' followed you',
    'You have a new follower!',
    '{}'::jsonb
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_follow_notification ON public.follows;
CREATE TRIGGER on_follow_notification
AFTER INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.create_follow_notification();

-- ============================================================================
-- 4. NOTIFICATION TRIGGER: POST LIKE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_like_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_post_owner uuid;
  v_display_name text;
BEGIN
  -- Only notify for post likes, not comment likes
  IF NEW.post_id IS NULL THEN RETURN NEW; END IF;

  SELECT profile_id INTO v_post_owner FROM public.posts WHERE id = NEW.post_id;

  -- Don't notify on self-like
  IF v_post_owner IS NULL OR v_post_owner = NEW.profile_id THEN RETURN NEW; END IF;

  SELECT display_name INTO v_display_name FROM public.profiles WHERE id = NEW.profile_id;

  INSERT INTO public.notifications (profile_id, type, actor_id, reference_type, reference_id, title, body, data)
  VALUES (
    v_post_owner,
    'like',
    NEW.profile_id,
    'post',
    NEW.post_id,
    COALESCE(v_display_name, 'Someone') || ' liked your post',
    'Your post received a new like.',
    '{}'::jsonb
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_like_notification ON public.likes;
CREATE TRIGGER on_like_notification
AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.create_like_notification();

-- ============================================================================
-- 5. NOTIFICATION TRIGGER: COMMENT / REPLY
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_comment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_post_owner uuid;
  v_parent_owner uuid;
  v_display_name text;
BEGIN
  SELECT profile_id INTO v_post_owner FROM public.posts WHERE id = NEW.post_id;
  SELECT display_name INTO v_display_name FROM public.profiles WHERE id = NEW.profile_id;

  -- Notify post owner (if commenter is not the post owner)
  IF v_post_owner IS NOT NULL AND v_post_owner != NEW.profile_id THEN
    INSERT INTO public.notifications (profile_id, type, actor_id, reference_type, reference_id, title, body, data)
    VALUES (
      v_post_owner,
      'comment',
      NEW.profile_id,
      'post',
      NEW.post_id,
      COALESCE(v_display_name, 'Someone') || ' commented on your post',
      LEFT(NEW.content, 120),
      '{}'::jsonb
    );
  END IF;

  -- If reply, also notify the parent comment author (if different from post owner and commenter)
  IF NEW.parent_id IS NOT NULL THEN
    SELECT profile_id INTO v_parent_owner FROM public.comments WHERE id = NEW.parent_id;

    IF v_parent_owner IS NOT NULL
      AND v_parent_owner != NEW.profile_id
      AND v_parent_owner != COALESCE(v_post_owner, '00000000-0000-0000-0000-000000000000'::uuid)
    THEN
      INSERT INTO public.notifications (profile_id, type, actor_id, reference_type, reference_id, title, body, data)
      VALUES (
        v_parent_owner,
        'reply',
        NEW.profile_id,
        'post',
        NEW.post_id,
        COALESCE(v_display_name, 'Someone') || ' replied to your comment',
        LEFT(NEW.content, 120),
        '{}'::jsonb
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_comment_notification ON public.comments;
CREATE TRIGGER on_comment_notification
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.create_comment_notification();

-- ============================================================================
-- 6. GRANT REVOKE for new functions (security hardening consistency)
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.update_follow_counts() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_follow_notification() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_like_notification() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_comment_notification() FROM anon, authenticated;
