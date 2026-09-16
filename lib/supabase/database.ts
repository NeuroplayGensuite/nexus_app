/**
 * NeuroGen Suite — Supabase Database Utilities
 *
 * This file is now a thin wrapper. All CRUD operations live in client.ts.
 * Only device ID management and connection testing remain here.
 *
 * @deprecated Do not add new functions here. Use lib/supabase/client.ts.
 */

import { supabase } from './client';

// ============================================================
// DEVICE ID (anonymous user identifier)
// ============================================================

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';

  let deviceId = localStorage.getItem('neurogen-device-id');
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('neurogen-device-id', deviceId);
  }
  return deviceId;
}

// ============================================================
// CONNECTION TEST (used by /app/test-db page)
// ============================================================

export async function testConnection(): Promise<{
  connected: boolean;
  tables: string[];
  error?: string;
}> {
  if (!supabase) {
    return { connected: false, tables: [], error: 'Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local' };
  }

  try {
    const { error } = await supabase
      .from('children')
      .select('count')
      .limit(1);

    if (error) {
      return { connected: false, tables: [], error: error.message };
    }

    // Check all v2 tables
    const tableNames = ['children', 'assessments', 'sessions', 'ml_predictions', 'reports'];
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
