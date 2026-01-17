import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ChildProfile, GameSession, BiometricMetrics, DiagnosticReport } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create Supabase client (will be null if not configured)
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// Check if Supabase is configured
export const isSupabaseConfigured = () => Boolean(supabase);

// ============================================
// DATABASE TYPES (matches Supabase schema)
// ============================================

export interface DbChild {
  id: string;
  name: string;
  age: number;
  grade: string;
  school: string | null;
  interests: string[];
  previous_concerns: string | null;
  preferred_language: 'en' | 'ml' | 'hi';
  created_at: string;
  updated_at: string;
}

export interface DbSession {
  id: string;
  child_id: string;
  game_type: 'maze' | 'phonic' | 'cricket' | 'sync' | 'star' | 'dot';
  start_time: string;
  end_time: string | null;
  coordinates: Array<{ x: number; y: number; timestamp: number }>;
  events: Array<{ type: string; timestamp: number; data: Record<string, unknown> }>;
  metrics: BiometricMetrics;
  created_at: string;
}

export interface DbReport {
  id: string;
  child_id: string;
  session_ids: string[];
  report_data: DiagnosticReport;
  source: 'gemini' | 'fallback';
  created_at: string;
}

// ============================================
// CHILD PROFILE FUNCTIONS
// ============================================

export async function saveChildProfile(profile: ChildProfile): Promise<DbChild | null> {
  if (!supabase) {
    console.warn('Supabase not configured, skipping save');
    return null;
  }

  const dbChild: Omit<DbChild, 'created_at' | 'updated_at'> = {
    id: profile.id,
    name: profile.name,
    age: profile.age,
    grade: profile.grade,
    school: profile.school || null,
    interests: profile.interests,
    previous_concerns: profile.previousConcerns || null,
    preferred_language: profile.preferredLanguage,
  };

  const { data, error } = await supabase
    .from('children')
    .upsert(dbChild, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.warn('⚠️ Cloud sync failed (optional):', error.message || error.code || 'Unknown error');
    console.info('💾 Profile saved locally - no data loss');
    return null;
  }

  console.log('☁️ Cloud synced: Profile');
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

  const dbChild = data as DbChild;

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

export async function getAllChildren(): Promise<ChildProfile[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('children')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return (data as DbChild[]).map(dbChild => ({
    id: dbChild.id,
    name: dbChild.name,
    age: dbChild.age,
    grade: dbChild.grade,
    school: dbChild.school || undefined,
    interests: dbChild.interests,
    previousConcerns: dbChild.previous_concerns || undefined,
    preferredLanguage: dbChild.preferred_language,
    createdAt: new Date(dbChild.created_at).getTime(),
  }));
}

// ============================================
// SESSION FUNCTIONS
// ============================================

export async function saveGameSession(session: GameSession, childId: string): Promise<DbSession | null> {
  if (!supabase) {
    console.warn('Supabase not configured, skipping session save');
    return null;
  }

  const dbSession: Omit<DbSession, 'created_at'> = {
    id: session.id,
    child_id: childId,
    game_type: session.gameType,
    start_time: new Date(session.startTime).toISOString(),
    end_time: session.endTime ? new Date(session.endTime).toISOString() : null,
    coordinates: session.coordinates,
    events: session.events,
    metrics: session.metrics,
  };

  const { data, error } = await supabase
    .from('sessions')
    .insert(dbSession)
    .select()
    .single();

  if (error) {
    console.warn('⚠️ Cloud sync failed (optional):', error.message || error.code || 'Unknown error');
    console.info('💾 Session saved locally - no data loss');
    return null;
  }

  console.log('☁️ Cloud synced:', session.gameType);
  return data as DbSession;
}

export async function getSessionsByChild(childId: string): Promise<GameSession[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return (data as DbSession[]).map(dbSession => ({
    id: dbSession.id,
    gameType: dbSession.game_type,
    startTime: new Date(dbSession.start_time).getTime(),
    endTime: dbSession.end_time ? new Date(dbSession.end_time).getTime() : undefined,
    coordinates: dbSession.coordinates,
    events: dbSession.events,
    metrics: dbSession.metrics,
  }));
}

export async function getLatestSessionsForAllGames(childId: string): Promise<GameSession[]> {
  if (!supabase) return [];

  const gameTypes = ['maze', 'phonic', 'cricket', 'sync', 'star'];
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
      const dbSession = data[0] as DbSession;
      sessions.push({
        id: dbSession.id,
        gameType: dbSession.game_type,
        startTime: new Date(dbSession.start_time).getTime(),
        endTime: dbSession.end_time ? new Date(dbSession.end_time).getTime() : undefined,
        coordinates: dbSession.coordinates,
        events: dbSession.events,
        metrics: dbSession.metrics,
      });
    }
  }

  return sessions;
}

// ============================================
// REPORT FUNCTIONS
// ============================================

export async function saveReport(
  childId: string,
  sessionIds: string[],
  reportData: DiagnosticReport,
  source: 'gemini' | 'fallback'
): Promise<DbReport | null> {
  if (!supabase) {
    console.warn('Supabase not configured, skipping report save');
    return null;
  }

  const dbReport: Omit<DbReport, 'created_at'> = {
    id: crypto.randomUUID(),
    child_id: childId,
    session_ids: sessionIds,
    report_data: reportData,
    source,
  };

  const { data, error } = await supabase
    .from('reports')
    .insert(dbReport)
    .select()
    .single();

  if (error) {
    console.error('Error saving report:', error);
    return null;
  }

  return data as DbReport;
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

// ============================================
// ANALYTICS FUNCTIONS
// ============================================

export async function getChildStats(childId: string) {
  if (!supabase) return null;

  const sessions = await getSessionsByChild(childId);
  const reports = await getReportsByChild(childId);

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
    gameStats,
    completedGames,
    allGamesComplete: completedGames === 5,
  };
}
