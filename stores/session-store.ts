import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Coordinate, GameSession, BiometricMetrics, GameEvent, ChildProfile } from '@/types';
import { 
  saveChildProfile, 
  saveGameSession, 
  isSupabaseConfigured 
} from '@/lib/supabase/client';

// Session State with localStorage persistence
interface SessionState {
  // Child Profile
  childProfile: ChildProfile | null;
  setChildProfile: (profile: ChildProfile) => void;
  clearProfile: () => void;
  
  // Current Session
  currentSession: GameSession | null;
  allSessions: GameSession[];
  
  // Session Actions
  startSession: (gameType: GameSession['gameType']) => void;
  endSession: () => void;
  addCoordinate: (coord: Coordinate) => void;
  addEvent: (event: Omit<GameEvent, 'timestamp'>) => void;
  updateMetrics: (metrics: Partial<BiometricMetrics>) => void;
  
  // Aggregation
  getAggregatedMetrics: () => BiometricMetrics;
  getSessionsByType: (type: GameSession['gameType']) => GameSession[];
  
  // Supabase Sync
  syncToSupabase: () => Promise<void>;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  
  // Reset
  resetAllSessions: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
  childProfile: null,
  currentSession: null,
  allSessions: [],
  isSyncing: false,
  lastSyncedAt: null,

  setChildProfile: (profile) => {
    set({ childProfile: profile });
    // Auto-sync to Supabase if configured
    if (isSupabaseConfigured()) {
      saveChildProfile(profile).then(() => {
        console.log('✅ Child profile saved to Supabase');
      }).catch(console.error);
    }
  },

  startSession: (gameType) => {
    const session: GameSession = {
      id: uuidv4(),
      gameType,
      startTime: Date.now(),
      coordinates: [],
      events: [],
      metrics: {},
    };
    set({ currentSession: session });
  },

  endSession: () => {
    const { currentSession, allSessions, childProfile } = get();
    if (currentSession) {
      const completedSession: GameSession = {
        ...currentSession,
        endTime: Date.now(),
      };
      set({
        currentSession: null,
        allSessions: [...allSessions, completedSession],
      });
      
      // Auto-sync session to Supabase if configured
      if (isSupabaseConfigured() && childProfile) {
        saveGameSession(completedSession, childProfile.id).then(() => {
          console.log(`✅ Session ${completedSession.gameType} saved to Supabase`);
        }).catch(console.error);
      }
    }
  },

  addCoordinate: (coord) => {
    const { currentSession } = get();
    if (currentSession) {
      set({
        currentSession: {
          ...currentSession,
          coordinates: [...currentSession.coordinates, coord],
        },
      });
    }
  },

  addEvent: (event) => {
    const { currentSession } = get();
    if (currentSession) {
      const fullEvent: GameEvent = {
        ...event,
        timestamp: Date.now(),
      };
      set({
        currentSession: {
          ...currentSession,
          events: [...currentSession.events, fullEvent],
        },
      });
    }
  },

  updateMetrics: (metrics) => {
    const { currentSession } = get();
    if (currentSession) {
      set({
        currentSession: {
          ...currentSession,
          metrics: { ...currentSession.metrics, ...metrics },
        },
      });
    }
  },

  getAggregatedMetrics: () => {
    const { allSessions, currentSession } = get();
    const aggregated: BiometricMetrics = {};
    
    // Include current session if exists
    const sessionsToProcess = currentSession 
      ? [...allSessions, currentSession]
      : allSessions;
    
    sessionsToProcess.forEach((session) => {
      Object.entries(session.metrics).forEach(([key, value]) => {
        if (value !== undefined) {
          (aggregated as Record<string, unknown>)[key] = value;
        }
      });
    });
    
    return aggregated;
  },

  getSessionsByType: (type) => {
    const { allSessions } = get();
    return allSessions.filter((s) => s.gameType === type);
  },

  resetAllSessions: () => {
    set({ currentSession: null, allSessions: [] });
  },

  clearProfile: () => {
    set({ childProfile: null, currentSession: null, allSessions: [] });
  },
  
  syncToSupabase: async () => {
    const { childProfile, allSessions } = get();
    
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured');
      return;
    }
    
    if (!childProfile) {
      console.warn('No child profile to sync');
      return;
    }
    
    set({ isSyncing: true });
    
    try {
      // Sync child profile
      await saveChildProfile(childProfile);
      
      // Sync all sessions
      for (const session of allSessions) {
        await saveGameSession(session, childProfile.id);
      }
      
      set({ lastSyncedAt: Date.now() });
      console.log('✅ Successfully synced to Supabase');
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      set({ isSyncing: false });
    }
  },
}),
    {
      name: 'neurogen-session-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        childProfile: state.childProfile,
        allSessions: state.allSessions,
      }),
    }
  )
);
