/*
  # Image Support for Posts and Profile Cover Photos

  ## Overview
  Adds image support for posts and cover photos for profiles.
  Creates storage buckets for user-uploaded images.
*/

-- ============================================================================
-- ADD IMAGE FIELDS
-- ============================================================================

-- Add image_url to posts for image posting support
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url text NOT NULL DEFAULT '';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';

-- Add cover_url to profiles for cover photos
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_url text NOT NULL DEFAULT '';

-- ============================================================================
-- CREATE STORAGE BUCKETS
-- ============================================================================

-- Insert storage buckets (using raw SQL since buckets are managed differently)
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES FOR post-images bucket
-- ============================================================================

-- Allow anyone to read post images (public bucket)
CREATE POLICY "Anyone can view post images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'post-images');

-- Allow authenticated users to upload post images
CREATE POLICY "Authenticated users can upload post images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'post-images');

-- Allow users to update their own post images
CREATE POLICY "Users can update own post images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(split_part(name, '/', 2)))[1]);

-- Allow users to delete their own post images
CREATE POLICY "Users can delete own post images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(split_part(name, '/', 2)))[1]);

-- ============================================================================
-- STORAGE POLICIES FOR avatars bucket
-- ============================================================================

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update own avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(split_part(name, '/', 2)))[1]);

CREATE POLICY "Users can delete own avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(split_part(name, '/', 2)))[1]);

-- ============================================================================
-- STORAGE POLICIES FOR covers bucket
-- ============================================================================

CREATE POLICY "Anyone can view covers"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'covers');

CREATE POLICY "Authenticated users can upload covers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'covers');

CREATE POLICY "Users can update own covers"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(split_part(name, '/', 2)))[1]);

CREATE POLICY "Users can delete own covers"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(split_part(name, '/', 2)))[1]);

-- ============================================================================
-- FIX POST UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_post_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_update ON posts;
CREATE TRIGGER on_post_update BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_post_timestamp();

-- ============================================================================
-- FIX PROFILE UPDATED_AT TRIGGER  
-- ============================================================================

CREATE OR REPLACE FUNCTION update_profile_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_update ON profiles;
CREATE TRIGGER on_profile_update BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_profile_timestamp();