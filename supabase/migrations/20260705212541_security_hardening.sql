
-- ============================================================================
-- SECURITY HARDENING MIGRATION
-- ============================================================================
-- Fixes:
-- 1. Function search_path mutable -> pin search_path = '' with qualified names
-- 2. SECURITY DEFINER functions callable by anon/authenticated -> revoke EXECUTE
-- 3. Overly permissive RLS policies
-- 4. Storage bucket listing too broad
-- 5. Add secure RPC for share count increment
-- ============================================================================


-- ============================================================================
-- 1. RECREATE ALL SECURITY DEFINER FUNCTIONS WITH PINNED search_path
-- ============================================================================

-- handle_new_user (auth trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- update_profile_post_count
CREATE OR REPLACE FUNCTION public.update_profile_post_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET post_count = post_count + 1 WHERE id = NEW.profile_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.profile_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- update_community_member_count
CREATE OR REPLACE FUNCTION public.update_community_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.community_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- update_conversation_timestamp
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- add_reputation_points
CREATE OR REPLACE FUNCTION public.add_reputation_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_TABLE_NAME = 'posts' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.reputation_events (profile_id, event_type, points, reference_type, reference_id)
    VALUES (NEW.profile_id, 'post_created', 2, 'post', NEW.id);
    UPDATE public.profiles SET reputation_points = reputation_points + 2 WHERE id = NEW.profile_id;
  ELSIF TG_TABLE_NAME = 'comments' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.reputation_events (profile_id, event_type, points, reference_type, reference_id)
    VALUES (NEW.profile_id, 'comment_created', 1, 'comment', NEW.id);
    UPDATE public.profiles SET reputation_points = reputation_points + 1 WHERE id = NEW.profile_id;
  END IF;
  RETURN NEW;
END;
$$;

-- add_community_creator_as_admin
CREATE OR REPLACE FUNCTION public.add_community_creator_as_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.community_members (community_id, profile_id, role)
  VALUES (NEW.id, NEW.creator_id, 'admin');
  RETURN NEW;
END;
$$;

-- update_post_timestamp
CREATE OR REPLACE FUNCTION public.update_post_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- update_profile_timestamp
CREATE OR REPLACE FUNCTION public.update_profile_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- update_post_like_count
CREATE OR REPLACE FUNCTION public.update_post_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.post_id IS NOT NULL THEN
    UPDATE public.posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' AND OLD.post_id IS NOT NULL THEN
    UPDATE public.posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

-- update_post_comment_count
CREATE OR REPLACE FUNCTION public.update_post_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;


-- ============================================================================
-- 2. REVOKE EXECUTE FROM anon/authenticated ON TRIGGER-ONLY FUNCTIONS
--    These are trigger functions and must not be callable directly via RPC.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_profile_post_count() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_community_member_count() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_conversation_timestamp() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_reputation_points() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_community_creator_as_admin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_post_timestamp() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_profile_timestamp() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_post_like_count() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_post_comment_count() FROM anon, authenticated;


-- ============================================================================
-- 3. FIX OVERLY PERMISSIVE RLS POLICIES
-- ============================================================================

-- 3a. Drop the "Anyone can increment share count" UPDATE policy (USING/WITH CHECK always true)
DROP POLICY IF EXISTS "Anyone can increment share count" ON public.posts;

-- Create a SECURITY DEFINER function for incrementing share count safely.
-- This is the only way authenticated users can bump share_count on any post.
CREATE OR REPLACE FUNCTION public.increment_post_share_count(post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.posts SET share_count = share_count + 1 WHERE id = post_id;
END;
$$;

-- Allow authenticated users to call this RPC (but not anon)
REVOKE EXECUTE ON FUNCTION public.increment_post_share_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_post_share_count(uuid) TO authenticated;

-- 3b. Fix conversations INSERT policy (WITH CHECK (true) is too broad).
--     Add a creator_id column so we can scope INSERT to the conversation creator.
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);


-- ============================================================================
-- 4. FIX STORAGE BUCKET LISTING POLICIES
--    Public buckets allow direct URL access without policies.
--    Restrict SELECT policies so clients cannot list all objects.
--    Users can only list their own objects; direct public URLs still work.
-- ============================================================================

-- avatars bucket
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Users can view own avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- covers bucket
DROP POLICY IF EXISTS "Anyone can view covers" ON storage.objects;
CREATE POLICY "Users can view own covers"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);

-- post-images bucket
DROP POLICY IF EXISTS "Anyone can view post images" ON storage.objects;
CREATE POLICY "Users can view own post images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);
