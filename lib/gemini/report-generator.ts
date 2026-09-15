/**
 * NeuroGen Suite — Report Generator (v2 — Real PKL Models)
 *
 * Data flow:
 *   BiometricMetrics + SessionVisualEngagement
 *     → hybridEngine.diagnose() [calls real .pkl models via FastAPI]
 *     → PKLPrediction[] (riskProbability per condition)
 *     + clinical-knowledge-base.json (evidence context, NOT a second classifier)
 *     → structured evidence package
 *     → LLM prompt
 *     → structured JSON report
 *
 * LLM role:
 *   The LLM EXPLAINS the ML evidence. It does NOT classify, alter probabilities,
 *   or invent percentiles/Z-scores. The .pkl output is the authoritative risk source.
 */

import { BiometricMetrics } from '@/types';
import type { SessionVisualEngagement } from '@/lib/attention/engagement-types';
import { hybridEngine, type HybridDiagnosticReport, type PKLPrediction } from '@/lib/ml/hybrid-diagnostic-engine';
import clinicalKnowledgeRaw from './clinical-knowledge-base.json';
// Use 'as any' to bypass stale TypeScript type inference from tsbuildinfo;
// the actual runtime structure uses the new 'conditions' key.
const clinicalKnowledge = clinicalKnowledgeRaw as Record<string, unknown>;


// ---------------------------------------------------------------------------
// Age group helper
// ---------------------------------------------------------------------------
function getAgeGroup(age: number): '6-8' | '9-11' | '12-14' {
  if (age >= 6 && age <= 8) return '6-8';
  if (age >= 9 && age <= 11) return '9-11';
  return '12-14';
}

// ---------------------------------------------------------------------------
// Kerala cultural analogies for XAI (Explainable AI)
// Makes neurological concepts relatable for Kerala parents
// ---------------------------------------------------------------------------
const KERALA_ANALOGIES = {
  dysgraphia: {
    motor: "Imagine drawing a kolam (rangoli) with shaky hands after carrying heavy groceries. The patterns may wobble despite knowing the design perfectly. Similarly, your child's brain knows what to write, but the hand muscles need extra practice to follow smoothly.",
    spatial: "Think of parking a car in a tight space in Kochi traffic — some people judge distances naturally, others need more practice. Your child sees letters clearly but needs help judging spaces between them.",
  },
  dyslexia: {
    main: "When we hear 'ka' (ക) vs 'kha' (ഖ), we instantly picture the letters. For some children, this sound-to-letter bridge works like a slow internet connection — the knowledge is there, just loading. With practice, this connection strengthens!",
    phonemic: "It's like hearing a Malayalam song with unclear lyrics — you catch some words but miss others. Your child hears sounds but sometimes maps them to similar-looking letters.",
  },
  dyscalculia: {
    subitizing: "When a vendor quickly counts 4 coconuts without one-by-one counting, that's subitizing! Some children need to count each coconut individually. This isn't a problem — they just use a different counting path.",
    quantity: "Think of a sadya (feast) — most people glance at banana leaves and know how many guests came. Your child may prefer to count each leaf carefully. Both work!",
  },
  dyspraxia: {
    motor: "Like learning Kathakali mudras — some dancers coordinate hand-eye movements instantly, others need more practice for the same beautiful result. Your child's brain-body coordination is still developing its own rhythm.",
    timing: "Remember learning to use a coconut scraper (chirava)? The rhythmic motion comes naturally to some, while others need practice.",
  },
  nvld: {
    spatial: "Navigating through a busy Thrissur Pooram crowd — some people naturally remember which way they came, others prefer clear landmarks. Your child processes visual-spatial information uniquely and benefits from verbal instructions.",
    memory: "Like remembering the route from Ernakulam to a new place in Munnar — some remember turns visually, others need step-by-step directions. Neither is wrong, just different thinking styles!",
  },
};

// ---------------------------------------------------------------------------
// Get clinical context from updated clinical-knowledge-base.json
// ---------------------------------------------------------------------------
type ConditionKey = 'dyslexia' | 'dysgraphia' | 'dyscalculia' | 'dyspraxia' | 'nvld';

function getClinicalContext(condition: string): {
  description: string;
  domains: string[];
  interventions: string[];
  limitations: string;
  assessmentConsiderations: string;
} | null {
  // Normalise dysgraphia-motor / dysgraphia-spatial → dysgraphia
  const baseCondition = condition.split('-')[0];
  const conditionsMap = clinicalKnowledge['conditions'] as Record<string, unknown> | undefined;
  const conditionData = conditionsMap?.[baseCondition];
  if (!conditionData || typeof conditionData !== 'object') return null;

  const data = conditionData as Record<string, unknown>;
  return {
    description: (data.description as string) || '',
    domains: (data.domains as string[]) || [],
    interventions: (data.interventions as string[]) || [],
    limitations: (data.limitations as string) || '',
    assessmentConsiderations: (data.assessmentConsiderations as string) || '',
  };
}

// ---------------------------------------------------------------------------
// Build the structured evidence block from PKL predictions + clinical JSON
// ---------------------------------------------------------------------------
function buildMLEvidenceBlock(
  diagnosis: HybridDiagnosticReport,
  metricsJson: string
): string {
  if (!diagnosis.mlServiceAvailable || diagnosis.mlPredictions.length === 0) {
    return `
## ML ANALYSIS STATUS
The Python ML inference service was not available during this session.
The heuristic baseline analysis below was used instead.
Risk probabilities shown are from rule-based thresholds, NOT from the trained models.
`;
  }

  const predictionsBlock = diagnosis.mlPredictions.map(p => {
    const ctx = getClinicalContext(p.condition);
    const riskFlag = p.riskProbability >= 0.65 ? 'HIGH' :
                     p.riskProbability >= 0.40 ? 'MODERATE' : 'LOW';

    return `
### Condition: ${p.condition.toUpperCase()}
- **Model**: ${p.modelType} (${p.modelFile})
- **Risk Label**: ${p.riskLabel} (class ${p.prediction})
- **riskProbability**: ${(p.riskProbability * 100).toFixed(1)}% (${riskFlag})
- **Probability breakdown**: low_risk=${(p.probabilities.low_risk * 100).toFixed(1)}%, at_risk=${(p.probabilities.at_risk * 100).toFixed(1)}%
- **Data Quality**:
  - Camera available: ${p.dataQuality.cameraAvailable}
  - Features provided: ${p.dataQuality.numericFeaturesProvided}/${p.dataQuality.numericFeaturesTotal}
  - Assessment completeness: ${(p.dataQuality.assessmentCompleteness * 100).toFixed(0)}%
  ${p.dataQuality.missingFeatures.length > 0 ? `- Missing features (imputed by model): ${p.dataQuality.missingFeatures.join(', ')}` : ''}
${p.subitizingMeasurementStatus ? `- Subitizing measurement status: ${p.subitizingMeasurementStatus}` : ''}

**Clinical Domain Context** (from evidence base — NOT a second classifier):
${ctx ? `- Description: ${ctx.description}
- Domains: ${ctx.domains.join(', ')}
- Assessment considerations: ${ctx.assessmentConsiderations}
- Known limitations of game-based measurement: ${ctx.limitations}
- Suggested support/interventions: ${ctx.interventions.join('; ')}` : 'No clinical context available.'}
`;
  }).join('\n---\n');

  return `
## STRUCTURED ML EVIDENCE PACKAGE

### Assessment Summary
- **Overall Risk**: ${diagnosis.overallRisk}
- **ML Service**: Available (${diagnosis.mlPredictions.length} models run)
- **Games with data**: ${diagnosis.gamesWithData}/5
- **Data completeness**: ${diagnosis.dataCompleteness}
${diagnosis.reliabilityWarning ? `- **WARNING**: ${diagnosis.reliabilityWarning}` : ''}
- **Processing time**: ${diagnosis.processingTime.totalMs.toFixed(1)}ms

### Per-Condition ML Predictions (Logistic Regression .pkl)
${predictionsBlock}

### Normative Data Availability
Most NeuroGen metrics do NOT have validated clinical normative distributions.
normativeDataAvailable: false for all metrics EXCEPT subitizingThreshold (Butterworth 1999 reference).
DO NOT generate Z-scores, percentiles, or prevalence statistics for metrics without this basis.
`;
}

// ---------------------------------------------------------------------------
// Prompt language instructions
// ---------------------------------------------------------------------------
const LANGUAGE_INSTRUCTIONS: Record<'en' | 'ml' | 'hi', string> = {
  en: 'Write the entire report in English. Use Kerala-specific analogies from the provided examples to explain concepts to parents.',
  ml: 'Write the action plan section in Malayalam (മലയാളം). Keep medical terms in English for clarity. Use Kerala-specific cultural references.',
  hi: 'Write the action plan section in Hindi (हिंदी). Keep medical terms in English for clarity.',
};

// ---------------------------------------------------------------------------
// Main prompt generator
// ---------------------------------------------------------------------------
export async function generateGeminiPrompt(
  metrics: BiometricMetrics,
  childAge: number,
  language: 'en' | 'ml' | 'hi' = 'en',
  engagement?: SessionVisualEngagement | null
): Promise<string> {
  const metricsJson = JSON.stringify(metrics, null, 2);
  const ageGroup = getAgeGroup(childAge);

  // Run the real .pkl models
  const hybridDiagnosis = await hybridEngine.diagnose(metrics, childAge, engagement);

  console.log('[ReportGenerator] Hybrid diagnosis:', {
    mlAvailable: hybridDiagnosis.mlServiceAvailable,
    predictions: hybridDiagnosis.mlPredictions.length,
    overallRisk: hybridDiagnosis.overallRisk,
  });

  const mlEvidenceBlock = buildMLEvidenceBlock(hybridDiagnosis, metricsJson);
  const keralaAnalogiesJson = JSON.stringify(KERALA_ANALOGIES, null, 2);

  // Identify conditions flagged as moderate or high risk for the output format hint
  const flaggedConditions = hybridDiagnosis.mlPredictions
    .filter(p => p.riskProbability >= 0.40)
    .map(p => p.condition);

  return `You are a Pediatric Neuro-Developmental Specialist with 20+ years of experience in
Learning Disabilities assessment. You are compassionate, thorough, and evidence-based.

## Assessment Context
A ${childAge}-year-old child from Kerala, India completed neurodevelopmental game-based
assessments. This is a RESEARCH PROTOTYPE for behavioral screening — NOT a clinical diagnosis.

## Your Role
You EXPLAIN and contextualize the structured evidence below.
You MUST NOT:
- Generate, modify, or invent numerical risk probabilities or percentiles
- Alter the riskProbability values from the ML models
- Create Z-scores for metrics where normativeDataAvailable = false
- Make diagnostic claims that override the ML model output
- Invent statistics that are not present in the evidence package

The trained Logistic Regression .pkl models are the authoritative source of risk probability.
The clinical knowledge JSON provides domain context, metric meaning, and intervention guidance.

## Raw Biometric Metrics
\`\`\`json
${metricsJson}
\`\`\`

${mlEvidenceBlock}

## XAI (Explainable AI) — Kerala Cultural Analogies
Use these to make neurological concepts relatable for parents:
\`\`\`json
${keralaAnalogiesJson}
\`\`\`

## Language Instructions
${LANGUAGE_INSTRUCTIONS[language]}

## Required Output Format (JSON only — no markdown outside the code block)

\`\`\`json
{
  "executiveSummary": "Empathetic summary for parents. State which conditions the ML models flagged, at what probability, and that this is a screening tool not a diagnosis. Max 3 sentences.",
  "findings": [
    {
      "condition": "Use exact condition name from ML predictions above",
      "riskLabel": "at_risk OR low_risk (from model output)",
      "riskProbability": "copy the riskProbability value exactly as decimal e.g. 0.72",
      "modelUsed": "LogisticRegression (dyslexia.pkl)",
      "evidence": ["Specific metrics that contributed e.g. phonicDelay=2100ms", "..."],
      "dailyLifeImpact": "Practical examples of how this affects the child",
      "keralaAnalogy": "Use the relevant Kerala analogy to explain this to parents"
    }
  ],
  "metricsExplained": {
    "metricName": "What this metric measures and what the child's value means (do NOT invent percentiles if normativeDataAvailable=false)"
  },
  "dataQualityNotes": "Note any missing features, camera unavailability, or incomplete assessment that parents should be aware of",
  "actionPlan": {
    "week1": ["Immediate steps — schedule evaluation, document observations"],
    "week2": ["Begin targeted home activities based on flagged conditions"],
    "week3": ["Continue practice, introduce adaptive tools"],
    "week4": ["Review progress, communicate with school/teachers"]
  },
  "referrals": ["Specialist recommendations based on flagged conditions"],
  "positiveNotes": ["Observed strengths across all games"],
  "disclaimer": "This screening tool is a research prototype. Results should be reviewed by a qualified professional before any decisions are made.",
  "parentMessage": "Encouraging, culturally sensitive message"
}
\`\`\`

${flaggedConditions.length === 0 ? `
IMPORTANT: All ML models returned LOW risk. Generate a POSITIVE, celebratory report:
- Highlight strengths observed in each game
- Confirm age-appropriate performance
- No specialist referrals needed
- Encourage continued monitoring through play
` : `
IMPORTANT: The following conditions were flagged by the ML models: ${flaggedConditions.join(', ')}.
Base your findings ONLY on these flagged conditions. Do not fabricate findings for unflagged conditions.
`}
`;
}

// ---------------------------------------------------------------------------
// Parse AI response
// ---------------------------------------------------------------------------
export function parseGeminiResponse(response: string): Record<string, unknown> | null {
  try {
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return ensureActionPlan(parsed);
    }

    const rawJsonMatch = response.match(/\{[\s\S]*\}/);
    if (rawJsonMatch) {
      const parsed = JSON.parse(rawJsonMatch[0]);
      return ensureActionPlan(parsed);
    }

    return null;
  } catch (error) {
    console.error('[ReportGenerator] Failed to parse AI response:', error);
    return null;
  }
}

function ensureActionPlan(report: Record<string, unknown>): Record<string, unknown> {
  const defaultWeek = (week: number) => [`Continue week ${week} support plan`, 'Maintain positive encouragement'];
  if (!report.actionPlan || typeof report.actionPlan !== 'object') {
    report.actionPlan = {
      week1: ['Schedule professional evaluation', 'Begin daily 15-minute skill-building activities', 'Document specific challenges observed'],
      week2: ['Start targeted interventions based on findings', 'Continue structured practice', 'Track progress weekly'],
      week3: ['Continue structured practice', 'Introduce adaptive tools if recommended', 'Celebrate small wins'],
      week4: ['Review progress with specialists', 'Adjust strategies as needed', 'Plan long-term support'],
    };
  } else {
    const plan = report.actionPlan as Record<string, unknown>;
    for (let w = 1; w <= 4; w++) {
      const key = `week${w}`;
      if (!plan[key] || !Array.isArray(plan[key]) || (plan[key] as unknown[]).length === 0) {
        plan[key] = defaultWeek(w);
      }
    }
  }
  return report;
}

// ---------------------------------------------------------------------------
// Fallback report (used when AI APIs are all unavailable)
// Uses heuristic metric checks — clearly labelled as NOT from trained models
// Updated for new clinical-knowledge-base.json schema (conditions key)
// ---------------------------------------------------------------------------
export function generateFallbackReport(
  metrics: BiometricMetrics,
  childAge: number = 8
): Record<string, unknown> {
  const ageGroup = getAgeGroup(childAge);
  const concerns: Array<{ condition: string; evidence: string[] }> = [];

  // Simple heuristic checks — these are NOT the trained models
  // They only fire when the Python service is unavailable

  if (metrics.phonicDelay && metrics.phonicDelay > 2500) {
    concerns.push({
      condition: 'dyslexia',
      evidence: [`Response time of ${metrics.phonicDelay}ms is elevated (heuristic threshold: 2500ms)`],
    });
  }

  if (metrics.mse && metrics.mse > 100) {
    concerns.push({
      condition: 'dysgraphia',
      evidence: [`Maze MSE of ${metrics.mse.toFixed(1)} is elevated (heuristic threshold: 100)`],
    });
  }

  if (metrics.subitizingThreshold !== undefined && metrics.subitizingThreshold < 2) {
    const subitizingNote = metrics.subitizingFailed
      ? `Subitizing task was not completed successfully (subitizingFailed=true)`
      : `Subitizing threshold of ${metrics.subitizingThreshold} is below expected range (heuristic: <2)`;
    concerns.push({ condition: 'dyscalculia', evidence: [subitizingNote] });
  }

  if (metrics.rhythmAccuracy !== undefined && metrics.rhythmAccuracy < 0.55) {
    concerns.push({
      condition: 'dyspraxia',
      evidence: [`Rhythm accuracy of ${(metrics.rhythmAccuracy * 100).toFixed(1)}% is below heuristic threshold (55%)`],
    });
  }

  if (metrics.spatialDecay1s !== undefined && metrics.visualMemoryScore !== undefined && metrics.visualMemoryScore < 55) {
    concerns.push({
      condition: 'nvld',
      evidence: [`Visual memory score of ${metrics.visualMemoryScore.toFixed(1)} is below heuristic threshold (55)`],
    });
  }

  // Positive report
  if (concerns.length === 0) {
    return {
      executiveSummary: `All available heuristic checks show no significant concerns for a ${childAge}-year-old child. Note: The ML inference service was unavailable — these results are from rule-based fallback only.`,
      findings: [],
      metricsExplained: {
        note: `Metrics were compared against simple heuristic thresholds. The trained .pkl models were not available for this assessment.`,
        ageGroup: `Assessment age group: ${ageGroup} years`,
      },
      dataQualityNotes: 'ML inference service was unavailable. Results are from heuristic fallback only and should not be used for any decision-making.',
      actionPlan: {
        week1: ['Continue regular play and exploration', 'Encourage creative expression'],
        week2: ['Maintain balance of structured and free play', 'Read together daily'],
        week3: ['Engage in physical activities: sports, dance, climbing', 'Art and craft projects'],
        week4: ['Review progress, celebrate strengths', 'Keep communication open with teachers'],
      },
      referrals: [],
      positiveNotes: [
        'Engaged with assessment activities',
        'No significant heuristic concerns identified',
      ],
      disclaimer: 'This is a heuristic fallback report generated without the trained ML models. It should not be used for any clinical or educational decisions.',
      parentMessage: "Your child completed the assessment activities. For a more detailed analysis, please ensure the ML service is running and regenerate the report.",
      source: 'heuristic-fallback',
    };
  }

  // Concern-based fallback report
  const findings = concerns.map(c => {
    const ctx = getClinicalContext(c.condition);
    return {
      condition: c.condition,
      riskLabel: 'flagged-by-heuristic',
      riskProbability: null,
      modelUsed: 'heuristic-fallback (trained model unavailable)',
      evidence: c.evidence,
      dailyLifeImpact: ctx?.description || 'May affect daily learning activities',
      keralaAnalogy: null,
    };
  });

  const referrals = concerns.map(c => {
    if (c.condition.includes('dysgraphia')) return 'Occupational Therapist specializing in handwriting';
    if (c.condition.includes('dyslexia')) return 'Educational Psychologist or Reading Specialist';
    if (c.condition.includes('dyscalculia')) return 'Math Learning Specialist';
    if (c.condition.includes('dyspraxia')) return 'Physical/Occupational Therapist for motor planning';
    if (c.condition.includes('nvld')) return 'Neuropsychologist for comprehensive assessment';
    return 'Developmental Pediatrician for detailed evaluation';
  });

  return {
    executiveSummary: `Heuristic screening flagged ${concerns.length} area(s) for attention. IMPORTANT: The trained ML models were unavailable — these results are from simple rule-based fallback only and require professional validation.`,
    findings,
    metricsExplained: {
      note: 'Results are from heuristic rule-based fallback. The trained .pkl Logistic Regression models were not available. Start the ML service and regenerate for accurate predictions.',
      ageGroup: `Age group: ${ageGroup} years`,
    },
    dataQualityNotes: 'ML inference service was unavailable. Results are from heuristic fallback only.',
    actionPlan: {
      week1: ['Schedule professional evaluation — do not rely on this screening alone', 'Document specific challenges observed at home and school'],
      week2: ['Consult school counselor or GP', 'Continue encouragement and positive learning environment'],
      week3: ['Follow professional recommendations', 'Maintain regular routines'],
      week4: ['Review professional feedback', 'Plan long-term support if indicated'],
    },
    referrals,
    positiveNotes: [
      'Child completed the assessment activities',
      'Early identification enables more effective support',
    ],
    disclaimer: 'This is a HEURISTIC FALLBACK report. The trained ML models were unavailable. Results must not be used for clinical or educational decisions without professional review.',
    parentMessage: "Some areas were flagged for attention, but please remember this is a prototype screening tool using simplified rules (not the trained AI models). Consult a professional for proper evaluation.",
    source: 'heuristic-fallback',
  };
}
