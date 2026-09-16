/**
 * NeuroGen Suite — Supabase Client (v2)
 *
 * Single source of truth for all Supabase CRUD operations.
 * The database.ts file is kept only for legacy testConnection() and getDeviceId().
 *
 * Architecture rule:
 *   Supabase = persistent source of truth
 *   Zustand  = temporary client/UI state
 *   .pkl     = ML inference (never done here)
 *   clinical JSON = evidence context (never stored here)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ChildProfile, GameSession, BiometricMetrics, DiagnosticReport } from '@/types';
import type { SessionVisualEngagement } from '@/lib/attention/engagement-types';
import type { PKLPrediction } from '@/lib/ml/hybrid-diagnostic-engine';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create Supabase client (null if not configured — all functions degrade gracefully)
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const isSupabaseConfigured = () => Boolean(supabase);

// ============================================================
// DATABASE TYPES (match supabase-schema-v2.sql)
// ============================================================

export interface DbChild {
  id: string;
  name: string;
  age: number;
  grade: string;
  school: string | null;
  interests: string[];
  previous_concerns: string | null;
  preferred_language: 'en' | 'ml' | 'hi';
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DbAssessment {
  id: string;
  child_id: string;
  started_at: string;
  completed_at: string | null;
  games_completed: string[];
  /** 'in_progress' | 'completed' | 'abandoned' */
  status: 'in_progress' | 'completed' | 'abandoned';
  created_at: string;
  updated_at: string;
}

export interface DbSession {
  id: string;
  child_id: string;
  assessment_id: string | null;
  game_type: 'maze' | 'phonic' | 'cricket' | 'sync' | 'star' | 'dot';
  start_time: string;
  end_time: string | null;
  coordinates: Array<{ x: number; y: number; timestamp: number }>;
  events: Array<{ type: string; timestamp: number; data: Record<string, unknown> }>;
  metrics: BiometricMetrics;
  /** CV-derived engagement metrics — null means camera was unavailable (not zeros) */
  visual_engagement: SessionVisualEngagement | null;
  /** For cricket/dyscalculia sessions only */
  subitizing_measurement_status: 'measured' | 'task_failure' | 'not_run' | 'not_applicable' | null;
  created_at: string;
}

export interface DbMLPrediction {
  id: string;
  assessment_id: string | null;
  child_id: string;
  condition: string;
  prediction: number;
  risk_label: string;
  risk_probability: number;
  probabilities: { low_risk: number; at_risk: number };
  model_type: string;
  model_file: string;
  data_quality: {
    cameraAvailable: boolean;
    numericFeaturesProvided: number;
    numericFeaturesTotal: number;
    assessmentCompleteness: number;
    missingFeatures: string[];
  };
  subitizing_measurement_status: string | null;
  created_at: string;
}

export interface DbReport {
  id: string;
  child_id: string;
  assessment_id: string | null;
  session_ids: string[];
  report_data: Record<string, unknown>;
  source: string;
  created_at: string;
}

// ============================================================
// CHILD PROFILE FUNCTIONS
// ============================================================

export async function saveChildProfile(profile: ChildProfile): Promise<DbChild | null> {
  if (!supabase) {
    console.warn('[Supabase] Not configured — profile saved locally only');
    return null;
  }

  // Get current user to link profile
  const { data: { user } } = await supabase.auth.getUser();

  const dbChild = {
    id: profile.id,
    name: profile.name,
    age: profile.age,
    grade: profile.grade,
    school: profile.school || null,
    interests: profile.interests,
    previous_concerns: profile.previousConcerns || null,
    preferred_language: profile.preferredLanguage,
    user_id: user?.id, // Link to auth user
  };

  const { data, error } = await supabase
    .from('children')
    .upsert(dbChild, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.warn('[Supabase] saveChildProfile failed:', error.message || error.code);
    return null;
  }

  console.log('[Supabase] Profile synced:', profile.name);
  return data as DbChild;
}

export async function getChildProfile(childId: string): Promise<ChildProfile | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('id', childId)
    .single();

  if (error || !data) return null;
  return dbChildToProfile(data as DbChild);
}

export async function getAllChildren(): Promise<ChildProfile[]> {
  if (!supabase) return [];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return []; // Only fetch for logged-in users

  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data.map(dbChildToProfile);
}

function dbChildToProfile(dbChild: DbChild): ChildProfile {
  return {
    id: dbChild.id,
    name: dbChild.name,
    age: dbChild.age,
    grade: dbChild.grade,
    school: dbChild.school || undefined,
    interests: dbChild.interests,
    previousConcerns: dbChild.previous_concerns || undefined,
    preferredLanguage: dbChild.preferred_language,
    createdAt: new Date(dbChild.created_at).getTime(),
  };
}

// ============================================================
// ASSESSMENT FUNCTIONS (NEW in v2)
// ============================================================

/**
 * Create a new assessment row when the child starts their first game.
 * Returns the assessment ID to be stored in Zustand and passed to child functions.
 */
export async function createAssessment(childId: string): Promise<DbAssessment | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('assessments')
    .insert({
      child_id: childId,
      started_at: new Date().toISOString(),
      games_completed: [],
      status: 'in_progress',
    })
    .select()
    .single();

  if (error) {
    console.warn('[Supabase] createAssessment failed:', error.message || error.code);
    return null;
  }

  console.log('[Supabase] Assessment created:', data.id);
  return data as DbAssessment;
}

/**
 * Mark a game as completed within an assessment.
 * Call this after each game session ends.
 */
export async function markGameCompleted(
  assessmentId: string,
  gameType: string
): Promise<void> {
  if (!supabase) return;

  // Use Postgres array append to avoid race conditions
  const { error } = await supabase.rpc('append_game_to_assessment', {
    p_assessment_id: assessmentId,
    p_game_type: gameType,
  });

  if (error) {
    // Fallback: read then write (safe for sequential game completion)
    const { data: existing } = await supabase
      .from('assessments')
      .select('games_completed')
      .eq('id', assessmentId)
      .single();

    const current: string[] = (existing as { games_completed: string[] })?.games_completed || [];
    if (!current.includes(gameType)) {
      await supabase
        .from('assessments')
        .update({ games_completed: [...current, gameType], updated_at: new Date().toISOString() })
        .eq('id', assessmentId);
    }
  }
}

/**
 * Mark an assessment as completed (all relevant games done).
 */
export async function completeAssessment(assessmentId: string): Promise<void> {
  if (!supabase) return;

  await supabase
    .from('assessments')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', assessmentId);

  console.log('[Supabase] Assessment completed:', assessmentId);
}

export async function getAssessmentsByChild(childId: string): Promise<DbAssessment[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as DbAssessment[];
}

export async function getLatestAssessment(childId: string): Promise<DbAssessment | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as DbAssessment;
}

// ============================================================
// SESSION FUNCTIONS
// ============================================================

/**
 * Save a completed game session.
 * Uses UPSERT (not insert) to handle retries safely.
 * Extracts visual_engagement and subitizingMeasurementStatus separately.
 */
export async function saveGameSession(
  session: GameSession,
  childId: string,
  assessmentId?: string | null
): Promise<DbSession | null> {
  if (!supabase) {
    console.warn('[Supabase] Not configured — session saved locally only');
    return null;
  }

  // Extract subitizing status from metrics if present
  const subitizingStatus = deriveSubitizingStatus(session);

  // Build the DB row — visual_engagement stored separately from metrics blob
  const dbSession = {
    id: session.id,
    child_id: childId,
    assessment_id: assessmentId || null,
    game_type: session.gameType,
    start_time: new Date(session.startTime).toISOString(),
    end_time: session.endTime ? new Date(session.endTime).toISOString() : null,
    // Omit coordinates from DB by default (large, rarely queried).
    // Change to session.coordinates if you need movement replay.
    coordinates: [],
    events: session.events,
    metrics: session.metrics,
    // Store engagement as separate nullable JSONB — null means camera was unavailable
    visual_engagement: session.visualEngagement ?? null,
    subitizing_measurement_status: subitizingStatus,
  };

  const { data, error } = await supabase
    .from('sessions')
    .upsert(dbSession, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.warn('[Supabase] saveGameSession failed:', error.message || error.code);
    return null;
  }

  console.log(`[Supabase] Session synced: ${session.gameType}`);
  return data as DbSession;
}

/**
 * Derive subitizing measurement status from session metrics.
 * subitizingThreshold = 0 is NOT automatically treated as failure.
 * The game sets subitizingFailed = true explicitly when the task was not completed.
 */
function deriveSubitizingStatus(
  session: GameSession
): DbSession['subitizing_measurement_status'] {
  if (session.gameType !== 'cricket') return 'not_applicable';

  const { subitizingThreshold, subitizingFailed } = session.metrics;

  // Game explicitly marked the task as failed (e.g. child never completed a trial)
  if (subitizingFailed === true) return 'task_failure';

  // A numeric threshold was recorded (including 0 — which is a valid measured value)
  if (typeof subitizingThreshold === 'number') return 'measured';

  // Cricket game ran but subitizing section was never reached
  return 'not_run';
}

export async function getSessionsByChild(childId: string): Promise<GameSession[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return (data as DbSession[]).map(dbSessionToGameSession);
}

export async function getLatestSessionsForAllGames(childId: string): Promise<GameSession[]> {
  if (!supabase) return [];

  const gameTypes = ['maze', 'phonic', 'cricket', 'sync', 'star'] as const;
  const sessions: GameSession[] = [];

  for (const gameType of gameTypes) {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('child_id', childId)
      .eq('game_type', gameType)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      sessions.push(dbSessionToGameSession(data[0] as DbSession));
    }
  }

  return sessions;
}

/** Retrieve sessions belonging to a specific assessment */
export async function getSessionsByAssessment(assessmentId: string): Promise<GameSession[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('assessment_id', assessmentId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return (data as DbSession[]).map(dbSessionToGameSession);
}

function dbSessionToGameSession(dbSession: DbSession): GameSession {
  return {
    id: dbSession.id,
    gameType: dbSession.game_type,
    startTime: new Date(dbSession.start_time).getTime(),
    endTime: dbSession.end_time ? new Date(dbSession.end_time).getTime() : undefined,
    coordinates: dbSession.coordinates,
    events: dbSession.events,
    metrics: dbSession.metrics,
    visualEngagement: dbSession.visual_engagement ?? undefined,
  };
}

// ============================================================
// ML PREDICTION FUNCTIONS (NEW in v2)
// ============================================================

/**
 * Persist the real .pkl model outputs from the hybrid engine.
 * Called after hybridEngine.diagnose() returns predictions.
 *
 * IMPORTANT:
 *  - risk_probability is the authoritative source — do NOT modify or fabricate
 *  - subitizing_measurement_status is passed separately to preserve meaning of threshold=0
 */
export async function saveMLPredictions(
  predictions: PKLPrediction[],
  childId: string,
  assessmentId?: string | null
): Promise<boolean> {
  if (!supabase || predictions.length === 0) return false;

  const rows = predictions.map((p) => ({
    assessment_id: assessmentId || null,
    child_id: childId,
    condition: p.condition,
    prediction: p.prediction,
    risk_label: p.riskLabel,
    risk_probability: p.riskProbability,
    probabilities: p.probabilities,
    model_type: p.modelType,
    model_file: p.modelFile,
    data_quality: p.dataQuality,
    subitizing_measurement_status: p.subitizingMeasurementStatus ?? null,
  }));

  const { error } = await supabase
    .from('ml_predictions')
    .insert(rows);

  if (error) {
    console.warn('[Supabase] saveMLPredictions failed:', error.message || error.code);
    return false;
  }

  console.log(`[Supabase] ML predictions saved: ${predictions.map(p => p.condition).join(', ')}`);
  return true;
}

export async function getMLPredictionsByAssessment(assessmentId: string): Promise<DbMLPrediction[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('ml_predictions')
    .select('*')
    .eq('assessment_id', assessmentId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return data as DbMLPrediction[];
}

export async function getLatestMLPredictions(childId: string): Promise<DbMLPrediction[]> {
  if (!supabase) return [];

  // Get the most recent assessment with predictions
  const latestAssessment = await getLatestAssessment(childId);
  if (!latestAssessment) return [];

  return getMLPredictionsByAssessment(latestAssessment.id);
}

// ============================================================
// REPORT FUNCTIONS
// ============================================================

export async function saveReport(
  childId: string,
  sessionIds: string[],
  reportData: Record<string, unknown>,
  source: string,
  assessmentId?: string | null
): Promise<DbReport | null> {
  if (!supabase) {
    console.warn('[Supabase] Not configured — report saved locally only');
    return null;
  }

  // Normalise source strings to match the CHECK constraint
  const normalisedSource = normaliseReportSource(source);

  const { data, error } = await supabase
    .from('reports')
    .insert({
      child_id: childId,
      assessment_id: assessmentId || null,
      session_ids: sessionIds,
      report_data: reportData,
      source: normalisedSource,
    })
    .select()
    .single();

  if (error) {
    console.warn('[Supabase] saveReport failed:', error.message || error.code);
    return null;
  }

  console.log('[Supabase] Report saved:', normalisedSource);
  return data as DbReport;
}

/** Map arbitrary source strings to the CHECK constraint values */
function normaliseReportSource(source: string): string {
  const allowed = new Set([
    'gemini', 'gemini-2.0-flash',
    'groq', 'groq-llama-3.3-70b', 'openai/gpt-oss-20b',
    'local-ml', 'fallback',
  ]);
  if (allowed.has(source)) return source;
  if (source.includes('groq')) return 'groq';
  if (source.includes('gemini')) return 'gemini';
  if (source.includes('local')) return 'local-ml';
  return 'fallback';
}

export async function getReportsByChild(childId: string): Promise<DbReport[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as DbReport[];
}

export async function getLatestReport(childId: string): Promise<DbReport | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as DbReport;
}

// ============================================================
// ANALYTICS / SUMMARY
// ============================================================

export async function getChildStats(childId: string) {
  if (!supabase) return null;

  const [sessions, reports, assessments] = await Promise.all([
    getSessionsByChild(childId),
    getReportsByChild(childId),
    getAssessmentsByChild(childId),
  ]);

  const gameStats = {
    maze: sessions.filter(s => s.gameType === 'maze').length,
    phonic: sessions.filter(s => s.gameType === 'phonic').length,
    cricket: sessions.filter(s => s.gameType === 'cricket').length,
    sync: sessions.filter(s => s.gameType === 'sync').length,
    star: sessions.filter(s => s.gameType === 'star').length,
  };

  const completedGames = Object.values(gameStats).filter(count => count > 0).length;

  return {
    totalSessions: sessions.length,
    totalReports: reports.length,
    totalAssessments: assessments.length,
    gameStats,
    completedGames,
    allGamesComplete: completedGames === 5,
  };
}
