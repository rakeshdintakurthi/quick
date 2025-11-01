-- Add shared_sessions table for remote assistance/collaboration
-- This enables Quick Assist feature where users can share their editor sessions

CREATE TABLE IF NOT EXISTS shared_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  share_code text UNIQUE NOT NULL, -- Unique code for joining (e.g., ABC123)
  host_user_id text, -- Identifier for the host
  guest_user_id text, -- Identifier for the guest (if connected)
  permissions text DEFAULT 'view' CHECK (permissions IN ('view', 'edit')), -- Guest permissions
  is_active boolean DEFAULT true,
  connected_at timestamptz,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours') -- Sessions expire after 24 hours
);

-- Index for fast lookups by share_code
CREATE INDEX IF NOT EXISTS idx_shared_sessions_share_code ON shared_sessions(share_code);
CREATE INDEX IF NOT EXISTS idx_shared_sessions_session_id ON shared_sessions(session_id);

-- Enable Realtime for shared_sessions table (if Realtime is enabled)
-- ALTER PUBLICATION supabase_realtime ADD TABLE shared_sessions;

-- Add code_sync table for real-time code synchronization
CREATE TABLE IF NOT EXISTS code_sync (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_session_id uuid REFERENCES shared_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id text NOT NULL, -- Who made the change
  code_content text NOT NULL,
  language text NOT NULL,
  cursor_line integer,
  cursor_column integer,
  action text DEFAULT 'edit' CHECK (action IN ('edit', 'cursor', 'language')),
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_code_sync_shared_session ON code_sync(shared_session_id, created_at DESC);

-- Enable Realtime for code_sync table (if Realtime is enabled)
-- ALTER PUBLICATION supabase_realtime ADD TABLE code_sync;

-- Function to generate unique share codes
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excludes confusing chars
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

