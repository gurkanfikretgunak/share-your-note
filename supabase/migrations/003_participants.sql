-- Create participant_role enum
CREATE TYPE participant_role AS ENUM ('host', 'attendee');

-- Create participants table
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role participant_role NOT NULL DEFAULT 'attendee',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, profile_id)
);

-- Enable RLS
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read participants
CREATE POLICY "Participants are viewable by everyone"
  ON participants FOR SELECT
  USING (true);

-- Policy: Users can insert themselves as participants
CREATE POLICY "Users can insert themselves as participants"
  ON participants FOR INSERT
  WITH CHECK (auth.uid() = profile_id OR auth.uid() IS NULL);

-- Policy: Hosts can insert participants for their events
CREATE POLICY "Hosts can insert participants for their events"
  ON participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = participants.event_id
      AND events.host_id = auth.uid()
    )
  );

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_participants_event_id ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_profile_id ON participants(profile_id);

