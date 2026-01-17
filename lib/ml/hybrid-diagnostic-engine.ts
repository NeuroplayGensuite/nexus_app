/**
 * Hybrid Diagnostic Engine
 * Combines Conventional ML + GenAI + Clinical Datasets
 * 
 * Architecture:
 * Stage 1: Conventional AI (50ms, offline) → Risk Score
 * Stage 2: Dataset Comparison (10ms, offline) → Percentile Rank
 * Stage 3: GenAI Enhancement (2-3s, online) → Clinical Report
 */

import {
    DyslexiaClassifier,
    DysgraphiaClassifier,
    DyscalculiaClassifier,
    DyspraxiaClassifier,
    NVLDClassifier
} from './conventional-classifiers';

import type { BiometricMetrics } from '@/types';

// Classification result from ML models
interface MLClassification {
    disorder: string;
    risk: 'LOW' | 'MODERATE' | 'HIGH';
    probability: number;
    confidence: number;
    features: Record<string, number>;
    threshold: string;
}

// Dataset comparison result
interface DatasetComparison {
    percentile: number;
    rank: string;
    comparedTo: string;
    sampleSize: number;
    deviation: number; // Standard deviations from mean
}

// Final hybrid diagnostic report
interface HybridDiagnosticReport {
    // Stage 1: Conventional ML Results
    mlClassifications: MLClassification[];
    overallRisk: 'LOW' | 'MODERATE' | 'HIGH';

    // Stage 2: Dataset Comparisons
    datasetComparisons: DatasetComparison[];

    // Stage 3: GenAI Enhancement (added later by report generator)
    genAIInsights?: {
        summary: string;
        recommendations: string[];
        culturalContext: string;
    };

    // Meta information
    processingTime: {
        mlStage: number;
        datasetStage: number;
        totalOffline: number;
    };

    confidence: number;
    timestamp: number;
}

export class HybridDiagnosticEngine {
    private classifiers = {
        dyslexia: new DyslexiaClassifier(),
        dysgraphia: new DysgraphiaClassifier(),
        dyscalculia: new DyscalculiaClassifier(),
        dyspraxia: new DyspraxiaClassifier(),
        nvld: new NVLDClassifier()
    };

    /**
     * Main diagnostic function
     * Analyzes all biometric data through hybrid AI pipeline
     */
    async diagnose(metrics: BiometricMetrics, childAge: number): Promise<HybridDiagnosticReport> {
        const startTime = performance.now();

        // STAGE 1: Conventional ML Classification (Offline, Fast)
        const mlStartTime = performance.now();
        const mlClassifications = this.runMLClassifiers(metrics, childAge);
        const mlEndTime = performance.now();

        // STAGE 2: Dataset Comparison (Offline, Fast)
        const datasetStartTime = performance.now();
        const datasetComparisons = this.compareToDatasets(metrics, childAge);
        const datasetEndTime = performance.now();

        // Calculate overall risk (weighted average)
        const overallRisk = this.calculateOverallRisk(mlClassifications);

        // Calculate confidence (based on agreement between classifiers)
        const confidence = this.calculateConfidence(mlClassifications, datasetComparisons);

        return {
            mlClassifications,
            overallRisk,
            datasetComparisons,
            processingTime: {
                mlStage: mlEndTime - mlStartTime,
                datasetStage: datasetEndTime - datasetStartTime,
                totalOffline: datasetEndTime - mlStartTime
            },
            confidence,
            timestamp: Date.now()
        };
    }

    /**
     * STAGE 1: Run all ML classifiers
     */
    private runMLClassifiers(metrics: BiometricMetrics, childAge: number): MLClassification[] {
        const results: MLClassification[] = [];
        const ageMonths = childAge * 12;

        // Dyslexia detection (from Phonic Finder game)
        if (metrics.phonicDelay !== undefined) {
            const features = {
                age_months: ageMonths,
                phonemic_latency_ms: metrics.phonicDelay,
                visual_auditory_error_rate: ((metrics.phonemicSlips || 0) / (metrics.totalAttempts || 1)) * 100,
                rhyme_detection_accuracy: (metrics.accuracy || 0) * 100,
                phonemic_slips: metrics.phonemicSlips || 0
            };

            const result = this.classifiers.dyslexia.predict(features);
            results.push({ disorder: 'dyslexia', ...result });
        }

        // Dysgraphia detection (from Maze game)
        if (metrics.mse !== undefined) {
            const features = {
                age_months: ageMonths,
                mse: metrics.mse,
                jerk_metric: this.calculateJerkFromMetrics(metrics),
                pressure_variance: this.estimatePressureVariance(metrics),
                wall_hugging_percentage: (metrics.wallHuggingRatio || 0) * 100,
                tremor_indicator: metrics.tremorIndicator || 0
            };

            const result = this.classifiers.dysgraphia.predict(features);
            results.push({ disorder: 'dysgraphia', ...result });
        }

        // Dyscalculia detection (from Pizza Party game)
        if (metrics.subitizingThreshold !== undefined) {
            const features = {
                age_months: ageMonths,
                subitizing_speed_ms: metrics.symbolicMappingSpeed || 800,
                subitizing_threshold: metrics.subitizingThreshold,
                counting_accuracy: (metrics.accuracy || 0) * 100,
                symbolic_mapping_delay: metrics.symbolicMappingSpeed || 800
            };

            const result = this.classifiers.dyscalculia.predict(features);
            results.push({ disorder: 'dyscalculia', ...result });
        }

        // Dyspraxia detection (from Sync Master game)
        if (metrics.rhythmAccuracy !== undefined) {
            const features = {
                age_months: ageMonths,
                rhythm_accuracy: metrics.rhythmAccuracy * 100,
                motor_lag_ms: metrics.motorLag || 0,
                sequence_memory_span: this.estimateMemorySpan(metrics),
                missed_beats: metrics.missedBeats || 0,
                coordination_score: metrics.rhythmAccuracy || 0
            };

            const result = this.classifiers.dyspraxia.predict(features);
            results.push({ disorder: 'dyspraxia', ...result });
        }

        // NVLD detection (from Star Mapper game)
        if (metrics.spatialDecay1s !== undefined) {
            const features = {
                age_months: ageMonths,
                spatial_decay_1s: metrics.spatialDecay1s,
                spatial_decay_3s: metrics.spatialDecay3s || 0,
                spatial_decay_5s: metrics.spatialDecay5s || 0,
                visual_memory_score: metrics.visualMemoryScore || 0
            };

            const result = this.classifiers.nvld.predict(features);
            results.push({ disorder: 'nvld', ...result });
        }

        return results;
    }

    /**
     * STAGE 2: Compare metrics to reference datasets
     */
    private compareToDatasets(metrics: BiometricMetrics, childAge: number): DatasetComparison[] {
        const comparisons: DatasetComparison[] = [];

        // Compare to synthetic dataset norms
        // These values are based on our generated datasets

        // Dyslexia comparison (TIMSS-like norms)
        if (metrics.phonicDelay !== undefined) {
            const mean = childAge < 7 ? 1000 : 900;
            const stdDev = 300;
            const deviation = (metrics.phonicDelay - mean) / stdDev;
            const percentile = this.zScoreToPercentile(deviation);

            comparisons.push({
                percentile,
                rank: this.percentileToRank(percentile),
                comparedTo: 'Synthetic Dyslexia Dataset (n=500)',
                sampleSize: 500,
                deviation
            });
        }

        // Dysgraphia comparison (UCI-like norms)
        if (metrics.mse !== undefined) {
            const mean = 30;
            const stdDev = 20;
            const deviation = (metrics.mse - mean) / stdDev;
            const percentile = this.zScoreToPercentile(deviation);

            comparisons.push({
                percentile,
                rank: this.percentileToRank(percentile),
                comparedTo: 'Synthetic Handwriting Dataset (n=500)',
                sampleSize: 500,
                deviation
            });
        }

        // Dyscalculia comparison (TIMSS India norms)
        if (metrics.subitizingThreshold !== undefined) {
            const expectedThreshold = childAge < 7 ? 4 : 5;
            const deviation = (expectedThreshold - metrics.subitizingThreshold);
            const percentile = Math.max(0, Math.min(100, 50 + (deviation * 20)));

            comparisons.push({
                percentile,
                rank: this.percentileToRank(percentile),
                comparedTo: 'Synthetic Number Sense Dataset (n=500)',
                sampleSize: 500,
                deviation
            });
        }

        return comparisons;
    }

    /**
     * Helper: Convert z-score to percentile
     */
    private zScoreToPercentile(z: number): number {
        // Approximate normal CDF
        const t = 1 / (1 + 0.2316419 * Math.abs(z));
        const d = 0.3989423 * Math.exp(-z * z / 2);
        const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

        const percentile = z > 0 ? (1 - p) * 100 : p * 100;
        return Math.max(0, Math.min(100, percentile));
    }

    /**
     * Helper: Convert percentile to readable rank
     */
    private percentileToRank(percentile: number): string {
        if (percentile >= 95) return 'Excellent (Top 5%)';
        if (percentile >= 85) return 'Above Average (Top 15%)';
        if (percentile >= 65) return 'Average (Middle 35%)';
        if (percentile >= 35) return 'Below Average (Lower 35%)';
        if (percentile >= 15) return 'Concerning (Lower 15%)';
        return 'High Risk (Bottom 5%)';
    }

    /**
     * Calculate overall risk from multiple classifiers
     */
    private calculateOverallRisk(classifications: MLClassification[]): 'LOW' | 'MODERATE' | 'HIGH' {
        if (classifications.length === 0) return 'LOW';

        const riskScores = classifications.map(c => {
            if (c.risk === 'HIGH') return 3;
            if (c.risk === 'MODERATE') return 2;
            return 1;
        });

        const avgRiskScore = riskScores.reduce((a, b) => a + b, 0) / riskScores.length;

        if (avgRiskScore >= 2.5) return 'HIGH';
        if (avgRiskScore >= 1.75) return 'MODERATE';
        return 'LOW';
    }

    /**
     * Calculate confidence based on classifier agreement
     */
    private calculateConfidence(
        classifications: MLClassification[],
        comparisons: DatasetComparison[]
    ): number {
        // Average confidence from ML models
        const mlConfidence = classifications.reduce((sum, c) => sum + c.confidence, 0) / classifications.length;

        // Dataset agreement (how many are in expected range)
        const datasetAgreement = comparisons.filter(c => c.percentile >= 20 && c.percentile <= 80).length / Math.max(comparisons.length, 1);

        // Combined confidence
        return (mlConfidence * 0.7 + datasetAgreement * 0.3);
    }

    // Helper functions for feature extraction
    private calculateJerkFromMetrics(metrics: BiometricMetrics): number {
        // Estimate jerk from MSE and tremor
        const baseJerk = (metrics.mse || 0) * 15;
        const tremorBoost = (metrics.tremorIndicator || 0) * 500;
        return baseJerk + tremorBoost;
    }

    private estimatePressureVariance(metrics: BiometricMetrics): number {
        // Estimate from wall hugging and proximity events
        const wallFactor = (metrics.wallHuggingRatio || 0) * 0.5;
        const proximityFactor = ((metrics.proximityEvents || 0) / 100) * 0.3;
        return Math.min(1, wallFactor + proximityFactor);
    }

    private estimateMemorySpan(metrics: BiometricMetrics): number {
        // Estimate from rhythm accuracy
        const accuracy = metrics.rhythmAccuracy || 0;
        if (accuracy >= 0.9) return 6;
        if (accuracy >= 0.75) return 5;
        if (accuracy >= 0.6) return 4;
        if (accuracy >= 0.4) return 3;
        return 2;
    }
}

// Export singleton instance
export const hybridEngine = new HybridDiagnosticEngine();
