-- ============================================================
-- NeuroGen Suite — Supabase Schema v2
-- Safe to run against existing DB: uses IF NOT EXISTS + ADD COLUMN IF NOT EXISTS
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Ensure UUID extension is present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: children
-- Child profiles (unchanged from v1, keep as-is)
-- ============================================================
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

CREATE INDEX IF NOT EXISTS idx_children_created_at ON children(created_at DESC);

-- ============================================================
-- TABLE: assessments  (NEW in v2)
-- One row per child visit, groups all game sessions together.
-- A child can have multiple assessments over time.
-- ============================================================
CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  -- Array of game types that have been completed in this assessment
  games_completed TEXT[] DEFAULT ARRAY[]::TEXT[],
  -- 'in_progress' | 'completed' | 'abandoned'
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessments_child_id ON assessments(child_id);
CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON assessments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);

-- ============================================================
-- TABLE: sessions
-- Game session results.
-- v2 additions: assessment_id FK, visual_engagement JSONB,
--               subitizing_measurement_status
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL CHECK (game_type IN ('maze', 'phonic', 'cricket', 'sync', 'star', 'dot')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  -- Raw movement/interaction data (can be large; nullable for lightweight storage)
  coordinates JSONB DEFAULT '[]'::JSONB,
  events JSONB DEFAULT '[]'::JSONB,
  -- Game-specific biometric metrics blob
  metrics JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- v2 additions — safe ALTER (no-op if column already exists)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS
  assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL;

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS
  -- Derived CV engagement metrics; null if camera was unavailable (NOT zeros)
  visual_engagement JSONB DEFAULT NULL;

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS
  -- For cricket/subitizing: 'measured' | 'task_failure' | 'not_run' | 'not_applicable'
  subitizing_measurement_status TEXT
  CHECK (subitizing_measurement_status IN ('measured', 'task_failure', 'not_run', 'not_applicable'));

CREATE INDEX IF NOT EXISTS idx_sessions_child_id ON sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_sessions_game_type ON sessions(game_type);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_child_game ON sessions(child_id, game_type);
CREATE INDEX IF NOT EXISTS idx_sessions_assessment_id ON sessions(assessment_id);

-- ============================================================
-- TABLE: ml_predictions  (NEW in v2)
-- One row per condition per assessment.
-- Stores the real .pkl LogisticRegression model output.
-- DO NOT store fake/rule-based classifier outputs here.
-- ============================================================
CREATE TABLE IF NOT EXISTS ml_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  -- The condition being assessed
  condition TEXT NOT NULL CHECK (condition IN ('dyslexia', 'dysgraphia', 'dyscalculia', 'dyspraxia', 'nvld')),
  -- Raw class index: 0 = low_risk, 1 = at_risk
  prediction INTEGER NOT NULL CHECK (prediction IN (0, 1)),
  -- Human-readable label from the model
  risk_label TEXT NOT NULL CHECK (risk_label IN ('low_risk', 'at_risk')),
  -- Probability assigned to class 1 (at_risk) by predict_proba(). 0.0–1.0.
  -- This is the authoritative risk value. Do NOT alter or fabricate.
  risk_probability NUMERIC(6,4) NOT NULL CHECK (risk_probability >= 0 AND risk_probability <= 1),
  -- Full probability breakdown {"low_risk": 0.28, "at_risk": 0.72}
  probabilities JSONB NOT NULL DEFAULT '{}'::JSONB,
  -- Model identifier strings
  model_type TEXT NOT NULL DEFAULT 'LogisticRegression',
  model_file TEXT NOT NULL,
  -- Data quality metadata from the model's imputation step
  data_quality JSONB NOT NULL DEFAULT '{}'::JSONB,
  -- Subitizing status for dyscalculia: 'measured' | 'task_failure' | 'not_run'
  subitizing_measurement_status TEXT
    CHECK (subitizing_measurement_status IN ('measured', 'task_failure', 'not_run')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_predictions_assessment_id ON ml_predictions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_child_id ON ml_predictions(child_id);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_condition ON ml_predictions(condition);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_risk_label ON ml_predictions(risk_label);

-- ============================================================
-- TABLE: reports
-- v2 additions: assessment_id FK + fix source constraint
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  session_ids UUID[] DEFAULT ARRAY[]::UUID[],
  report_data JSONB NOT NULL,
  source TEXT NOT NULL DEFAULT 'fallback',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- v2: add assessment_id FK
ALTER TABLE reports ADD COLUMN IF NOT EXISTS
  assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL;

-- Fix the source CHECK constraint to include all actual values used in code
DO $$
BEGIN
  -- Drop old constraint if it exists (both old and new names)
  ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_source_check;
  ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_source_check1;
  ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_source_check2;
  -- Add updated constraint
  ALTER TABLE reports ADD CONSTRAINT reports_source_check
    CHECK (source IN (
      'gemini', 'gemini-2.0-flash',
      'groq', 'groq-llama-3.3-70b', 'openai/gpt-oss-20b',
      'local-ml', 'fallback'
    ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE INDEX IF NOT EXISTS idx_reports_child_id ON reports(child_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_assessment_id ON reports(assessment_id);

-- ============================================================
-- TRIGGER: auto-update updated_at
-- ============================================================
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
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assessments_updated_at ON assessments;
CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Research prototype: open read/write with anon key (no auth system yet)
-- In production, lock these down to authenticated users / specific roles

-- children
DROP POLICY IF EXISTS "children_select" ON children;
DROP POLICY IF EXISTS "children_insert" ON children;
DROP POLICY IF EXISTS "children_update" ON children;
CREATE POLICY "children_select" ON children FOR SELECT USING (true);
CREATE POLICY "children_insert" ON children FOR INSERT WITH CHECK (true);
CREATE POLICY "children_update" ON children FOR UPDATE USING (true);

-- assessments
DROP POLICY IF EXISTS "assessments_select" ON assessments;
DROP POLICY IF EXISTS "assessments_insert" ON assessments;
DROP POLICY IF EXISTS "assessments_update" ON assessments;
CREATE POLICY "assessments_select" ON assessments FOR SELECT USING (true);
CREATE POLICY "assessments_insert" ON assessments FOR INSERT WITH CHECK (true);
CREATE POLICY "assessments_update" ON assessments FOR UPDATE USING (true);

-- sessions
DROP POLICY IF EXISTS "sessions_select" ON sessions;
DROP POLICY IF EXISTS "sessions_insert" ON sessions;
DROP POLICY IF EXISTS "sessions_update" ON sessions;
CREATE POLICY "sessions_select" ON sessions FOR SELECT USING (true);
CREATE POLICY "sessions_insert" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "sessions_update" ON sessions FOR UPDATE USING (true);

-- ml_predictions
DROP POLICY IF EXISTS "ml_predictions_select" ON ml_predictions;
DROP POLICY IF EXISTS "ml_predictions_insert" ON ml_predictions;
CREATE POLICY "ml_predictions_select" ON ml_predictions FOR SELECT USING (true);
CREATE POLICY "ml_predictions_insert" ON ml_predictions FOR INSERT WITH CHECK (true);

-- reports
DROP POLICY IF EXISTS "reports_select" ON reports;
DROP POLICY IF EXISTS "reports_insert" ON reports;
CREATE POLICY "reports_select" ON reports FOR SELECT USING (true);
CREATE POLICY "reports_insert" ON reports FOR INSERT WITH CHECK (true);

-- ============================================================
-- VERIFY (run these SELECTs in SQL editor to confirm)
-- ============================================================
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sessions' ORDER BY ordinal_position;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ml_predictions' ORDER BY ordinal_position;
