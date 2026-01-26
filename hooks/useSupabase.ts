'use client';

import { useState, useEffect, useCallback } from 'react';
import * as db from '@/lib/supabase/database';
import { supabase, isSupabaseConfigured, DbChild, DbSession, DbReport } from '@/lib/supabase/client';

export function useSupabase() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [childProfiles, setChildProfiles] = useState<DbChild[]>([]);
  const [currentProfile, setCurrentProfile] = useState<DbChild | null>(null);
  const [sessions, setSessions] = useState<DbSession[]>([]);
  const [latestReport, setLatestReport] = useState<DbReport | null>(null);

  // Check if Supabase is configured on mount
  useEffect(() => {
    setIsConfigured(isSupabaseConfigured());
  }, []);

  // Load all profiles
  const loadProfiles = useCallback(async () => {
    if (!isConfigured) return;

    setIsLoading(true);
    try {
      const profiles = await db.getAllChildProfiles();
      setChildProfiles(profiles);

      // Set the most recent profile as current if none selected
      if (profiles.length > 0 && !currentProfile) {
        setCurrentProfile(profiles[0]);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured, currentProfile]);

  // Load data for current profile
  const loadProfileData = useCallback(async () => {
    if (!isConfigured || !currentProfile) return;

    setIsLoading(true);
    try {
      const [sessionsData, reportData] = await Promise.all([
        db.getSessionsForChild(currentProfile.id),
        db.getLatestReport(currentProfile.id),
      ]);
      setSessions(sessionsData);
      setLatestReport(reportData);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured, currentProfile]);

  // Load on mount and when profile changes
  useEffect(() => {
    if (isConfigured) {
      loadProfiles();
    }
  }, [isConfigured, loadProfiles]);

  useEffect(() => {
    if (currentProfile) {
      loadProfileData();
    }
  }, [currentProfile, loadProfileData]);

  // Create new profile
  const createProfile = useCallback(async (data: {
    name: string;
    age: number;
    grade?: string;
    interests?: string[];
  }) => {
    if (!isConfigured) {
      setError('Supabase not configured');
      return null;
    }

    setIsLoading(true);
    setError(null);
    try {
      const profile = await db.createChildProfile(data);
      if (profile) {
        setChildProfiles(prev => [profile, ...prev]);
        setCurrentProfile(profile);
        return profile;
      }
      setError('Failed to create profile');
      return null;
    } catch (err) {
      setError(String(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured]);

  // Select a profile
  const selectProfile = useCallback((profile: DbChild) => {
    setCurrentProfile(profile);
  }, []);

  // Start a game session
  const startGameSession = useCallback(async (gameType: DbSession['game_type']) => {
    if (!isConfigured || !currentProfile) {
      setError('No profile selected or Supabase not configured');
      return null;
    }

    try {
      const session = await db.createGameSession({
        child_id: currentProfile.id,
        game_type: gameType,
      });
      if (session) {
        setSessions(prev => [session, ...prev]);
      }
      return session;
    } catch (err) {
      setError(String(err));
      return null;
    }
  }, [isConfigured, currentProfile]);

  // End a game session
  const endGameSession = useCallback(async (
    sessionId: string,
    results: {
      coordinates?: Array<{ x: number; y: number; timestamp: number }>;
      events?: Array<{ type: string; timestamp: number; data: Record<string, unknown> }>;
      metrics?: Record<string, unknown>;
    }
  ) => {
    if (!isConfigured) return null;

    try {
      const session = await db.completeGameSession(sessionId, results);

      // Refresh sessions
      if (currentProfile) {
        const updated = await db.getSessionsForChild(currentProfile.id);
        setSessions(updated);
      }

      return session;
    } catch (err) {
      setError(String(err));
      return null;
    }
  }, [isConfigured, currentProfile]);

  // Save a report
  const saveReport = useCallback(async (
    sessionIds: string[],
    reportData: Record<string, unknown>,
    source: string
  ) => {
    if (!isConfigured || !currentProfile) return null;

    try {
      const report = await db.saveReport(currentProfile.id, sessionIds, reportData, source);
      if (report) {
        setLatestReport(report);
      }
      return report;
    } catch (err) {
      setError(String(err));
      return null;
    }
  }, [isConfigured, currentProfile]);

  // Test connection
  const testConnection = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await db.testConnection();
      if (!result.connected) {
        setError(result.error || 'Connection failed');
      }
      return result;
    } catch (err) {
      setError(String(err));
      return { connected: false, tables: [], error: String(err) };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync local data to cloud
  const syncToCloud = useCallback(async (localData: Parameters<typeof db.syncLocalDataToCloud>[0]) => {
    if (!isConfigured) {
      return { success: false, error: 'Supabase not configured' };
    }

    setIsLoading(true);
    try {
      const result = await db.syncLocalDataToCloud(localData);
      if (result.success) {
        await loadProfiles(); // Refresh profiles after sync
      }
      return result;
    } catch (err) {
      return { success: false, error: String(err) };
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured, loadProfiles]);

  return {
    // State
    isLoading,
    error,
    isConfigured,
    childProfiles,
    currentProfile,
    sessions,
    latestReport,

    // Actions
    loadProfiles,
    loadProfileData,
    createProfile,
    selectProfile,
    startGameSession,
    endGameSession,
    saveReport,
    testConnection,
    syncToCloud,

    // Utilities
    clearError: () => setError(null),

    // Direct client access (for advanced use)
    supabase,
  };
}
