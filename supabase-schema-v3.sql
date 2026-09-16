-- ============================================================
-- NeuroGen Suite — Supabase Schema v3
-- Adds user_id to the children table to link profiles to auth accounts
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Add user_id column referencing the auth.users table
ALTER TABLE children 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. (Optional but recommended) Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_children_user_id ON children(user_id);
