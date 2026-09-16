'use client';

import { useState, useEffect, useCallback } from 'react';
import { testConnection } from '@/lib/supabase/database';
import {
  supabase,
  isSupabaseConfigured,
  DbChild,
  DbSession,
  DbReport,
  saveChildProfile,
  getAllChildren,
  getSessionsByChild,
  getLatestReport,
  saveReport,
} from '@/lib/supabase/client';
import { ChildProfile } from '@/types';

export function useSupabase() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [childProfiles, setChildProfiles] = useState<ChildProfile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<ChildProfile | null>(null);
  const [sessions, setSessions] = useState<DbSession[]>([]);
  const [latestReport, setLatestReportState] = useState<DbReport | null>(null);

  useEffect(() => {
    setIsConfigured(isSupabaseConfigured());
  }, []);

  const loadProfiles = useCallback(async () => {
    if (!isConfigured) return;
    setIsLoading(true);
    try {
      const profiles = await getAllChildren();
      setChildProfiles(profiles);
      if (profiles.length > 0 && !currentProfile) {
        setCurrentProfile(profiles[0]);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured, currentProfile]);

  const loadProfileData = useCallback(async () => {
    if (!isConfigured || !currentProfile) return;
    setIsLoading(true);
    try {
      const [sessionsData, reportData] = await Promise.all([
        getSessionsByChild(currentProfile.id),
        getLatestReport(currentProfile.id),
      ]);
      // Map GameSession[] → DbSession[] shape for display (lightweight cast)
      setSessions(sessionsData as unknown as DbSession[]);
      setLatestReportState(reportData);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured, currentProfile]);

  useEffect(() => {
    if (isConfigured) loadProfiles();
  }, [isConfigured, loadProfiles]);

  useEffect(() => {
    if (currentProfile) loadProfileData();
  }, [currentProfile, loadProfileData]);

  const createProfile = useCallback(async (data: {
    name: string;
    age: number;
    grade?: string;
    interests?: string[];
  }) => {
    if (!isConfigured) { setError('Supabase not configured'); return null; }
    setIsLoading(true);
    setError(null);
    try {
      const profile: ChildProfile = {
        id: crypto.randomUUID(),
        name: data.name,
        age: data.age,
        grade: data.grade || '',
        interests: data.interests || [],
        preferredLanguage: 'en',
        createdAt: Date.now(),
      };
      const saved = await saveChildProfile(profile);
      if (saved) {
        await loadProfiles();
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
  }, [isConfigured, loadProfiles]);

  const selectProfile = useCallback((profile: ChildProfile) => {
    setCurrentProfile(profile);
  }, []);

  // startGameSession / endGameSession are now handled by the Zustand session store.
  // Kept here as stubs so any existing callers don't break.
  const startGameSession = useCallback(async (_gameType: DbSession['game_type']) => {
    console.warn('[useSupabase] startGameSession: use Zustand session store instead');
    return null;
  }, []);

  const endGameSession = useCallback(async (_sessionId: string, _results: unknown) => {
    console.warn('[useSupabase] endGameSession: use Zustand session store instead');
    return null;
  }, []);

  const saveReportHook = useCallback(async (
    sessionIds: string[],
    reportData: Record<string, unknown>,
    source: string
  ) => {
    if (!isConfigured || !currentProfile) return null;
    try {
      const report = await saveReport(currentProfile.id, sessionIds, reportData, source);
      if (report) setLatestReportState(report);
      return report;
    } catch (err) {
      setError(String(err));
      return null;
    }
  }, [isConfigured, currentProfile]);

  const testConn = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await testConnection();
      if (!result.connected) setError(result.error || 'Connection failed');
      return result;
    } catch (err) {
      setError(String(err));
      return { connected: false, tables: [], error: String(err) };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // syncToCloud replaced by Zustand store's syncToSupabase()
  const syncToCloud = useCallback(async (_localData: unknown) => {
    console.warn('[useSupabase] syncToCloud: use useSessionStore().syncToSupabase() instead');
    return { success: false, error: 'Use useSessionStore().syncToSupabase()' };
  }, []);

  return {
    isLoading,
    error,
    isConfigured,
    childProfiles,
    currentProfile,
    sessions,
    latestReport,
    loadProfiles,
    loadProfileData,
    createProfile,
    selectProfile,
    startGameSession,
    endGameSession,
    saveReport: saveReportHook,
    testConnection: testConn,
    syncToCloud,
    clearError: () => setError(null),
    supabase,
  };
}
