import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Coordinate, GameSession, BiometricMetrics, GameEvent, ChildProfile } from '@/types';
import type { SessionVisualEngagement } from '@/lib/attention/engagement-types';
import {
  saveChildProfile,
  saveGameSession,
  saveMLPredictions,
  createAssessment,
  markGameCompleted,
  isSupabaseConfigured,
} from '@/lib/supabase/client';
import type { PKLPrediction } from '@/lib/ml/hybrid-diagnostic-engine';

// ============================================================
// STATE SHAPE
// ============================================================
interface SessionState {
  // Child Profile
  childProfile: ChildProfile | null;
  setChildProfile: (profile: ChildProfile) => void;
  clearProfile: () => void;

  // Assessment tracking (groups all 5 games per visit)
  assessmentId: string | null;
  /** Call this before starting the first game of a new assessment visit */
  startAssessment: () => Promise<void>;

  // Current Session
  currentSession: GameSession | null;
  allSessions: GameSession[];

  // Session Actions
  startSession: (gameType: GameSession['gameType']) => void;
  endSession: () => void;
  addCoordinate: (coord: Coordinate) => void;
  addEvent: (event: Omit<GameEvent, 'timestamp'>) => void;
  updateMetrics: (metrics: Partial<BiometricMetrics>) => void;
  /** Call this BEFORE endSession() to attach final CV metrics to the session */
  updateVisualEngagement: (engagement: SessionVisualEngagement | null) => void;

  // ML prediction persistence (called from report page after hybridEngine runs)
  saveMLPredictions: (predictions: PKLPrediction[]) => Promise<void>;

  // Aggregation helpers
  getAggregatedMetrics: () => BiometricMetrics;
  getSessionsByType: (type: GameSession['gameType']) => GameSession[];

  // Supabase bulk sync (fallback for any missed incremental saves)
  syncToSupabase: () => Promise<void>;
  isSyncing: boolean;
  lastSyncedAt: number | null;

  // Reset
  resetAllSessions: () => void;
}

// ============================================================
// STORE
// ============================================================
export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      childProfile: null,
      currentSession: null,
      allSessions: [],
      assessmentId: null,
      isSyncing: false,
      lastSyncedAt: null,

      // ----------------------------------------------------------
      setChildProfile: (profile) => {
        set({ childProfile: profile });
        if (isSupabaseConfigured()) {
          saveChildProfile(profile).catch((err) => {
            console.warn('[Store] saveChildProfile failed (local backup intact):', err);
          });
        }
      },

      // ----------------------------------------------------------
      // Create an assessment row in Supabase when the first game starts.
      // If Supabase is unavailable, assessmentId stays null — everything
      // continues to work via localStorage.
      // ----------------------------------------------------------
      startAssessment: async () => {
        const { childProfile, assessmentId } = get();

        // Don't create a duplicate assessment if one is already in progress
        if (assessmentId) return;

        if (!childProfile) {
          console.warn('[Store] startAssessment: no child profile set');
          return;
        }

        if (isSupabaseConfigured()) {
          const assessment = await createAssessment(childProfile.id).catch((err) => {
            console.warn('[Store] createAssessment failed:', err);
            return null;
          });

          if (assessment) {
            set({ assessmentId: assessment.id });
            console.log('[Store] Assessment started:', assessment.id);
          }
        }
      },

      // ----------------------------------------------------------
      startSession: (gameType) => {
        // Ensure assessment is started when first game begins
        const { assessmentId } = get();
        if (!assessmentId) {
          get().startAssessment();
        }

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

      // ----------------------------------------------------------
      endSession: () => {
        const { currentSession, allSessions, childProfile, assessmentId } = get();
        if (!currentSession) return;

        const completedSession: GameSession = {
          ...currentSession,
          endTime: Date.now(),
        };

        // Keep last 20 sessions in localStorage to avoid quota exceeded
        const updatedSessions = [...allSessions, completedSession].slice(-20);

        set({
          currentSession: null,
          allSessions: updatedSessions,
        });

        // Incremental Supabase save (non-blocking)
        if (isSupabaseConfigured() && childProfile) {
          saveGameSession(completedSession, childProfile.id, assessmentId)
            .then((saved) => {
              if (saved && assessmentId) {
                // Record this game as completed in the assessment row
                markGameCompleted(assessmentId, completedSession.gameType).catch(console.warn);
              }
            })
            .catch((err) => {
              console.warn('[Store] saveGameSession failed (local backup intact):', err);
            });
        }
      },

      // ----------------------------------------------------------
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
          const fullEvent: GameEvent = { ...event, timestamp: Date.now() };
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

      updateVisualEngagement: (engagement) => {
        const { currentSession } = get();
        if (currentSession) {
          set({
            currentSession: {
              ...currentSession,
              visualEngagement: engagement,
              metrics: {
                ...currentSession.metrics,
                visualEngagementMetrics: engagement,
              },
            },
          });
        }
      },

      // ----------------------------------------------------------
      // Save ML predictions to Supabase.
      // Called from the report page after hybridEngine.diagnose() returns.
      // ----------------------------------------------------------
      saveMLPredictions: async (predictions: PKLPrediction[]) => {
        const { childProfile, assessmentId } = get();
        if (!childProfile || !isSupabaseConfigured()) return;

        await saveMLPredictions(predictions, childProfile.id, assessmentId).catch((err) => {
          console.warn('[Store] saveMLPredictions failed:', err);
        });
      },

      // ----------------------------------------------------------
      getAggregatedMetrics: () => {
        const { allSessions, currentSession } = get();
        const aggregated: BiometricMetrics = {};

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

      // ----------------------------------------------------------
      // Bulk sync — fallback for any missed incremental saves
      // ----------------------------------------------------------
      syncToSupabase: async () => {
        const { childProfile, allSessions, assessmentId } = get();

        if (!isSupabaseConfigured()) {
          console.warn('[Store] Supabase not configured');
          return;
        }
        if (!childProfile) {
          console.warn('[Store] No child profile to sync');
          return;
        }

        set({ isSyncing: true });

        try {
          await saveChildProfile(childProfile);

          for (const session of allSessions) {
            await saveGameSession(session, childProfile.id, assessmentId);
          }

          set({ lastSyncedAt: Date.now() });
          console.log('[Store] Full sync to Supabase complete');
        } catch (error) {
          console.error('[Store] Sync failed:', error);
        } finally {
          set({ isSyncing: false });
        }
      },

      // ----------------------------------------------------------
      resetAllSessions: () => {
        set({ currentSession: null, allSessions: [], assessmentId: null });
      },

      clearProfile: () => {
        set({ childProfile: null, currentSession: null, allSessions: [], assessmentId: null });
      },
    }),
    {
      name: 'neurogen-session-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist the data — not transient UI state or functions
      partialize: (state) => ({
        childProfile: state.childProfile,
        allSessions: state.allSessions,
        assessmentId: state.assessmentId,
      }),
    }
  )
);
