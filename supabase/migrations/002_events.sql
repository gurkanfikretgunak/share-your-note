-- Create event_mode enum (idempotent)
DO $$ BEGIN
  CREATE TYPE event_mode AS ENUM ('general', 'birthday', 'party');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create event_status enum (idempotent)
DO $$ BEGIN
  CREATE TYPE event_status AS ENUM ('pending', 'active', 'finished');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_code TEXT UNIQUE NOT NULL,
  event_mode event_mode NOT NULL DEFAULT 'general',
  status event_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Hosts can insert their own events" ON events;
DROP POLICY IF EXISTS "Hosts can update their own events" ON events;

-- Policy: Everyone can read events
CREATE POLICY "Events are viewable by everyone"
  ON events FOR SELECT
  USING (true);

-- Policy: Hosts can insert their own events
CREATE POLICY "Hosts can insert their own events"
  ON events FOR INSERT
  WITH CHECK (auth.uid() = host_id);

-- Policy: Hosts can update their own events
CREATE POLICY "Hosts can update their own events"
  ON events FOR UPDATE
  USING (auth.uid() = host_id);

-- Function to generate unique 6-character event code
CREATE OR REPLACE FUNCTION generate_event_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  code TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  
  -- Check if code already exists
  WHILE EXISTS (SELECT 1 FROM events WHERE event_code = code) LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Index for faster event code lookups
CREATE INDEX IF NOT EXISTS idx_events_event_code ON events(event_code);
CREATE INDEX IF NOT EXISTS idx_events_host_id ON events(host_id);
