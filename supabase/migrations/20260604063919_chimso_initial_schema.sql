/*
  # Chimso Initial Schema

  ## Overview
  Sets up the core database for Chimso — a faith-based social app.

  ## New Tables

  ### niches
  - Predefined community niches users can follow (e.g., Faith, Tech, Entrepreneurship)
  - `id` (uuid, primary key)
  - `name` (text, unique) — display name
  - `slug` (text, unique) — URL-safe identifier
  - `icon` (text) — emoji icon
  - `description` (text) — short description

  ### profiles
  - User profile data linked to auth.users
  - `id` (uuid, primary key, references auth.users)
  - `username` (text, unique)
  - `display_name` (text)
  - `bio` (text)
  - `avatar_url` (text)
  - `onboarding_complete` (boolean) — tracks onboarding flow state
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### profile_niches
  - Many-to-many: which niches a user follows (1-3)
  - `profile_id` (uuid, references profiles)
  - `niche_id` (uuid, references niches)

  ### posts
  - User posts scoped to a niche
  - `id` (uuid, primary key)
  - `profile_id` (uuid, references profiles)
  - `niche_id` (uuid, references niches)
  - `content` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Profiles: users can read all profiles, only update their own
  - Profile niches: users can read all, manage their own
  - Posts: users can read all, manage their own
  - Niches: public read access
*/

-- Create niches table
CREATE TABLE IF NOT EXISTS niches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE niches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read niches"
  ON niches FOR SELECT
  TO anon, authenticated
  USING (true);

-- Seed niches
INSERT INTO niches (name, slug, icon, description) VALUES
  ('Faith', 'faith', '🙏', 'Devotionals, scripture, spiritual growth'),
  ('Tech', 'tech', '💻', 'Software, gadgets, digital life'),
  ('Entrepreneurship', 'entrepreneurship', '🚀', 'Building, hustle, business'),
  ('Wellness', 'wellness', '🌿', 'Mental health, fitness, self-care'),
  ('Community', 'community', '🤝', 'Local outreach, volunteering, togetherness'),
  ('Worship', 'worship', '🎵', 'Music, praise, creativity in faith'),
  ('Family', 'family', '❤️', 'Parenting, relationships, home life'),
  ('Prayer', 'prayer', '✨', 'Intercession, prayer requests, testimonies')
ON CONFLICT (slug) DO NOTHING;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  display_name text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  avatar_url text NOT NULL DEFAULT '',
  onboarding_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create profile_niches table
CREATE TABLE IF NOT EXISTS profile_niches (
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  niche_id uuid NOT NULL REFERENCES niches(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (profile_id, niche_id)
);

ALTER TABLE profile_niches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read profile niches"
  ON profile_niches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile niches"
  ON profile_niches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can delete own profile niches"
  ON profile_niches FOR DELETE
  TO authenticated
  USING (auth.uid() = profile_id);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  niche_id uuid NOT NULL REFERENCES niches(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all posts"
  ON posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  TO authenticated
  USING (auth.uid() = profile_id);

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
