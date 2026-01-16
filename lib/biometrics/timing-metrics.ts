/**
 * Timing Metrics for Learning Disability Detection
 * 
 * Measures response times for various cognitive tasks
 */

/**
 * Phonological Retrieval Speed
 * Time from audio cue to correct response
 */
export function calculatePhonicRetrievalSpeed(
  audioCueTimestamp: number,
  responseTimestamp: number
): number {
  return responseTimestamp - audioCueTimestamp;
}

/**
 * Subitizing Analysis
 * Subitizing: instant recognition of quantity (typically 1-4 items)
 * Beyond 4, response time increases linearly (counting)
 */
export interface SubitizingResult {
  threshold: number;          // Highest quantity with instant recognition
  subitizingFailed: boolean;  // Failed to subitize even small quantities
  responseTimes: { quantity: number; time: number }[];
  isLinear: boolean;          // True if response time is linear (counting)
}

export function analyzeSubitizing(
  responses: { quantity: number; responseTime: number }[]
): SubitizingResult {
  if (responses.length === 0) {
    return {
      threshold: 0,
      subitizingFailed: true,
      responseTimes: [],
      isLinear: false,
    };
  }

  // Sort by quantity
  const sorted = [...responses].sort((a, b) => a.quantity - b.quantity);
  
  // Typical subitizing threshold: response time stays flat for 1-4 items
  const INSTANT_THRESHOLD = 1000; // 1 second for instant recognition
  const TIME_INCREASE_THRESHOLD = 200; // ms increase per item = counting
  
  let threshold = 0;
  let subitizingFailed = false;
  
  // Find where response time starts increasing linearly
  for (let i = 0; i < sorted.length; i++) {
    const { quantity, responseTime } = sorted[i];
    
    if (responseTime <= INSTANT_THRESHOLD) {
      threshold = quantity;
    } else if (quantity <= 3 && responseTime > INSTANT_THRESHOLD * 1.5) {
      // Should be able to subitize 1-3 instantly
      subitizingFailed = true;
    }
  }

  // Check for linear increase (counting behavior)
  let isLinear = false;
  if (sorted.length >= 3) {
    const increases: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      increases.push(sorted[i].responseTime - sorted[i - 1].responseTime);
    }
    const avgIncrease = increases.reduce((a, b) => a + b, 0) / increases.length;
    const variance = increases.reduce((sum, inc) => 
      sum + Math.pow(inc - avgIncrease, 2), 0) / increases.length;
    
    // Low variance in increases = linear (counting)
    isLinear = variance < Math.pow(avgIncrease * 0.5, 2) && avgIncrease > TIME_INCREASE_THRESHOLD;
  }

  return {
    threshold,
    subitizingFailed,
    responseTimes: sorted.map(r => ({ quantity: r.quantity, time: r.responseTime })),
    isLinear,
  };
}

/**
 * Symbolic Mapping Speed
 * Time to connect digit (5) to quantity (●●●●●)
 */
export function calculateSymbolicMappingSpeed(
  digitShownTimestamp: number,
  quantitySelectedTimestamp: number
): number {
  return quantitySelectedTimestamp - digitShownTimestamp;
}

/**
 * Motor Coordination Lag
 * Difference between visual identification and motor response
 */
export function calculateMotorLag(
  visualIdentificationTime: number,
  motorResponseTime: number
): number {
  return motorResponseTime - visualIdentificationTime;
}

/**
 * Rhythm Accuracy
 * How well the user matches the expected rhythm
 */
export interface RhythmAnalysis {
  accuracy: number;           // 0-100%
  avgDeviation: number;       // Average ms deviation from expected
  missedBeats: number;
  earlyResponses: number;
  lateResponses: number;
}

export function analyzeRhythm(
  expectedBeats: number[],      // Expected timestamps
  actualResponses: number[],    // Actual response timestamps
  toleranceMs: number = 200     // Acceptable deviation
): RhythmAnalysis {
  if (expectedBeats.length === 0) {
    return {
      accuracy: 0,
      avgDeviation: 0,
      missedBeats: 0,
      earlyResponses: 0,
      lateResponses: 0,
    };
  }

  let matches = 0;
  let totalDeviation = 0;
  let earlyResponses = 0;
  let lateResponses = 0;
  const matchedExpected = new Set<number>();

  // Match each response to closest expected beat
  actualResponses.forEach((response) => {
    let closestIndex = -1;
    let closestDist = Infinity;

    expectedBeats.forEach((expected, idx) => {
      if (!matchedExpected.has(idx)) {
        const dist = Math.abs(response - expected);
        if (dist < closestDist) {
          closestDist = dist;
          closestIndex = idx;
        }
      }
    });

    if (closestIndex >= 0 && closestDist <= toleranceMs * 2) {
      matchedExpected.add(closestIndex);
      totalDeviation += closestDist;
      
      if (closestDist <= toleranceMs) {
        matches++;
      }
      
      if (response < expectedBeats[closestIndex]) {
        earlyResponses++;
      } else {
        lateResponses++;
      }
    }
  });

  const missedBeats = expectedBeats.length - matchedExpected.size;
  const accuracy = (matches / expectedBeats.length) * 100;
  const avgDeviation = matchedExpected.size > 0 
    ? totalDeviation / matchedExpected.size 
    : 0;

  return {
    accuracy,
    avgDeviation,
    missedBeats,
    earlyResponses,
    lateResponses,
  };
}

/**
 * Visual-Spatial Memory Decay
 * Measures accuracy degradation over time delays
 */
export interface SpatialDecayResult {
  delay1s: number;   // Accuracy after 1 second
  delay3s: number;   // Accuracy after 3 seconds
  delay5s: number;   // Accuracy after 5 seconds
  decayRate: number; // Rate of memory degradation
  nvldIndicator: number; // 0-100 score for NVLD risk
}

export function analyzeSpatialDecay(
  accuracies: { delaySeconds: number; accuracy: number }[]
): SpatialDecayResult {
  const result: SpatialDecayResult = {
    delay1s: 100,
    delay3s: 100,
    delay5s: 100,
    decayRate: 0,
    nvldIndicator: 0,
  };

  accuracies.forEach(({ delaySeconds, accuracy }) => {
    if (delaySeconds <= 1.5) result.delay1s = accuracy;
    else if (delaySeconds <= 3.5) result.delay3s = accuracy;
    else result.delay5s = accuracy;
  });

  // Calculate decay rate (higher = faster memory loss)
  result.decayRate = (result.delay1s - result.delay5s) / 4; // per second

  // NVLD indicator: rapid decay from 1s to 3s is concerning
  const earlyDecay = result.delay1s - result.delay3s;
  result.nvldIndicator = Math.min(100, earlyDecay * 2);

  return result;
}
