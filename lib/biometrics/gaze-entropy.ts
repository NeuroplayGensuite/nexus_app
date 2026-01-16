/**
 * Gaze Entropy Calculator
 * 
 * Measures the "chaos" in eye movements during reading/visual tasks
 * High entropy = chaotic, unpredictable eye movements (potential dyslexia indicator)
 * Low entropy = smooth, predictable tracking
 */

import { Coordinate } from '@/types';

export interface GazeMetrics {
  entropy: number;           // 0-1 scale, higher = more chaotic
  fixationCount: number;     // Number of eye fixations
  saccadeCount: number;      // Number of rapid eye movements
  avgFixationDuration: number;
  regressionCount: number;   // Backward eye movements (key dyslexia indicator)
  regressionRatio: number;   // Regressions / Total saccades
}

/**
 * Calculate Shannon entropy of gaze positions
 * Divides visual field into grid and measures distribution
 */
export function calculateGazeEntropy(
  gazePoints: Coordinate[],
  gridSize: number = 10,
  canvasWidth: number = 800,
  canvasHeight: number = 600
): number {
  if (gazePoints.length < 10) return 0;

  // Create grid cells
  const cellWidth = canvasWidth / gridSize;
  const cellHeight = canvasHeight / gridSize;
  const grid: number[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(0));
  
  // Count points in each cell
  gazePoints.forEach((point) => {
    const cellX = Math.min(gridSize - 1, Math.floor(point.x / cellWidth));
    const cellY = Math.min(gridSize - 1, Math.floor(point.y / cellHeight));
    if (cellX >= 0 && cellY >= 0) {
      grid[cellY][cellX]++;
    }
  });

  // Calculate probabilities
  const totalPoints = gazePoints.length;
  const probabilities: number[] = [];
  
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (grid[y][x] > 0) {
        probabilities.push(grid[y][x] / totalPoints);
      }
    }
  }

  // Shannon entropy: H = -Σ(p * log2(p))
  const entropy = probabilities.reduce((sum, p) => {
    return sum - (p * Math.log2(p));
  }, 0);

  // Normalize to 0-1 (max entropy = log2(gridSize^2))
  const maxEntropy = Math.log2(gridSize * gridSize);
  return entropy / maxEntropy;
}

/**
 * Detect fixations (stationary gaze periods)
 * Fixation: gaze stays within threshold for minimum duration
 */
export function detectFixations(
  gazePoints: Coordinate[],
  distanceThreshold: number = 30,  // pixels
  minDuration: number = 100        // milliseconds
): Coordinate[][] {
  if (gazePoints.length < 2) return [];

  const fixations: Coordinate[][] = [];
  let currentFixation: Coordinate[] = [gazePoints[0]];

  for (let i = 1; i < gazePoints.length; i++) {
    const prev = gazePoints[i - 1];
    const curr = gazePoints[i];
    const dist = Math.sqrt(
      Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
    );

    if (dist < distanceThreshold) {
      currentFixation.push(curr);
    } else {
      // Check if current fixation meets duration threshold
      if (currentFixation.length > 1) {
        const duration = 
          currentFixation[currentFixation.length - 1].timestamp - 
          currentFixation[0].timestamp;
        if (duration >= minDuration) {
          fixations.push([...currentFixation]);
        }
      }
      currentFixation = [curr];
    }
  }

  // Don't forget last fixation
  if (currentFixation.length > 1) {
    const duration = 
      currentFixation[currentFixation.length - 1].timestamp - 
      currentFixation[0].timestamp;
    if (duration >= minDuration) {
      fixations.push(currentFixation);
    }
  }

  return fixations;
}

/**
 * Detect saccades (rapid eye movements between fixations)
 */
export function detectSaccades(
  gazePoints: Coordinate[],
  velocityThreshold: number = 300  // pixels per second
): { start: Coordinate; end: Coordinate; velocity: number }[] {
  const saccades: { start: Coordinate; end: Coordinate; velocity: number }[] = [];

  for (let i = 1; i < gazePoints.length; i++) {
    const prev = gazePoints[i - 1];
    const curr = gazePoints[i];
    const dt = (curr.timestamp - prev.timestamp) / 1000; // seconds
    
    if (dt > 0) {
      const dist = Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
      );
      const velocity = dist / dt;

      if (velocity > velocityThreshold) {
        saccades.push({ start: prev, end: curr, velocity });
      }
    }
  }

  return saccades;
}

/**
 * Count regressions (backward eye movements during reading)
 * Key indicator for dyslexia - excessive regressions indicate reading difficulty
 */
export function countRegressions(
  gazePoints: Coordinate[],
  readingDirection: 'ltr' | 'rtl' = 'ltr'
): number {
  let regressions = 0;
  const backwardThreshold = 20; // pixels

  for (let i = 1; i < gazePoints.length; i++) {
    const prev = gazePoints[i - 1];
    const curr = gazePoints[i];
    
    const xDiff = curr.x - prev.x;
    
    // In LTR reading, backward movement is negative x
    // In RTL reading, backward movement is positive x
    const isBackward = readingDirection === 'ltr' 
      ? xDiff < -backwardThreshold 
      : xDiff > backwardThreshold;
    
    if (isBackward) {
      regressions++;
    }
  }

  return regressions;
}

/**
 * Comprehensive gaze analysis
 */
export function analyzeGaze(
  gazePoints: Coordinate[],
  canvasWidth: number = 800,
  canvasHeight: number = 600
): GazeMetrics {
  const entropy = calculateGazeEntropy(gazePoints, 10, canvasWidth, canvasHeight);
  const fixations = detectFixations(gazePoints);
  const saccades = detectSaccades(gazePoints);
  const regressions = countRegressions(gazePoints);

  const avgFixationDuration = fixations.length > 0
    ? fixations.reduce((sum, f) => {
        return sum + (f[f.length - 1].timestamp - f[0].timestamp);
      }, 0) / fixations.length
    : 0;

  return {
    entropy,
    fixationCount: fixations.length,
    saccadeCount: saccades.length,
    avgFixationDuration,
    regressionCount: regressions,
    regressionRatio: saccades.length > 0 ? regressions / saccades.length : 0,
  };
}
