import { Coordinate } from '@/types';

interface VelocityPoint {
  x: number;
  y: number;
  timestamp: number;
}

/**
 * Jerk = third derivative of position
 * Jerk(t) = d³x/dt³
 * 
 * High jerk variance indicates:
 * - Sub-visual tremors
 * - Motor control difficulties
 * - Potential dysgraphia/dyspraxia indicators
 */
export function calculateJerk(coordinates: Coordinate[]): number[] {
  if (coordinates.length < 4) return [];

  // First derivative: velocity
  const velocities = calculateDerivative(coordinates);

  // Second derivative: acceleration
  const accelerations = calculateDerivative(velocities);

  // Third derivative: jerk
  const jerks = calculateDerivative(accelerations);

  // Return magnitude of jerk vectors
  return jerks.map((j) => Math.sqrt(j.x * j.x + j.y * j.y));
}

/**
 * Calculate derivative (rate of change) of position/velocity/acceleration
 */
function calculateDerivative(
  points: VelocityPoint[]
): VelocityPoint[] {
  const derivatives: VelocityPoint[] = [];

  for (let i = 1; i < points.length; i++) {
    const dt = (points[i].timestamp - points[i - 1].timestamp) / 1000; // seconds

    if (dt > 0 && dt < 1) { // Ignore large gaps
      derivatives.push({
        x: (points[i].x - points[i - 1].x) / dt,
        y: (points[i].y - points[i - 1].y) / dt,
        timestamp: points[i].timestamp,
      });
    }
  }

  return derivatives;
}

/**
 * Analyze jerk values for tremor patterns
 */
export interface JerkAnalysis {
  mean: number;
  variance: number;
  standardDeviation: number;
  spikes: number;
  spikeRatio: number;
  tremorIndicator: number; // 0-100 score
}

export function analyzeJerkPatterns(jerkValues: number[]): JerkAnalysis {
  if (jerkValues.length === 0) {
    return {
      mean: 0,
      variance: 0,
      standardDeviation: 0,
      spikes: 0,
      spikeRatio: 0,
      tremorIndicator: 0
    };
  }

  // Calculate mean
  const mean = jerkValues.reduce((a, b) => a + b, 0) / jerkValues.length;

  // Calculate variance
  const variance =
    jerkValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    jerkValues.length;

  const standardDeviation = Math.sqrt(variance);

  // Count spikes: values > 2 standard deviations from mean
  const spikes = jerkValues.filter(
    (j) => Math.abs(j - mean) > 2 * standardDeviation
  ).length;

  const spikeRatio = jerkValues.length > 0 ? spikes / jerkValues.length : 0;

  // Tremor indicator: normalized score 0-100
  // Based on spike ratio and variance
  const tremorIndicator = Math.min(100,
    (spikeRatio * 300) + (variance / 10000)
  );

  return {
    mean,
    variance,
    standardDeviation,
    spikes,
    spikeRatio,
    tremorIndicator
  };
}

/**
 * Detect sudden direction changes (potential tremor indicator)
 */
export function detectDirectionChanges(coordinates: Coordinate[]): number {
  if (coordinates.length < 3) return 0;

  let directionChanges = 0;
  const ANGLE_THRESHOLD = Math.PI / 4; // 45 degrees

  for (let i = 2; i < coordinates.length; i++) {
    const v1 = {
      x: coordinates[i - 1].x - coordinates[i - 2].x,
      y: coordinates[i - 1].y - coordinates[i - 2].y,
    };
    const v2 = {
      x: coordinates[i].x - coordinates[i - 1].x,
      y: coordinates[i].y - coordinates[i - 1].y,
    };

    const angle = angleBetweenVectors(v1, v2);

    if (Math.abs(angle) > ANGLE_THRESHOLD) {
      directionChanges++;
    }
  }

  return directionChanges;
}

function angleBetweenVectors(
  v1: { x: number; y: number },
  v2: { x: number; y: number }
): number {
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  if (mag1 === 0 || mag2 === 0) return 0;

  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cosAngle);
}

/**
 * Calculate smoothness score (inverse of jerk)
 * Higher score = smoother movement
 */
export function calculateSmoothnessScore(jerkValues: number[]): number {
  if (jerkValues.length === 0) return 100;

  const { mean, tremorIndicator } = analyzeJerkPatterns(jerkValues);

  // Invert: low jerk = high smoothness
  const smoothness = Math.max(0, 100 - tremorIndicator);

  return smoothness;
}

/**
 * Calculate tremor indicator from path coordinates
 * Detects subtle oscillations and tremors
 */
export function calculateTremor(coordinates: Coordinate[]): number {
  const jerkValues = calculateJerk(coordinates);
  if (jerkValues.length === 0) return 0;

  const { tremorIndicator } = analyzeJerkPatterns(jerkValues);
  return tremorIndicator;
}
