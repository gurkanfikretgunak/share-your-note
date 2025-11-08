-- Fix RLS policies for anonymous users
-- This migration updates existing policies to properly allow anonymous users

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Anonymous users can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Anonymous users can update profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert themselves as participants" ON participants;
DROP POLICY IF EXISTS "Anonymous users can insert as participants" ON participants;

-- Recreate policies for authenticated users
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert themselves as participants"
  ON participants FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Create policies for anonymous users (auth.uid() IS NULL)
CREATE POLICY "Anonymous users can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() IS NULL);

CREATE POLICY "Anonymous users can update profiles"
  ON profiles FOR UPDATE
  USING (auth.uid() IS NULL)
  WITH CHECK (auth.uid() IS NULL);

CREATE POLICY "Anonymous users can insert as participants"
  ON participants FOR INSERT
  WITH CHECK (auth.uid() IS NULL);

