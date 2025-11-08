-- Add is_favorited column to notes table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_favorited BOOLEAN DEFAULT false;

-- Create index for faster queries on favorited notes
CREATE INDEX IF NOT EXISTS idx_notes_is_favorited ON notes(is_favorited);

-- Allow hosts to update favorited status of notes in their events
DROP POLICY IF EXISTS "Hosts can update notes in their events" ON notes;

CREATE POLICY "Hosts can update notes in their events"
  ON notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = notes.event_id
      AND events.host_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = notes.event_id
      AND events.host_id = auth.uid()
    )
  );

