-- Quick fix: Allow participants to insert notes
-- Run this if the main migration doesn't work

-- Drop existing policy
DROP POLICY IF EXISTS "Participants can insert notes" ON notes;
DROP POLICY IF EXISTS "Anyone can insert notes as participant" ON notes;

-- Create a more permissive policy for note inserts
-- This allows any participant (authenticated or anonymous) to insert notes
CREATE POLICY "Participants can insert notes"
  ON notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = notes.participant_id
      AND participants.event_id = notes.event_id
    )
  );

-- This policy checks that:
-- 1. The participant_id exists in the participants table
-- 2. The participant belongs to the same event as the note
-- It doesn't check auth.uid(), so it works for both authenticated and anonymous users

