import { supabase, isSupabaseConfigured, DbChild, DbSession, DbReport } from './client';

// ============================================================================
// DEVICE ID MANAGEMENT (for anonymous users)
// ============================================================================

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';

  let deviceId = localStorage.getItem('neurogen-device-id');
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('neurogen-device-id', deviceId);
  }
  return deviceId;
}

// ============================================================================
// CHILD PROFILES
// ============================================================================

export async function createChildProfile(profile: {
  name: string;
  age: number;
  grade?: string;
  interests?: string[];
}): Promise<DbChild | null> {
  if (!supabase) {
    console.warn('Supabase not configured');
    return null;
  }

  const { data, error } = await supabase
    .from('child_profiles')
    .insert({
      name: profile.name,
      age: profile.age,
      grade: profile.grade || '',
      interests: profile.interests || [],
      preferred_language: 'en',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating child profile:', error);
    return null;
  }
  return data;
}

export async function getChildProfile(id: string): Promise<DbChild | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('child_profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching child profile:', error);
    return null;
  }
  return data;
}

export async function getAllChildProfiles(): Promise<DbChild[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('child_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching child profiles:', error);
    return [];
  }
  return data || [];
}

export async function updateChildProfile(
  id: string,
  updates: Partial<DbChild>
): Promise<DbChild | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('child_profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating child profile:', error);
    return null;
  }
  return data;
}

// ============================================================================
// GAME SESSIONS
// ============================================================================

export async function createGameSession(session: {
  child_id: string;
  game_type: DbSession['game_type'];
}): Promise<DbSession | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('game_sessions')
    .insert({
      child_id: session.child_id,
      game_type: session.game_type,
      start_time: new Date().toISOString(),
      coordinates: [],
      events: [],
      metrics: {},
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating game session:', error);
    return null;
  }
  return data;
}

export async function completeGameSession(
  id: string,
  results: {
    coordinates?: Array<{ x: number; y: number; timestamp: number }>;
    events?: Array<{ type: string; timestamp: number; data: Record<string, unknown> }>;
    metrics?: Record<string, unknown>;
  }
): Promise<DbSession | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('game_sessions')
    .update({
      end_time: new Date().toISOString(),
      coordinates: results.coordinates || [],
      events: results.events || [],
      metrics: results.metrics || {},
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error completing game session:', error);
    return null;
  }
  return data;
}

export async function getSessionsForChild(childId: string): Promise<DbSession[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('child_id', childId)
    .order('start_time', { ascending: false });

  if (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
  return data || [];
}

export async function getSession(id: string): Promise<DbSession | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching session:', error);
    return null;
  }
  return data;
}

// ============================================================================
// BIOMARKERS (stored within session metrics)
// ============================================================================

export async function saveBiomarkers(
  sessionId: string,
  biomarkers: Record<string, number | null>
): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('game_sessions')
    .update({
      metrics: biomarkers,
    })
    .eq('id', sessionId);

  if (error) {
    console.error('Error saving biomarkers:', error);
    return false;
  }
  return true;
}

// ============================================================================
// REPORTS
// ============================================================================

export async function saveReport(
  childId: string,
  sessionIds: string[],
  reportData: Record<string, unknown>,
  source: string
): Promise<DbReport | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('reports')
    .insert({
      child_id: childId,
      session_ids: sessionIds,
      report_data: reportData,
      source: source,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving report:', error);
    return null;
  }
  return data;
}

export async function getReportsForChild(childId: string): Promise<DbReport[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching reports:', error);
    return [];
  }
  return data || [];
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

  if (error) {
    if (error.code === 'PGRST116') return null; // No report found
    console.error('Error fetching report:', error);
    return null;
  }
  return data;
}

// ============================================================================
// DASHBOARD QUERIES
// ============================================================================

export async function getChildSummary(childId: string): Promise<{
  profile: DbChild | null;
  totalSessions: number;
  gamesPlayed: string[];
  latestReport: DbReport | null;
} | null> {
  const profile = await getChildProfile(childId);
  if (!profile) return null;

  const sessions = await getSessionsForChild(childId);
  const gamesPlayed = [...new Set(sessions.map(s => s.game_type))];
  const latestReport = await getLatestReport(childId);

  return {
    profile,
    totalSessions: sessions.length,
    gamesPlayed,
    latestReport,
  };
}

// ============================================================================
// SYNC UTILITIES
// ============================================================================

export async function syncLocalDataToCloud(localData: {
  childProfile: {
    name: string;
    age: number;
    grade?: string;
    interests?: string[];
  };
  sessions: Array<{
    game_type: DbSession['game_type'];
    metrics: Record<string, unknown>;
  }>;
}): Promise<{ success: boolean; childId?: string; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // 1. Create child profile
    const profile = await createChildProfile(localData.childProfile);
    if (!profile) {
      return { success: false, error: 'Failed to create profile' };
    }

    // 2. Sync sessions
    for (const session of localData.sessions) {
      const newSession = await createGameSession({
        child_id: profile.id,
        game_type: session.game_type,
      });

      if (newSession) {
        await completeGameSession(newSession.id, {
          metrics: session.metrics,
        });
      }
    }

    return { success: true, childId: profile.id };
  } catch (error) {
    console.error('Sync error:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// CONNECTION TEST
// ============================================================================

export async function testConnection(): Promise<{
  connected: boolean;
  tables: string[];
  error?: string;
}> {
  if (!supabase) {
    return { connected: false, tables: [], error: 'Supabase not configured' };
  }

  try {
    // Try to query a table
    const { error } = await supabase
      .from('child_profiles')
      .select('count')
      .limit(1);

    if (error) {
      return { connected: false, tables: [], error: error.message };
    }

    // Check which tables exist
    const tableNames = ['child_profiles', 'game_sessions', 'reports'];
    const existingTables: string[] = [];

    for (const table of tableNames) {
      const { error: tableError } = await supabase
        .from(table)
        .select('count')
        .limit(1);

      if (!tableError) {
        existingTables.push(table);
      }
    }

    return { connected: true, tables: existingTables };
  } catch (error) {
    return { connected: false, tables: [], error: String(error) };
  }
}
