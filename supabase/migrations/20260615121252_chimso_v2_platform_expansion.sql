/*
  # Chimso V2 Platform Expansion

  ## Overview
  Expands Chimso from MVP to full community platform with social features,
  communities, messaging, events, learning, reputation, and moderation.

  ## New Tables Section 1 (Tables only, no policies yet)

  - communities: user-created community spaces
  - community_members: membership and roles
  - comments: post comments with threading
  - likes: likes on posts/comments
  - bookmarks: saved posts
  - follows: user-to-user follows
  - conversations, conversation_participants, conversation_messages: direct messaging
  - events, event_attendees: community events
  - learning_tracks, learning_lessons, learning_progress: educational content
  - notifications: user notifications
  - reputation_events, badges, profile_badges: gamification
  - reports: moderation
  - pinned_posts: community pinned posts

  ## Modified Tables
  - profiles: added follower_count, following_count, post_count, reputation_points
  - posts: added community_id column
*/

-- ============================================================================
-- MODIFY EXISTING TABLES
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'follower_count') THEN
    ALTER TABLE profiles ADD COLUMN follower_count int NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'following_count') THEN
    ALTER TABLE profiles ADD COLUMN following_count int NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'post_count') THEN
    ALTER TABLE profiles ADD COLUMN post_count int NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'reputation_points') THEN
    ALTER TABLE profiles ADD COLUMN reputation_points int NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ============================================================================
-- CREATE ALL NEW TABLES (without policies first)
-- ============================================================================

-- communities
CREATE TABLE IF NOT EXISTS communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text NOT NULL DEFAULT '',
  icon_url text NOT NULL DEFAULT '',
  cover_url text NOT NULL DEFAULT '',
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_private boolean NOT NULL DEFAULT false,
  rules text[] NOT NULL DEFAULT '{}',
  member_count int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- community_members
CREATE TABLE IF NOT EXISTS community_members (
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (community_id, profile_id)
);

-- Now add community_id to posts
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'community_id') THEN
    ALTER TABLE posts ADD COLUMN community_id uuid REFERENCES communities(id) ON DELETE SET NULL;
  END IF;
END $$;

-- comments
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- likes
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT one_target CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS likes_post_unique ON likes (profile_id, post_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS likes_comment_unique ON likes (profile_id, comment_id) WHERE comment_id IS NOT NULL;

-- bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (profile_id, post_id)
);

-- follows
CREATE TABLE IF NOT EXISTS follows (
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS follows_following_idx ON follows (following_id);

-- conversations
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- conversation_participants
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz,
  PRIMARY KEY (conversation_id, profile_id)
);

-- conversation_messages
CREATE TABLE IF NOT EXISTS conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  read_by uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversation_messages_conversation_idx ON conversation_messages (conversation_id, created_at DESC);

-- events
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES communities(id) ON DELETE SET NULL,
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  event_type text NOT NULL DEFAULT 'online',
  location text NOT NULL DEFAULT '',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  max_attendees int,
  image_url text NOT NULL DEFAULT '',
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- event_attendees
CREATE TABLE IF NOT EXISTS event_attendees (
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'going',
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (event_id, profile_id)
);

-- learning_tracks
CREATE TABLE IF NOT EXISTS learning_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES communities(id) ON DELETE SET NULL,
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  track_type text NOT NULL DEFAULT 'course',
  cover_url text NOT NULL DEFAULT '',
  difficulty text NOT NULL DEFAULT 'beginner',
  estimated_minutes int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- learning_lessons
CREATE TABLE IF NOT EXISTS learning_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES learning_tracks(id) ON DELETE CASCADE,
  order_index int NOT NULL DEFAULT 0,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  video_url text NOT NULL DEFAULT '',
  duration_minutes int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- learning_progress
CREATE TABLE IF NOT EXISTS learning_progress (
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES learning_lessons(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  PRIMARY KEY (profile_id, lesson_id)
);

-- notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reference_type text,
  reference_id uuid,
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  data jsonb DEFAULT '{}',
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_profile_created_idx ON notifications (profile_id, created_at DESC);

-- reputation_events
CREATE TABLE IF NOT EXISTS reputation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  points int NOT NULL DEFAULT 0,
  reference_type text,
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reputation_events_profile_idx ON reputation_events (profile_id, created_at DESC);

-- badges
CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '',
  points_required int,
  created_at timestamptz DEFAULT now()
);

INSERT INTO badges (name, description, icon, points_required) VALUES
  ('Newcomer', 'Welcome to Chimso!', 'Person', 0),
  ('Contributor', 'Made your first contribution', 'ThumbUp', 50),
  ('Engaged Member', 'Actively participating in the community', 'Favorite', 100),
  ('Thought Leader', 'Your posts are getting attention', 'Lightbulb', 250),
  ('Community Builder', 'Building connections and growing the community', 'Groups', 500),
  ('Mentor', 'Helping others on their journey', 'School', 1000)
ON CONFLICT (name) DO NOTHING;

-- profile_badges
CREATE TABLE IF NOT EXISTS profile_badges (
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at timestamptz DEFAULT now(),
  PRIMARY KEY (profile_id, badge_id)
);

-- reports
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_type text NOT NULL,
  reported_id uuid NOT NULL,
  reason text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  action_taken text,
  created_at timestamptz DEFAULT now()
);

-- pinned_posts
CREATE TABLE IF NOT EXISTS pinned_posts (
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  pinned_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pinned_at timestamptz DEFAULT now(),
  PRIMARY KEY (community_id, post_id)
);

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinned_posts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- COMMUNITIES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Read public communities or private if member" ON communities;
CREATE POLICY "Read public communities or private if member"
  ON communities FOR SELECT
  TO authenticated
  USING (
    NOT is_private
    OR EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = communities.id
      AND community_members.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create communities" ON communities;
CREATE POLICY "Authenticated users can create communities"
  ON communities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Community admins can update" ON communities;
CREATE POLICY "Community admins can update"
  ON communities FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid() OR EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = communities.id
      AND community_members.profile_id = auth.uid()
      AND community_members.role = 'admin'
    ))
  WITH CHECK (creator_id = auth.uid() OR EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = communities.id
      AND community_members.profile_id = auth.uid()
      AND community_members.role = 'admin'
    ));

DROP POLICY IF EXISTS "Community admins can delete" ON communities;
CREATE POLICY "Community admins can delete"
  ON communities FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid() OR EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = communities.id
      AND community_members.profile_id = auth.uid()
      AND community_members.role = 'admin'
    ));

-- ============================================================================
-- COMMUNITY MEMBERS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Members can view all memberships" ON community_members;
CREATE POLICY "Members can view all memberships"
  ON community_members FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can join public communities" ON community_members;
CREATE POLICY "Users can join public communities"
  ON community_members FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = profile_id
    AND EXISTS (
      SELECT 1 FROM communities WHERE communities.id = community_id AND NOT is_private
    )
  );

DROP POLICY IF EXISTS "Users can leave communities" ON community_members;
CREATE POLICY "Users can leave communities"
  ON community_members FOR DELETE
  TO authenticated
  USING (auth.uid() = profile_id);

-- ============================================================================
-- COMMENTS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can read comments" ON comments;
CREATE POLICY "Authenticated users can read comments"
  ON comments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can create comments" ON comments;
CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can update own comments" ON comments;
CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (auth.uid() = profile_id);

-- ============================================================================
-- LIKES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated can read likes" ON likes;
CREATE POLICY "Authenticated can read likes"
  ON likes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can like posts/comments" ON likes;
CREATE POLICY "Users can like posts/comments"
  ON likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can unlike own likes" ON likes;
CREATE POLICY "Users can unlike own likes"
  ON likes FOR DELETE
  TO authenticated
  USING (auth.uid() = profile_id);

-- ============================================================================
-- BOOKMARKS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own bookmarks" ON bookmarks;
CREATE POLICY "Users can read own bookmarks"
  ON bookmarks FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can create bookmarks" ON bookmarks;
CREATE POLICY "Users can create bookmarks"
  ON bookmarks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can delete bookmarks" ON bookmarks;
CREATE POLICY "Users can delete bookmarks"
  ON bookmarks FOR DELETE
  TO authenticated
  USING (auth.uid() = profile_id);

-- ============================================================================
-- FOLLOWS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated can read follows" ON follows;
CREATE POLICY "Authenticated can read follows"
  ON follows FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can follow others" ON follows;
CREATE POLICY "Users can follow others"
  ON follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON follows;
CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- ============================================================================
-- CONVERSATIONS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can see conversations they participate in" ON conversations;
CREATE POLICY "Users can see conversations they participate in"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- CONVERSATION PARTICIPANTS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can see own participation" ON conversation_participants;
CREATE POLICY "Users can see own participation"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (
    auth.uid() = profile_id
    OR EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can add participants" ON conversation_participants;
CREATE POLICY "Users can add participants"
  ON conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = profile_id
    OR EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own read status" ON conversation_participants;
CREATE POLICY "Users can update own read status"
  ON conversation_participants FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- ============================================================================
-- CONVERSATION MESSAGES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Participants can read messages" ON conversation_messages;
CREATE POLICY "Participants can read messages"
  ON conversation_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_messages.conversation_id
      AND cp.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Participants can send messages" ON conversation_messages;
CREATE POLICY "Participants can send messages"
  ON conversation_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_messages.conversation_id
      AND cp.profile_id = auth.uid()
    )
  );

-- ============================================================================
-- EVENTS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Published events are readable" ON events;
CREATE POLICY "Published events are readable"
  ON events FOR SELECT
  TO authenticated
  USING (is_published = true OR creator_id = auth.uid());

DROP POLICY IF EXISTS "Users can create events" ON events;
CREATE POLICY "Users can create events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can update events" ON events;
CREATE POLICY "Creators can update events"
  ON events FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can delete events" ON events;
CREATE POLICY "Creators can delete events"
  ON events FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id);

-- ============================================================================
-- EVENT ATTENDEES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated can read attendees" ON event_attendees;
CREATE POLICY "Authenticated can read attendees"
  ON event_attendees FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can RSVP" ON event_attendees;
CREATE POLICY "Users can RSVP"
  ON event_attendees FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can update RSVP" ON event_attendees;
CREATE POLICY "Users can update RSVP"
  ON event_attendees FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can cancel RSVP" ON event_attendees;
CREATE POLICY "Users can cancel RSVP"
  ON event_attendees FOR DELETE
  TO authenticated
  USING (auth.uid() = profile_id);

-- ============================================================================
-- LEARNING TRACKS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Published tracks are readable" ON learning_tracks;
CREATE POLICY "Published tracks are readable"
  ON learning_tracks FOR SELECT
  TO authenticated
  USING (is_published = true OR creator_id = auth.uid());

DROP POLICY IF EXISTS "Users can create tracks" ON learning_tracks;
CREATE POLICY "Users can create tracks"
  ON learning_tracks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can update tracks" ON learning_tracks;
CREATE POLICY "Creators can update tracks"
  ON learning_tracks FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can delete tracks" ON learning_tracks;
CREATE POLICY "Creators can delete tracks"
  ON learning_tracks FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id);

-- ============================================================================
-- LEARNING LESSONS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Lessons readable if track is readable" ON learning_lessons;
CREATE POLICY "Lessons readable if track is readable"
  ON learning_lessons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM learning_tracks
      WHERE learning_tracks.id = learning_lessons.track_id
      AND (learning_tracks.is_published = true OR learning_tracks.creator_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Track creators can manage lessons" ON learning_lessons;
CREATE POLICY "Track creators can manage lessons"
  ON learning_lessons FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM learning_tracks
      WHERE learning_tracks.id = learning_lessons.track_id
      AND learning_tracks.creator_id = auth.uid()
    )
  );

-- ============================================================================
-- LEARNING PROGRESS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own progress" ON learning_progress;
CREATE POLICY "Users can read own progress"
  ON learning_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can update own progress" ON learning_progress;
CREATE POLICY "Users can update own progress"
  ON learning_progress FOR ALL
  TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = profile_id);

-- ============================================================================
-- REPUTATION EVENTS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own reputation events" ON reputation_events;
CREATE POLICY "Users can read own reputation events"
  ON reputation_events FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

-- ============================================================================
-- BADGES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Everyone can read badges" ON badges;
CREATE POLICY "Everyone can read badges"
  ON badges FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- PROFILE BADGES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Everyone can read earned badges" ON profile_badges;
CREATE POLICY "Everyone can read earned badges"
  ON profile_badges FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- REPORTS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own reports" ON reports;
CREATE POLICY "Users can read own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can create reports" ON reports;
CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- ============================================================================
-- PINNED POSTS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated can read pinned posts" ON pinned_posts;
CREATE POLICY "Authenticated can read pinned posts"
  ON pinned_posts FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Update profile post count
CREATE OR REPLACE FUNCTION update_profile_post_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET post_count = post_count + 1 WHERE id = NEW.profile_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.profile_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_created ON posts;
DROP TRIGGER IF EXISTS on_post_deleted ON posts;
CREATE TRIGGER on_post_created AFTER INSERT ON posts FOR EACH ROW EXECUTE FUNCTION update_profile_post_count();
CREATE TRIGGER on_post_deleted AFTER DELETE ON posts FOR EACH ROW EXECUTE FUNCTION update_profile_post_count();

-- Update community member count
CREATE OR REPLACE FUNCTION update_community_member_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.community_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_member_join ON community_members;
DROP TRIGGER IF EXISTS on_member_leave ON community_members;
CREATE TRIGGER on_member_join AFTER INSERT ON community_members FOR EACH ROW EXECUTE FUNCTION update_community_member_count();
CREATE TRIGGER on_member_leave AFTER DELETE ON community_members FOR EACH ROW EXECUTE FUNCTION update_community_member_count();

-- Update conversation timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS trigger AS $$
BEGIN
  UPDATE conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_conversation_message ON conversation_messages;
CREATE TRIGGER on_conversation_message AFTER INSERT ON conversation_messages FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

-- Add reputation points
CREATE OR REPLACE FUNCTION add_reputation_points()
RETURNS trigger AS $$
BEGIN
  IF TG_TABLE_NAME = 'posts' AND TG_OP = 'INSERT' THEN
    INSERT INTO reputation_events (profile_id, event_type, points, reference_type, reference_id)
    VALUES (NEW.profile_id, 'post_created', 2, 'post', NEW.id);
    UPDATE profiles SET reputation_points = reputation_points + 2 WHERE id = NEW.profile_id;
  ELSIF TG_TABLE_NAME = 'comments' AND TG_OP = 'INSERT' THEN
    INSERT INTO reputation_events (profile_id, event_type, points, reference_type, reference_id)
    VALUES (NEW.profile_id, 'comment_created', 1, 'comment', NEW.id);
    UPDATE profiles SET reputation_points = reputation_points + 1 WHERE id = NEW.profile_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_for_reputation ON posts;
DROP TRIGGER IF EXISTS on_comment_for_reputation ON comments;
CREATE TRIGGER on_post_for_reputation AFTER INSERT ON posts FOR EACH ROW EXECUTE FUNCTION add_reputation_points();
CREATE TRIGGER on_comment_for_reputation AFTER INSERT ON comments FOR EACH ROW EXECUTE FUNCTION add_reputation_points();

-- Auto-add creator as admin to their community
CREATE OR REPLACE FUNCTION add_community_creator_as_admin()
RETURNS trigger AS $$
BEGIN
  INSERT INTO community_members (community_id, profile_id, role)
  VALUES (NEW.id, NEW.creator_id, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_community_created ON communities;
CREATE TRIGGER on_community_created AFTER INSERT ON communities FOR EACH ROW EXECUTE FUNCTION add_community_creator_as_admin();
