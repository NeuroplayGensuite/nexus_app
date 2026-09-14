/**
 * useVisualEngagement — Shared hook for game components
 *
 * Provides a clean interface for integrating visual engagement tracking
 * into any game component without directly touching the window object.
 *
 * Usage in a game component:
 *
 *   const { beginTracking, submitTrial, finaliseTracking } = useVisualEngagement();
 *
 *   // When game starts (same moment as startSession):
 *   const sessionStartMs = performance.now();
 *   startSession('phonic');
 *   beginTracking(sessionStartMs);
 *
 *   // When a trial ends:
 *   submitTrial({ trialId: 'round-1', startTimestamp, endTimestamp });
 *
 *   // When game ends (before endSession):
 *   finaliseTracking(); // → writes to Zustand
 *   endSession();
 */

'use client';

import { useCallback } from 'react';
import { useSessionStore } from '@/stores/session-store';
import type { TrialBoundary } from '@/lib/attention/engagement-types';

export function useVisualEngagement() {
  const updateVisualEngagement = useSessionStore(s => s.updateVisualEngagement);

  const getTracker = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return window.__vetRef ?? null;
  }, []);

  /**
   * Begin CV measurement.
   * Call this at the SAME logical instant as startSession().
   * Pass performance.now() as sessionStartMs.
   */
  const beginTracking = useCallback((sessionStartMs: number) => {
    const tracker = getTracker();
    if (!tracker) return;
    tracker.beginMeasurement(sessionStartMs);
  }, [getTracker]);

  /**
   * Submit a completed trial boundary.
   * trialId should match the game's round/trial identifier.
   * startTimestamp and endTimestamp are session-relative ms (performance.now() - sessionStartMs).
   */
  const submitTrial = useCallback((boundary: TrialBoundary) => {
    const tracker = getTracker();
    if (!tracker) return null;
    return tracker.submitTrialBoundary(boundary);
  }, [getTracker]);

  /**
   * Finalise the session's visual engagement data.
   * Call this just BEFORE endSession().
   * Writes the aggregated SessionVisualEngagement into Zustand.
   */
  const finaliseTracking = useCallback(() => {
    const tracker = getTracker();
    if (!tracker) {
      // No tracker → camera unavailable
      updateVisualEngagement(null);
      return;
    }
    const engagement = tracker.finalise();
    updateVisualEngagement(engagement);
  }, [getTracker, updateVisualEngagement]);

  return {
    beginTracking,
    submitTrial,
    finaliseTracking,
  };
}
