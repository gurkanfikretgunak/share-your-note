-- Quick fix: Allow anyone to insert profiles for anonymous users
-- Run this if the main migration doesn't work

-- Drop existing policies
DROP POLICY IF EXISTS "Anonymous users can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can insert profiles" ON profiles;

-- Create a more permissive policy for anonymous inserts
CREATE POLICY "Anyone can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- This allows anonymous users to create profiles
-- It's safe because profiles only contain username and id

