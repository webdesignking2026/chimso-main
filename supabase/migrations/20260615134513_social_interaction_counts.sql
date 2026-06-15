-- Add count columns to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS like_count INT NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS comment_count INT NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS share_count INT NOT NULL DEFAULT 0;

-- Initialize counts from existing data
UPDATE posts SET like_count = (
  SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id AND likes.post_id IS NOT NULL
);
UPDATE posts SET comment_count = (
  SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id
);

-- Trigger function for like count on posts
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.post_id IS NOT NULL THEN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' AND OLD.post_id IS NOT NULL THEN
    UPDATE posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_change ON likes;
CREATE TRIGGER on_like_change
AFTER INSERT OR DELETE ON likes
FOR EACH ROW EXECUTE FUNCTION update_post_like_count();

-- Trigger function for comment count on posts
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_count_change ON comments;
CREATE TRIGGER on_comment_count_change
AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- Allow authenticated users to update post share_count (the update policy for own posts already exists,
-- but share_count updates need to work for all posts)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'posts' AND policyname = 'Anyone can increment share count'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can increment share count" ON posts
      FOR UPDATE TO authenticated
      USING (true)
      WITH CHECK (true)';
  END IF;
END $$;
