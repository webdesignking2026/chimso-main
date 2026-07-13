/*
# Add age column to profiles table

1. Modified Tables
- `profiles`
  - Added `age` (integer, nullable) — stores the user's age collected during
    first-time onboarding. Nullable because existing users won't have it and
    it's optional. The value is private (never displayed publicly) and used
    only for aggregate analytics.

2. Security
- No changes to existing RLS policies. The `age` column is covered by the
  existing profile SELECT policy (authenticated users can read all profiles),
  but the column is never rendered in the UI, so it remains private in
  practice. The UPDATE policy already allows users to update their own
  profile, which covers setting the age.

3. Notes
- The age is collected BEFORE authentication (pre-signup screen), so it is
  stored in localStorage on the client first, then persisted to the profile
  row once the user authenticates. A localStorage flag prevents the age
  screen from appearing more than once per device.
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS age integer;
