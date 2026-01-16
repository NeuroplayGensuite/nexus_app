-- ============================================
-- NeuroGen Suite - Supabase Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CHILDREN TABLE
-- Stores child profiles with interests
-- ============================================
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 4 AND age <= 18),
  grade TEXT NOT NULL DEFAULT '',
  school TEXT,
  interests TEXT[] DEFAULT ARRAY[]::TEXT[],
  previous_concerns TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'ml', 'hi')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_children_created_at ON children(created_at DESC);

-- ============================================
-- SESSIONS TABLE  
-- Stores game sessions with biometric data
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL CHECK (game_type IN ('maze', 'phonic', 'cricket', 'sync', 'star')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  coordinates JSONB DEFAULT '[]'::JSONB,
  events JSONB DEFAULT '[]'::JSONB,
  metrics JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_sessions_child_id ON sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_sessions_game_type ON sessions(game_type);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_child_game ON sessions(child_id, game_type);

-- ============================================
-- REPORTS TABLE
-- Stores generated diagnostic reports
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  session_ids UUID[] DEFAULT ARRAY[]::UUID[],
  report_data JSONB NOT NULL,
  source TEXT NOT NULL DEFAULT 'fallback' CHECK (source IN ('gemini', 'gemini-2.0-flash', 'groq', 'groq-llama-3.3-70b', 'fallback')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reports_child_id ON reports(child_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- ============================================
-- UPDATED_AT TRIGGER
-- Auto-update updated_at on children table
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_children_updated_at ON children;
CREATE TRIGGER update_children_updated_at
  BEFORE UPDATE ON children
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Enable for production security
-- ============================================

-- Enable RLS on all tables
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- For development: Allow all operations with anon key
-- In production, you'd want more restrictive policies

-- Children policies
CREATE POLICY "Enable read access for all users" ON children
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON children
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON children
  FOR UPDATE USING (true);

-- Sessions policies  
CREATE POLICY "Enable read access for all users" ON sessions
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON sessions
  FOR INSERT WITH CHECK (true);

-- Reports policies
CREATE POLICY "Enable read access for all users" ON reports
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON reports
  FOR INSERT WITH CHECK (true);

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Insert a sample child profile
-- INSERT INTO children (name, age, grade, interests, preferred_language)
-- VALUES ('Test Child', 8, 'Class 3', ARRAY['pokemon', 'cricket'], 'en');

-- ============================================
-- USEFUL QUERIES
-- ============================================

-- Get all sessions for a child with game completion status
-- SELECT 
--   c.name,
--   c.age,
--   array_agg(DISTINCT s.game_type) as completed_games,
--   COUNT(DISTINCT s.game_type) as games_completed
-- FROM children c
-- LEFT JOIN sessions s ON c.id = s.child_id
-- GROUP BY c.id;

-- Get latest session per game type for a child
-- SELECT DISTINCT ON (game_type) *
-- FROM sessions
-- WHERE child_id = 'YOUR_CHILD_ID'
-- ORDER BY game_type, created_at DESC;
