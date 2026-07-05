
-- Update handle_new_user to populate profile from OAuth metadata (Google)
-- When a user signs up via Google, their full_name and avatar_url are available
-- in auth.users.raw_user_meta_data -> 'full_name' and raw_user_meta_data -> 'avatar_url'

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_display_name text;
  v_avatar_url text;
BEGIN
  -- Extract profile data from OAuth metadata (Google provides full_name and avatar_url)
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    ''
  );
  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    ''
  );

  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id, v_display_name, v_avatar_url)
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name, ''),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url, '');
  
  RETURN NEW;
END;
$$;
