/**
 * Visual Engagement Tracking — Core Type Definitions
 *
 * These types describe every layer of the CV pipeline:
 *   raw observation → looking-away event → trial aggregate → session aggregate
 *
 * IMPORTANT:
 *   - null  = data unavailable (camera off, permission denied)
 *   - 0     = measured value of zero (face present 0% of trial)
 *   Never conflate the two.
 */

// ---------------------------------------------------------------------------
// Raw CV sample produced at ~8 Hz by the cv-engine
// ---------------------------------------------------------------------------
export interface CVObservation {
  /** Milliseconds since session measurement began (performance.now()-based) */
  timestamp: number;

  /** Was a face detected in this frame? */
  faceDetected: boolean;

  /**
   * Estimated head orientation derived from landmark positions.
   * 'unknown' when face not detected or landmarks unavailable.
   */
  headOrientation: 'center' | 'left' | 'right' | 'up' | 'down' | 'unknown';

  /**
   * Confidence 0–1 from the face detector.
   * 0 when no face detected.
   */
  trackingConfidence: number;
}

// ---------------------------------------------------------------------------
// A single period where the child was not looking at the screen
// ---------------------------------------------------------------------------
export interface LookingAwayEvent {
  /** Session-relative timestamp when the child started looking away */
  startMs: number;

  /** Session-relative timestamp when the child returned */
  endMs: number;

  /** Duration in milliseconds */
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Internal state machine states for looking-away detection
// ---------------------------------------------------------------------------
export type LookingAwayState = 'TRACKING' | 'POSSIBLY_AWAY' | 'LOOKING_AWAY';

// ---------------------------------------------------------------------------
// Thresholds for CV quality gating and looking-away detection
// ---------------------------------------------------------------------------
export const CV_THRESHOLDS = {
  /** Minimum face detection score to count as "face present" */
  MIN_TRACKING_CONFIDENCE: 0.5,

  /**
   * How long (ms) the face must be absent/misaligned before we record a
   * looking-away event. Filters brief tracking noise.
   */
  LOOKING_AWAY_ONSET_MS: 400,

  /**
   * Minimum ratio of valid observations (face detected + good confidence)
   * a trial must have to be rated GOOD tracking quality.
   */
  MIN_VALID_OBS_RATIO_GOOD: 0.7,

  /**
   * Minimum ratio for FAIR quality (below this → POOR).
   */
  MIN_VALID_OBS_RATIO_FAIR: 0.4,

  /**
   * Minimum number of CV observations a trial must contain to be
   * considered as having sufficient data.
   */
  MIN_OBSERVATIONS_PER_TRIAL: 3,

  /** Camera resolution request (keeps processing lightweight) */
  CAMERA_WIDTH: 320,
  CAMERA_HEIGHT: 240,

  /** CV sampling interval in milliseconds (8 obs/sec) */
  SAMPLE_INTERVAL_MS: 125,
} as const;

// ---------------------------------------------------------------------------
// Tracking quality classification
// ---------------------------------------------------------------------------
export type TrackingQuality = 'GOOD' | 'FAIR' | 'POOR' | 'UNAVAILABLE';

// ---------------------------------------------------------------------------
// Aggregate metrics for a single game trial
// ---------------------------------------------------------------------------
export interface TrialVisualEngagement {
  /** Matches the trialId emitted by the game's trial_start event */
  trialId: string;

  /** Session-relative start timestamp (ms) */
  startTimestamp: number;

  /** Session-relative end timestamp (ms) */
  endTimestamp: number;

  /** Duration of the trial in ms */
  durationMs: number;

  /**
   * Ratio of observations where the face was detected (0–1).
   * null if camera unavailable.
   */
  faceDetectedRatio: number | null;

  /**
   * Ratio of observations where face was detected AND head was centred (0–1).
   * This is the primary "on-screen engagement" signal.
   * null if camera unavailable.
   */
  onScreenEngagementRatio: number | null;

  /** Number of distinct looking-away events during this trial */
  lookingAwayEvents: number | null;

  /** Total time spent looking away (ms) */
  totalLookingAwayDurationMs: number | null;

  /** Average duration of a single looking-away event (ms) */
  averageLookingAwayDurationMs: number | null;

  /** Overall quality classification for this trial's CV data */
  trackingQuality: TrackingQuality;

  /** True if there were too few observations to draw any conclusions */
  insufficientData: boolean;
}

// ---------------------------------------------------------------------------
// Session-level aggregate across all trials
// ---------------------------------------------------------------------------
export interface SessionVisualEngagement {
  /** Whether the camera was available at all this session */
  cameraAvailable: boolean;

  /**
   * If camera was denied or absent, the reason string.
   * null if camera was available.
   */
  unavailableReason: string | null;

  /** Total wall-clock duration the CV tracker was actively measuring (ms) */
  trackingDurationMs: number;

  /**
   * Ratio of ALL observations across the session where a face was detected.
   * null if camera unavailable.
   */
  faceDetectedRatio: number | null;

  /**
   * Ratio of ALL observations where face was detected AND head centred.
   * null if camera unavailable.
   */
  onScreenEngagementRatio: number | null;

  /** Total number of looking-away events across the session */
  lookingAwayEvents: number | null;

  /** Total time looking away (ms) */
  totalLookingAwayDurationMs: number | null;

  /** Average looking-away event duration (ms) */
  averageLookingAwayDurationMs: number | null;

  /** Overall session tracking quality */
  trackingQuality: TrackingQuality;

  /** Per-trial breakdown */
  trials: TrialVisualEngagement[];
}

// ---------------------------------------------------------------------------
// A trial boundary emitted by a game component
// ---------------------------------------------------------------------------
export interface TrialBoundary {
  trialId: string;
  startTimestamp: number;  // session-relative ms (performance.now() - sessionStart)
  endTimestamp: number;    // session-relative ms
}
