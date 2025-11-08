-- Enable Realtime for notes and participants tables
ALTER PUBLICATION supabase_realtime ADD TABLE notes;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;

-- Note: Realtime is enabled by default for tables with RLS enabled
-- This ensures the tables are included in the Realtime publication

