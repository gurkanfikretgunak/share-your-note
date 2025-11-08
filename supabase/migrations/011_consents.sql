-- Create consents table to store user consents
CREATE TABLE IF NOT EXISTS consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('gdpr', 'policy', 'cookie', 'event_data_sharing')),
  consented BOOLEAN NOT NULL DEFAULT false,
  consented_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint that handles NULL event_id properly
-- PostgreSQL treats NULLs as distinct in unique constraints, so we need a workaround
-- We'll use a unique expression index
CREATE UNIQUE INDEX IF NOT EXISTS idx_consents_unique 
ON consents(profile_id, consent_type, COALESCE(event_id::text, ''));

-- Enable RLS
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Consents are viewable by everyone" ON consents;
DROP POLICY IF EXISTS "Users can insert their own consents" ON consents;
DROP POLICY IF EXISTS "Anonymous users can insert consents" ON consents;
DROP POLICY IF EXISTS "Users can update their own consents" ON consents;
DROP POLICY IF EXISTS "Anonymous users can update consents" ON consents;
DROP POLICY IF EXISTS "Users can delete their own consents" ON consents;
DROP POLICY IF EXISTS "Anonymous users can delete consents" ON consents;

-- Policy: Everyone can read consents (for transparency)
CREATE POLICY "Consents are viewable by everyone"
  ON consents FOR SELECT
  USING (true);

-- Policy: Users can insert their own consents
CREATE POLICY "Users can insert their own consents"
  ON consents FOR INSERT
  WITH CHECK (auth.uid() = profile_id OR auth.uid() IS NULL);

-- Policy: Anonymous users can insert consents
CREATE POLICY "Anonymous users can insert consents"
  ON consents FOR INSERT
  WITH CHECK (auth.uid() IS NULL);

-- Policy: Users can update their own consents
CREATE POLICY "Users can update their own consents"
  ON consents FOR UPDATE
  USING (auth.uid() = profile_id OR auth.uid() IS NULL)
  WITH CHECK (auth.uid() = profile_id OR auth.uid() IS NULL);

-- Policy: Anonymous users can update consents
CREATE POLICY "Anonymous users can update consents"
  ON consents FOR UPDATE
  USING (auth.uid() IS NULL)
  WITH CHECK (auth.uid() IS NULL);

-- Policy: Users can delete their own consents
CREATE POLICY "Users can delete their own consents"
  ON consents FOR DELETE
  USING (auth.uid() = profile_id OR auth.uid() IS NULL);

-- Policy: Anonymous users can delete consents
CREATE POLICY "Anonymous users can delete consents"
  ON consents FOR DELETE
  USING (auth.uid() IS NULL);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_consents_profile_id ON consents(profile_id);
CREATE INDEX IF NOT EXISTS idx_consents_event_id ON consents(event_id);
CREATE INDEX IF NOT EXISTS idx_consents_profile_event ON consents(profile_id, event_id);

