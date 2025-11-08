-- Create note_likes table to track which participants liked which notes
CREATE TABLE IF NOT EXISTS note_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(note_id, participant_id)
);

-- Enable RLS
ALTER TABLE note_likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Note likes are viewable by everyone" ON note_likes;
DROP POLICY IF EXISTS "Participants can like notes" ON note_likes;
DROP POLICY IF EXISTS "Participants can unlike notes" ON note_likes;

-- Policy: Everyone can read note likes
CREATE POLICY "Note likes are viewable by everyone"
  ON note_likes FOR SELECT
  USING (true);

-- Policy: Participants can like notes from events they're part of
CREATE POLICY "Participants can like notes"
  ON note_likes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notes
      JOIN participants ON participants.event_id = notes.event_id
      WHERE notes.id = note_likes.note_id
      AND participants.id = note_likes.participant_id
    )
  );

-- Policy: Participants can unlike their own likes
CREATE POLICY "Participants can unlike notes"
  ON note_likes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = note_likes.participant_id
    )
  );

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_note_likes_note_id ON note_likes(note_id);
CREATE INDEX IF NOT EXISTS idx_note_likes_participant_id ON note_likes(participant_id);
CREATE INDEX IF NOT EXISTS idx_note_likes_note_participant ON note_likes(note_id, participant_id);

