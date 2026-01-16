-- Migration to update reports source constraint
-- Run this in Supabase SQL Editor

-- Drop the old constraint
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_source_check;

-- Add new constraint with Groq sources
ALTER TABLE reports ADD CONSTRAINT reports_source_check 
  CHECK (source IN ('gemini', 'gemini-2.0-flash', 'groq', 'groq-llama-3.3-70b', 'fallback'));

-- Verify the change
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'reports'::regclass AND conname = 'reports_source_check';
