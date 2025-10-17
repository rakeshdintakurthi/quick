-- AI Code Editor Database Schema
-- Overview: Database schema for AI-powered code editor with contextual assistance
-- Tracks user sessions, AI suggestions, code snippets, performance metrics, and user feedback

-- Table 1: sessions
-- Stores user coding sessions with metadata
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  language text NOT NULL,
  project_name text,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  total_suggestions integer DEFAULT 0,
  accepted_suggestions integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Table 2: suggestions
-- Stores individual AI suggestions with context and user actions
CREATE TABLE IF NOT EXISTS suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  suggestion_type text NOT NULL CHECK (suggestion_type IN ('completion', 'optimization', 'debug', 'docstring')),
  original_code text NOT NULL,
  suggested_code text NOT NULL,
  explanation text NOT NULL,
  issue_detected text,
  language text NOT NULL,
  line_number integer,
  accepted boolean DEFAULT false,
  latency_ms integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Table 3: code_context
-- Stores code snippets and file context for AI analysis
CREATE TABLE IF NOT EXISTS code_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  file_path text,
  code_content text NOT NULL,
  language text NOT NULL,
  dependencies jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table 4: metrics
-- Aggregated performance metrics for dashboard
CREATE TABLE IF NOT EXISTS metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  language text NOT NULL,
  total_suggestions integer DEFAULT 0,
  accepted_suggestions integer DEFAULT 0,
  avg_latency_ms integer DEFAULT 0,
  optimization_count integer DEFAULT 0,
  debug_count integer DEFAULT 0,
  docstring_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(date, language)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_language ON sessions(language);
CREATE INDEX IF NOT EXISTS idx_suggestions_session_id ON suggestions(session_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_type ON suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_suggestions_created_at ON suggestions(created_at);
CREATE INDEX IF NOT EXISTS idx_code_context_session_id ON code_context(session_id);
CREATE INDEX IF NOT EXISTS idx_metrics_date ON metrics(date);
CREATE INDEX IF NOT EXISTS idx_metrics_language ON metrics(language);

-- Enable Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Public access for demo - can be restricted later)
CREATE POLICY "Public access to sessions"
  ON sessions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public access to suggestions"
  ON suggestions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public access to code_context"
  ON code_context FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public access to metrics"
  ON metrics FOR ALL
  USING (true)
  WITH CHECK (true);