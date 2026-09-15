/**
 * NeuroGen Suite — Hybrid Diagnostic Engine (v2 — Real PKL Models)
 *
 * Architecture:
 *   Stage 1: Real sklearn Logistic Regression .pkl models via Python FastAPI
 *            → riskProbability, prediction, dataQuality
 *   Stage 2: Clinical evidence context from clinical-knowledge-base.json
 *            → domain descriptions, metric definitions, interventions
 *   Stage 3: LLM report generation using Stage 1+2 as structured evidence
 *
 * IMPORTANT:
 *   - The ML probability comes ONLY from the .pkl models.
 *   - The clinical JSON is context/evidence, NOT a second classifier.
 *   - Z-scores are NOT computed for metrics without validated clinical norms.
 *   - "model confidence" is NOT the same as riskProbability.
 *
 * @deprecated conventional-classifiers.ts — the fake TypeScript classifiers
 *   are no longer called. This file replaces that prediction path entirely.
 */

import type { BiometricMetrics } from '@/types';
import type { SessionVisualEngagement } from '@/lib/attention/engagement-types';
import {
  buildAllFeaturePayloads,
  type KnownCondition,
  type MLFeaturePayload,
} from './feature-mapper';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PKLPrediction {
  condition: KnownCondition;
  /** Raw class index: 0 (low_risk) or 1 (at_risk) */
  prediction: number;
  /** Human readable: "low_risk" | "at_risk" */
  riskLabel: string;
  /** Probability that the model assigns to class 1 (at_risk). 0.0–1.0. */
  riskProbability: number;
  probabilities: { low_risk: number; at_risk: number };
  modelType: string;
  modelFile: string;
  dataQuality: {
    cameraAvailable: boolean;
    numericFeaturesProvided: number;
    numericFeaturesTotal: number;
    assessmentCompleteness: number;
    missingFeatures: string[];
  };
  /** Only present for dyscalculia */
  subitizingMeasurementStatus?: 'measured' | 'task_failure' | 'not_run';
}

export interface HybridDiagnosticReport {
  /** Results from real .pkl Logistic Regression models */
  mlPredictions: PKLPrediction[];

  /** Overall risk summary derived from the highest-probability result */
  overallRisk: 'LOW' | 'MODERATE' | 'HIGH';

  /** Whether the Python ML service was reachable */
  mlServiceAvailable: boolean;

  /** Number of games that had data for prediction */
  gamesWithData: number;

  /** Data completeness classification */
  dataCompleteness: 'COMPLETE' | 'PARTIAL' | 'MINIMAL';

  /** Optional reliability warning if < 3 games completed */
  reliabilityWarning?: string;

  processingTime: {
    mlStage: number;
    totalMs: number;
  };

  timestamp: number;
}

// ---------------------------------------------------------------------------
// Risk level helpers
// ---------------------------------------------------------------------------

function probabilityToRisk(prob: number): 'LOW' | 'MODERATE' | 'HIGH' {
  if (prob >= 0.65) return 'HIGH';
  if (prob >= 0.40) return 'MODERATE';
  return 'LOW';
}

function deriveOverallRisk(
  predictions: PKLPrediction[]
): 'LOW' | 'MODERATE' | 'HIGH' {
  if (predictions.length === 0) return 'LOW';
  const maxProb = Math.max(...predictions.map(p => p.riskProbability));
  return probabilityToRisk(maxProb);
}

function assessDataCompleteness(
  gamesPlayed: number
): 'COMPLETE' | 'PARTIAL' | 'MINIMAL' {
  if (gamesPlayed >= 4) return 'COMPLETE';
  if (gamesPlayed >= 2) return 'PARTIAL';
  return 'MINIMAL';
}

// ---------------------------------------------------------------------------
// PKL inference — calls FastAPI directly (absolute URL required server-side)
// ---------------------------------------------------------------------------

// The ML service URL: call FastAPI directly to avoid relative-URL errors in
// server-side Next.js route handlers where fetch('/api/...') is invalid.
const ML_SERVICE_URL =
  process.env.ML_SERVICE_URL ?? 'http://127.0.0.1:8000';

async function callMLPredict(payload: MLFeaturePayload): Promise<PKLPrediction | null> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        condition: payload.condition,
        features: payload.features,
      }),
      // Fail fast if FastAPI is not running
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.warn(`[HybridEngine] ML service HTTP ${response.status} for ${payload.condition}`);
      return null;
    }

    const data = await response.json();

    return {
      condition: payload.condition as KnownCondition,
      prediction: data.prediction,
      riskLabel: data.riskLabel,
      riskProbability: data.riskProbability,
      probabilities: data.probabilities,
      modelType: data.modelType,
      modelFile: data.modelFile,
      dataQuality: data.dataQuality,
      // Attach subitizing metadata if present from the payload meta
      ...(payload.condition === 'dyscalculia' && payload.meta?.subitizingMeasurementStatus && {
        subitizingMeasurementStatus: payload.meta.subitizingMeasurementStatus,
      }),
    } satisfies PKLPrediction;

  } catch (err) {
    console.warn(`[HybridEngine] Failed to call ML predict for ${payload.condition}:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main diagnostic engine
// ---------------------------------------------------------------------------

export class HybridDiagnosticEngine {
  /**
   * Run the full hybrid diagnostic pipeline:
   *   1. Build feature payloads (explicit feature mapping)
   *   2. Call Python .pkl inference service for each available condition
   *   3. Aggregate results into a HybridDiagnosticReport
   */
  async diagnose(
    metrics: BiometricMetrics,
    childAge: number,
    engagement?: SessionVisualEngagement | null
  ): Promise<HybridDiagnosticReport> {
    const startTime = performance.now();

    // Build feature payloads for all conditions with game data
    const payloads = buildAllFeaturePayloads(metrics, engagement, childAge);
    const gamesWithData = payloads.length;
    const dataCompleteness = assessDataCompleteness(gamesWithData);

    const reliabilityWarning =
      gamesWithData < 3
        ? `Only ${gamesWithData} game${gamesWithData === 1 ? '' : 's'} completed. ` +
          `For more reliable results, complete at least 3 different games.`
        : undefined;

    // Run all ML predictions in parallel
    const mlStartTime = performance.now();
    const predictionResults = await Promise.all(
      payloads.map(payload => callMLPredict(payload))
    );

    const mlPredictions = predictionResults.filter(
      (p): p is PKLPrediction => p !== null
    );

    const mlAvailable = mlPredictions.length > 0;
    const overallRisk = deriveOverallRisk(mlPredictions);

    const endTime = performance.now();

    console.log('[HybridEngine] Diagnosis complete:', {
      gamesWithData,
      modelsRun: payloads.length,
      mlPredictionsReceived: mlPredictions.length,
      mlServiceAvailable: mlAvailable,
      overallRisk,
      processingMs: (endTime - startTime).toFixed(1),
    });

    return {
      mlPredictions,
      overallRisk,
      mlServiceAvailable: mlAvailable,
      gamesWithData,
      dataCompleteness,
      reliabilityWarning,
      processingTime: {
        mlStage: endTime - mlStartTime,
        totalMs: endTime - startTime,
      },
      timestamp: Date.now(),
    };
  }
}

// Export singleton instance
export const hybridEngine = new HybridDiagnosticEngine();
