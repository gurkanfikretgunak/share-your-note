-- Create content_type enum (idempotent)
DO $$ BEGIN
  CREATE TYPE content_type AS ENUM ('text', 'image', 'emotion');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  content_type content_type NOT NULL,
  content_data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Notes are viewable by event participants" ON notes;
DROP POLICY IF EXISTS "Participants can insert notes" ON notes;
DROP POLICY IF EXISTS "Anyone can insert notes as participant" ON notes;

-- Policy: Everyone can read notes for events they're part of
-- This allows both authenticated and anonymous users to read notes
CREATE POLICY "Notes are viewable by event participants"
  ON notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.event_id = notes.event_id
    )
  );

-- Policy: Participants can insert notes
-- This allows both authenticated and anonymous users to insert notes
-- as long as they have a valid participant record
CREATE POLICY "Participants can insert notes"
  ON notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = notes.participant_id
      AND participants.event_id = notes.event_id
    )
  );

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notes_event_id ON notes(event_id);
CREATE INDEX IF NOT EXISTS idx_notes_participant_id ON notes(participant_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);

