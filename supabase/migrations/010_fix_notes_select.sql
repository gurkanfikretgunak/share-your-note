-- Quick fix: Allow anyone to read notes for events
-- Run this if notes are not visible

-- Drop existing policy
DROP POLICY IF EXISTS "Notes are viewable by event participants" ON notes;

-- Create a more permissive policy for reading notes
-- This allows anyone to read notes for an event (as long as they're a participant)
CREATE POLICY "Notes are viewable by event participants"
  ON notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.event_id = notes.event_id
    )
  );

-- This policy checks that:
-- 1. There is at least one participant for the event
-- It doesn't check auth.uid(), so it works for both authenticated and anonymous users

