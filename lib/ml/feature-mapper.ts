/**
 * NeuroGen Suite — ML Feature Mapper
 *
 * Provides explicit, documented mappings from frontend BiometricMetrics +
 * SessionVisualEngagement into the exact feature vector that each .pkl model
 * was trained on.
 *
 * Rules:
 *   - null (JS) → null in payload → Python side receives NaN → SimpleImputer handles it
 *   - 0         → 0 in payload    → genuine measured zero, passed as-is
 *   - Never substitute a null with 0 or vice-versa
 *   - cameraAvailable is always sent as string "True" / "False" (categorical)
 *   - subitizingFailed is always sent as string "True" / "False" (categorical)
 */

import type { BiometricMetrics } from '@/types';
import type { SessionVisualEngagement } from '@/lib/attention/engagement-types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type KnownCondition = 'dyslexia' | 'dysgraphia' | 'dyscalculia' | 'dyspraxia' | 'nvld';

/** Feature payload sent to POST /api/ml-predict */
export interface MLFeaturePayload {
  condition: KnownCondition;
  features: Record<string, number | string | null>;
  /** Metadata about what data was available — not used by the model */
  meta: {
    cameraAvailable: boolean;
    gamesWithData: KnownCondition[];
    subitizingMeasurementStatus?: 'measured' | 'task_failure' | 'not_run';
  };
}

// ---------------------------------------------------------------------------
// CV field extractor
// Extracts the 6 CV numeric features + cameraAvailable from SessionVisualEngagement.
// When camera is unavailable, numeric fields become null (NOT zero).
// ---------------------------------------------------------------------------
function extractCVFeatures(
  engagement: SessionVisualEngagement | null | undefined
): {
  faceDetectedRatio: number | null;
  onScreenEngagementRatio: number | null;
  lookingAwayEvents: number | null;
  totalLookingAwayDurationMs: number | null;
  averageLookingAwayDurationMs: number | null;
  trackingDurationMs: number | null;
  cameraAvailable: string; // "True" | "False"
} {
  if (!engagement || !engagement.cameraAvailable) {
    return {
      faceDetectedRatio: null,
      onScreenEngagementRatio: null,
      lookingAwayEvents: null,
      totalLookingAwayDurationMs: null,
      averageLookingAwayDurationMs: null,
      trackingDurationMs: null,
      cameraAvailable: 'False',
    };
  }

  return {
    faceDetectedRatio: engagement.faceDetectedRatio ?? null,
    onScreenEngagementRatio: engagement.onScreenEngagementRatio ?? null,
    lookingAwayEvents: engagement.lookingAwayEvents ?? null,
    totalLookingAwayDurationMs: engagement.totalLookingAwayDurationMs ?? null,
    averageLookingAwayDurationMs: engagement.averageLookingAwayDurationMs ?? null,
    trackingDurationMs: engagement.trackingDurationMs ?? null,
    cameraAvailable: 'True',
  };
}

// ---------------------------------------------------------------------------
// Per-condition feature builders
// ---------------------------------------------------------------------------

function buildDyslexiaFeatures(
  metrics: BiometricMetrics,
  cv: ReturnType<typeof extractCVFeatures>,
  age: number
): Record<string, number | string | null> {
  return {
    age,
    phonicDelay: metrics.phonicDelay ?? null,
    phonemicSlips: metrics.phonemicSlips ?? null,
    // Training uses totalAttempts (general field shared across games)
    totalAttempts: metrics.totalAttempts ?? metrics.totalPhonicAttempts ?? null,
    accuracy: metrics.accuracy ?? null,
    ...cv,
  };
}

function buildDysgraphiaFeatures(
  metrics: BiometricMetrics,
  cv: ReturnType<typeof extractCVFeatures>,
  age: number
): Record<string, number | string | null> {
  return {
    age,
    mse: metrics.mse ?? null,
    wallCollisions: metrics.wallCollisions ?? null,
    proximityEvents: metrics.proximityEvents ?? null,
    wallHuggingRatio: metrics.wallHuggingRatio ?? null,
    // Training uses jerkMean (maps directly from BiometricMetrics.jerkMean)
    jerkMean: metrics.jerkMean ?? null,
    jerkVariance: metrics.jerkVariance ?? null,
    tremorIndicator: metrics.tremorIndicator ?? null,
    ...cv,
  };
}

function buildDyscalculiaFeatures(
  metrics: BiometricMetrics,
  cv: ReturnType<typeof extractCVFeatures>,
  age: number
): Record<string, number | string | null> {
  // subitizingFailed: boolean in BiometricMetrics, must be sent as string "True"/"False"
  const subitizingFailedStr =
    metrics.subitizingFailed === undefined
      ? 'False'
      : String(metrics.subitizingFailed);

  return {
    age,
    subitizingThreshold: metrics.subitizingThreshold ?? null,
    symbolicMappingSpeed: metrics.symbolicMappingSpeed ?? null,
    symbolicMappingErrors: metrics.symbolicMappingErrors ?? null,
    // Categorical fields at end (order doesn't matter — pipeline uses column names)
    subitizingFailed: subitizingFailedStr,
    ...cv,
  };
}

function buildDyspraxiaFeatures(
  metrics: BiometricMetrics,
  cv: ReturnType<typeof extractCVFeatures>,
  age: number
): Record<string, number | string | null> {
  return {
    age,
    motorLag: metrics.motorLag ?? null,
    gazeEntropy: metrics.gazeEntropy ?? null,
    rhythmAccuracy: metrics.rhythmAccuracy ?? null,
    missedBeats: metrics.missedBeats ?? null,
    totalAttempts: metrics.totalAttempts ?? null,
    accuracy: metrics.accuracy ?? null,
    ...cv,
  };
}

function buildNVLDFeatures(
  metrics: BiometricMetrics,
  cv: ReturnType<typeof extractCVFeatures>,
  age: number
): Record<string, number | string | null> {
  return {
    age,
    spatialDecay1s: metrics.spatialDecay1s ?? null,
    spatialDecay3s: metrics.spatialDecay3s ?? null,
    spatialDecay5s: metrics.spatialDecay5s ?? null,
    visualMemoryScore: metrics.visualMemoryScore ?? null,
    totalAttempts: metrics.totalAttempts ?? null,
    accuracy: metrics.accuracy ?? null,
    ...cv,
  };
}

// ---------------------------------------------------------------------------
// Whether enough game data exists to run a given condition's model
// ---------------------------------------------------------------------------
function hasGameDataFor(condition: KnownCondition, metrics: BiometricMetrics): boolean {
  switch (condition) {
    case 'dyslexia':
      return metrics.phonicDelay !== undefined;
    case 'dysgraphia':
      return metrics.mse !== undefined;
    case 'dyscalculia':
      return metrics.subitizingThreshold !== undefined;
    case 'dyspraxia':
      return metrics.rhythmAccuracy !== undefined;
    case 'nvld':
      return metrics.spatialDecay1s !== undefined;
  }
}

// ---------------------------------------------------------------------------
// Subitizing measurement status helper (metadata only — not sent to model)
// ---------------------------------------------------------------------------
function getSubitizingStatus(
  metrics: BiometricMetrics
): 'measured' | 'task_failure' | 'not_run' {
  if (metrics.subitizingThreshold === undefined) return 'not_run';
  if (metrics.subitizingFailed === true) return 'task_failure';
  return 'measured';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build the feature payload for a single condition.
 * Returns null if the game providing data for this condition hasn't been played.
 */
export function buildFeaturePayload(
  condition: KnownCondition,
  metrics: BiometricMetrics,
  engagement: SessionVisualEngagement | null | undefined,
  childAge: number
): MLFeaturePayload | null {
  if (!hasGameDataFor(condition, metrics)) {
    return null;
  }

  const cv = extractCVFeatures(engagement);

  let features: Record<string, number | string | null>;
  switch (condition) {
    case 'dyslexia':
      features = buildDyslexiaFeatures(metrics, cv, childAge);
      break;
    case 'dysgraphia':
      features = buildDysgraphiaFeatures(metrics, cv, childAge);
      break;
    case 'dyscalculia':
      features = buildDyscalculiaFeatures(metrics, cv, childAge);
      break;
    case 'dyspraxia':
      features = buildDyspraxiaFeatures(metrics, cv, childAge);
      break;
    case 'nvld':
      features = buildNVLDFeatures(metrics, cv, childAge);
      break;
  }

  // Which conditions have data — for the meta block
  const allConditions: KnownCondition[] = [
    'dyslexia', 'dysgraphia', 'dyscalculia', 'dyspraxia', 'nvld',
  ];
  const gamesWithData = allConditions.filter(c => hasGameDataFor(c, metrics));

  return {
    condition,
    features,
    meta: {
      cameraAvailable: cv.cameraAvailable === 'True',
      gamesWithData,
      ...(condition === 'dyscalculia' && {
        subitizingMeasurementStatus: getSubitizingStatus(metrics),
      }),
    },
  };
}

/**
 * Build feature payloads for ALL conditions that have game data.
 * Use this when generating the full report (runs all available models).
 */
export function buildAllFeaturePayloads(
  metrics: BiometricMetrics,
  engagement: SessionVisualEngagement | null | undefined,
  childAge: number
): MLFeaturePayload[] {
  const conditions: KnownCondition[] = [
    'dyslexia', 'dysgraphia', 'dyscalculia', 'dyspraxia', 'nvld',
  ];

  return conditions
    .map(c => buildFeaturePayload(c, metrics, engagement, childAge))
    .filter((p): p is MLFeaturePayload => p !== null);
}
