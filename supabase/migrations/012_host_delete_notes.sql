-- Allow hosts to delete notes from their events
DROP POLICY IF EXISTS "Hosts can delete notes from their events" ON notes;

CREATE POLICY "Hosts can delete notes from their events"
  ON notes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = notes.event_id
      AND events.host_id = auth.uid()
    )
  );

