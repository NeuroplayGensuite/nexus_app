/**
 * Engagement Metrics — Aggregation Functions
 *
 * Pure functions that convert raw CV observations + looking-away events
 * into structured TrialVisualEngagement and SessionVisualEngagement objects.
 *
 * No React. No side effects.
 */

import type {
  CVObservation,
  LookingAwayEvent,
  TrialVisualEngagement,
  SessionVisualEngagement,
  TrackingQuality,
} from './engagement-types';
import { CV_THRESHOLDS } from './engagement-types';

// ---------------------------------------------------------------------------
// Classify tracking quality from ratio of valid observations
// ---------------------------------------------------------------------------
function classifyQuality(validRatio: number, totalObs: number): TrackingQuality {
  if (totalObs < CV_THRESHOLDS.MIN_OBSERVATIONS_PER_TRIAL) return 'POOR';
  if (validRatio >= CV_THRESHOLDS.MIN_VALID_OBS_RATIO_GOOD) return 'GOOD';
  if (validRatio >= CV_THRESHOLDS.MIN_VALID_OBS_RATIO_FAIR) return 'FAIR';
  return 'POOR';
}

// ---------------------------------------------------------------------------
// Aggregate a single trial
// ---------------------------------------------------------------------------
export function aggregateTrialEngagement(
  trialId: string,
  startTimestamp: number,
  endTimestamp: number,
  observations: CVObservation[],
  lookingAwayEvents: LookingAwayEvent[],
): TrialVisualEngagement {
  const durationMs = endTimestamp - startTimestamp;
  const totalObs = observations.length;
  const insufficientData = totalObs < CV_THRESHOLDS.MIN_OBSERVATIONS_PER_TRIAL;

  if (totalObs === 0) {
    return {
      trialId,
      startTimestamp,
      endTimestamp,
      durationMs,
      faceDetectedRatio: null,
      onScreenEngagementRatio: null,
      lookingAwayEvents: null,
      totalLookingAwayDurationMs: null,
      averageLookingAwayDurationMs: null,
      trackingQuality: 'POOR',
      insufficientData: true,
    };
  }

  // Face detection ratio
  const faceCount = observations.filter(o => o.faceDetected).length;
  const faceDetectedRatio = faceCount / totalObs;

  // On-screen engagement: face present + head centred
  const engagedCount = observations.filter(
    o =>
      o.faceDetected &&
      o.trackingConfidence >= CV_THRESHOLDS.MIN_TRACKING_CONFIDENCE &&
      (o.headOrientation === 'center' || o.headOrientation === 'unknown')
  ).length;
  const onScreenEngagementRatio = engagedCount / totalObs;

  // Looking-away metrics (already clamped to trial window by aligner)
  const numLookingAway = lookingAwayEvents.length;
  const totalLookingAwayDurationMs = lookingAwayEvents.reduce((sum, e) => sum + e.durationMs, 0);
  const averageLookingAwayDurationMs =
    numLookingAway > 0 ? totalLookingAwayDurationMs / numLookingAway : 0;

  // Quality: based on how many observations were "valid" (face + confidence)
  const validCount = observations.filter(
    o => o.faceDetected && o.trackingConfidence >= CV_THRESHOLDS.MIN_TRACKING_CONFIDENCE
  ).length;
  const validRatio = validCount / totalObs;
  const trackingQuality = classifyQuality(validRatio, totalObs);

  return {
    trialId,
    startTimestamp,
    endTimestamp,
    durationMs,
    faceDetectedRatio,
    onScreenEngagementRatio,
    lookingAwayEvents: numLookingAway,
    totalLookingAwayDurationMs,
    averageLookingAwayDurationMs,
    trackingQuality,
    insufficientData,
  };
}

// ---------------------------------------------------------------------------
// Aggregate session-level metrics from all observations and trials
// ---------------------------------------------------------------------------
export function aggregateSessionEngagement(
  cameraAvailable: boolean,
  unavailableReason: string | null,
  measurementDurationMs: number,
  allObservations: CVObservation[],
  allLookingAwayEvents: LookingAwayEvent[],
  trials: TrialVisualEngagement[],
): SessionVisualEngagement {
  if (!cameraAvailable || allObservations.length === 0) {
    return {
      cameraAvailable,
      unavailableReason,
      trackingDurationMs: measurementDurationMs,
      faceDetectedRatio: null,
      onScreenEngagementRatio: null,
      lookingAwayEvents: null,
      totalLookingAwayDurationMs: null,
      averageLookingAwayDurationMs: null,
      trackingQuality: 'UNAVAILABLE',
      trials,
    };
  }

  const totalObs = allObservations.length;

  const faceCount = allObservations.filter(o => o.faceDetected).length;
  const faceDetectedRatio = faceCount / totalObs;

  const engagedCount = allObservations.filter(
    o =>
      o.faceDetected &&
      o.trackingConfidence >= CV_THRESHOLDS.MIN_TRACKING_CONFIDENCE &&
      (o.headOrientation === 'center' || o.headOrientation === 'unknown')
  ).length;
  const onScreenEngagementRatio = engagedCount / totalObs;

  const numLookingAway = allLookingAwayEvents.length;
  const totalLookingAwayDurationMs = allLookingAwayEvents.reduce((sum, e) => sum + e.durationMs, 0);
  const averageLookingAwayDurationMs =
    numLookingAway > 0 ? totalLookingAwayDurationMs / numLookingAway : 0;

  const validCount = allObservations.filter(
    o => o.faceDetected && o.trackingConfidence >= CV_THRESHOLDS.MIN_TRACKING_CONFIDENCE
  ).length;
  const validRatio = validCount / totalObs;
  const trackingQuality = classifyQuality(validRatio, totalObs);

  return {
    cameraAvailable,
    unavailableReason,
    trackingDurationMs: measurementDurationMs,
    faceDetectedRatio,
    onScreenEngagementRatio,
    lookingAwayEvents: numLookingAway,
    totalLookingAwayDurationMs,
    averageLookingAwayDurationMs,
    trackingQuality,
    trials,
  };
}
