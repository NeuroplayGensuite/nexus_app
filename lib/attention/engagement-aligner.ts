/**
 * Engagement Aligner — Trial/CV Timestamp Mapping
 *
 * Associates CV observations with the game trial they occurred during.
 *
 * How it works:
 *  1. The aligner buffers all CVObservations as they arrive.
 *  2. Games emit trial boundaries: { trialId, startTimestamp, endTimestamp }
 *     (all in session-relative ms from performance.now())
 *  3. When a trial boundary is submitted, the aligner filters buffered
 *     observations within [startTimestamp, endTimestamp] and calls
 *     the aggregator to produce TrialVisualEngagement.
 *
 * This module has no React dependency — it is pure TypeScript.
 */

import type { CVObservation, LookingAwayEvent, TrialBoundary, TrialVisualEngagement } from './engagement-types';
import { aggregateTrialEngagement } from './engagement-metrics';

export class EngagementAligner {
  /** Rolling buffer of raw CV observations (cleared periodically to save memory) */
  private observations: CVObservation[] = [];

  /** Completed looking-away events for the full session */
  private lookingAwayEvents: LookingAwayEvent[] = [];

  /** Completed trial engagements */
  private completedTrials: TrialVisualEngagement[] = [];

  // ---------------------------------------------------------------------------
  // Receive a new CV observation
  // ---------------------------------------------------------------------------
  addObservation(obs: CVObservation): void {
    this.observations.push(obs);

    // Keep buffer from growing indefinitely (keep last 5 minutes worth at 8 Hz)
    if (this.observations.length > 2400) {
      this.observations = this.observations.slice(-2400);
    }
  }

  // ---------------------------------------------------------------------------
  // Receive a completed looking-away event from the CV engine
  // ---------------------------------------------------------------------------
  addLookingAwayEvent(event: LookingAwayEvent): void {
    this.lookingAwayEvents.push(event);
  }

  // ---------------------------------------------------------------------------
  // Submit a completed trial boundary — aligns observations, aggregates metrics
  // ---------------------------------------------------------------------------
  submitTrialBoundary(boundary: TrialBoundary): TrialVisualEngagement {
    const { trialId, startTimestamp, endTimestamp } = boundary;

    // Filter observations that fall within this trial's window
    const trialObs = this.observations.filter(
      obs => obs.timestamp >= startTimestamp && obs.timestamp <= endTimestamp
    );

    // Filter looking-away events that overlap with this trial
    const trialLookingAway = this.lookingAwayEvents.filter(event => {
      // Overlap if event started before trial ended AND ended after trial started
      return event.startMs < endTimestamp && event.endMs > startTimestamp;
    }).map(event => ({
      // Clamp to trial boundaries for accurate per-trial accounting
      startMs: Math.max(event.startMs, startTimestamp),
      endMs: Math.min(event.endMs, endTimestamp),
      durationMs: Math.min(event.endMs, endTimestamp) - Math.max(event.startMs, startTimestamp),
    }));

    const trial = aggregateTrialEngagement(
      trialId,
      startTimestamp,
      endTimestamp,
      trialObs,
      trialLookingAway,
    );

    this.completedTrials.push(trial);
    return trial;
  }

  // ---------------------------------------------------------------------------
  // Get all completed trials so far
  // ---------------------------------------------------------------------------
  getCompletedTrials(): TrialVisualEngagement[] {
    return [...this.completedTrials];
  }

  // ---------------------------------------------------------------------------
  // Get all observations (used for session-level aggregation)
  // ---------------------------------------------------------------------------
  getAllObservations(): CVObservation[] {
    return [...this.observations];
  }

  // ---------------------------------------------------------------------------
  // Get all session looking-away events
  // ---------------------------------------------------------------------------
  getAllLookingAwayEvents(): LookingAwayEvent[] {
    return [...this.lookingAwayEvents];
  }

  // ---------------------------------------------------------------------------
  // Reset for a new session
  // ---------------------------------------------------------------------------
  reset(): void {
    this.observations = [];
    this.lookingAwayEvents = [];
    this.completedTrials = [];
  }
}
