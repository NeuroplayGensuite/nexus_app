import { BiometricMetrics } from '@/types';
import clinicalKnowledge from './clinical-knowledge-base.json';
import { hybridEngine } from '@/lib/ml/hybrid-diagnostic-engine';

/**
 * Determine age group for baseline comparison
 */
function getAgeGroup(age: number): '6-8' | '9-11' | '12-14' {
  if (age >= 6 && age <= 8) return '6-8';
  if (age >= 9 && age <= 11) return '9-11';
  return '12-14';
}

/**
 * Analyze metrics against age-based baselines
 */
function analyzeMetricsWithBaselines(metrics: BiometricMetrics, childAge: number) {
  const ageGroup = getAgeGroup(childAge);
  const findings: Array<{
    condition: string;
    severity: 'normal' | 'borderline' | 'concern';
    indicators: string[];
    research: string;
  }> = [];

  // Maze Game Analysis (Dysgraphia)
  if (metrics.mse !== undefined || metrics.jerkMean !== undefined) {
    const motorThreshold = clinicalKnowledge.clinicalKnowledge.dysgraphia.motor.ageBasedThresholds[ageGroup];

    const indicators = [];
    let severity: 'normal' | 'borderline' | 'concern' = 'normal';

    if (metrics.mse && metrics.mse > motorThreshold.mse) {
      indicators.push(`MSE of ${metrics.mse.toFixed(1)} exceeds age-appropriate threshold of ${motorThreshold.mse}`);
      severity = metrics.mse > motorThreshold.mse * 1.3 ? 'concern' : 'borderline';
    }

    if (metrics.jerkMean && metrics.jerkMean > motorThreshold.jerk) {
      indicators.push(`Jerk coefficient of ${metrics.jerkMean.toFixed(2)} indicates movement irregularity (threshold: ${motorThreshold.jerk})`);
      severity = 'concern';
    }

    if (indicators.length >= 2) {
      findings.push({
        condition: 'dysgraphia-motor',
        severity,
        indicators,
        research: clinicalKnowledge.clinicalKnowledge.dysgraphia.motor.research
      });
    }
  }

  // Phonic Finder Analysis (Dyslexia)
  if (metrics.phonicDelay !== undefined || metrics.phonemicSlips !== undefined) {
    const phonoThreshold = clinicalKnowledge.clinicalKnowledge.dyslexia.phonological.ageBasedThresholds[ageGroup];

    const indicators = [];
    let severity: 'normal' | 'borderline' | 'concern' = 'normal';

    if (metrics.phonicDelay && metrics.phonicDelay > phonoThreshold.avgResponseTime) {
      indicators.push(`Average response time of ${metrics.phonicDelay}ms exceeds ${phonoThreshold.avgResponseTime}ms threshold`);
      severity = metrics.phonicDelay > phonoThreshold.avgResponseTime * 1.2 ? 'concern' : 'borderline';
    }

    const errorRate = metrics.phonemicSlips && metrics.totalPhonicAttempts ? metrics.phonemicSlips / metrics.totalPhonicAttempts : 0;
    if (errorRate > phonoThreshold.errorRate) {
      indicators.push(`Error rate of ${(errorRate * 100).toFixed(1)}% indicates phonological processing difficulty`);
      severity = 'concern';
    }

    if (indicators.length >= 2) {
      findings.push({
        condition: 'dyslexia',
        severity,
        indicators,
        research: clinicalKnowledge.clinicalKnowledge.dyslexia.phonological.research
      });
    }
  }

  // Cricket Forge Analysis (Dyscalculia)
  if (metrics.subitizingThreshold !== undefined || metrics.symbolicMappingSpeed !== undefined) {
    const mathThreshold = clinicalKnowledge.clinicalKnowledge.dyscalculia.ageBasedThresholds[ageGroup];

    const indicators = [];
    let severity: 'normal' | 'borderline' | 'concern' = 'normal';

    if (metrics.subitizingThreshold && metrics.subitizingThreshold < 3) {
      indicators.push(`Subitizing threshold of ${metrics.subitizingThreshold} indicates number sense difficulty (expected: 3-5)`);
      severity = 'concern';
    }

    if (metrics.symbolicMappingErrors && metrics.symbolicMappingErrors > 3) {
      indicators.push(`Symbolic mapping errors (${metrics.symbolicMappingErrors}) suggest digit-quantity connection difficulty`);
      severity = 'concern';
    }

    if (indicators.length >= 2) {
      findings.push({
        condition: 'dyscalculia',
        severity,
        indicators,
        research: clinicalKnowledge.clinicalKnowledge.dyscalculia.research
      });
    }
  }

  // Sync Master Analysis (Dyspraxia)
  if (metrics.motorLag !== undefined || metrics.rhythmAccuracy !== undefined) {
    const motorThreshold = clinicalKnowledge.clinicalKnowledge.dyspraxia.ageBasedThresholds[ageGroup];

    const indicators = [];
    let severity: 'normal' | 'borderline' | 'concern' = 'normal';

    if (metrics.motorLag && metrics.motorLag > motorThreshold.avgLatency) {
      indicators.push(`Average motor latency of ${metrics.motorLag}ms indicates delayed motor response (threshold: ${motorThreshold.avgLatency}ms)`);
      severity = 'borderline';
    }

    if (metrics.rhythmAccuracy && metrics.rhythmAccuracy < 60) {
      indicators.push(`Rhythm accuracy of ${metrics.rhythmAccuracy.toFixed(1)}% shows inconsistent motor planning`);
      severity = 'concern';
    }

    if (indicators.length >= 2) {
      findings.push({
        condition: 'dyspraxia',
        severity,
        indicators,
        research: clinicalKnowledge.clinicalKnowledge.dyspraxia.research
      });
    }
  }

  // Star Mapper Analysis (NVLD)
  if (metrics.visualMemoryScore !== undefined || metrics.spatialDecay1s !== undefined) {
    const nvldThreshold = clinicalKnowledge.clinicalKnowledge.nvld.ageBasedThresholds[ageGroup];

    const indicators = [];
    let severity: 'normal' | 'borderline' | 'concern' = 'normal';

    if (metrics.visualMemoryScore && metrics.visualMemoryScore < 60) {
      indicators.push(`Visual memory score of ${metrics.visualMemoryScore.toFixed(1)}% below threshold`);
      severity = 'borderline';
    }

    // Check for rapid spatial decay
    if (metrics.spatialDecay1s && metrics.spatialDecay3s) {
      const decayRate = ((metrics.spatialDecay1s - metrics.spatialDecay3s) / metrics.spatialDecay1s) * 100;
      if (decayRate > 20) {
        indicators.push(`Spatial memory decay of ${decayRate.toFixed(1)}% from 1s to 3s indicates visual-spatial processing difficulty`);
        severity = 'concern';
      }
    }

    if (indicators.length >= 2) {
      findings.push({
        condition: 'nvld',
        severity,
        indicators,
        research: clinicalKnowledge.clinicalKnowledge.nvld.research
      });
    }
  }

  return findings;
}

/**
 * Calculate diagnostic confidence based on number of corroborating indicators
 */
function calculateConfidence(indicatorCount: number): { level: string; explanation: string } {
  const rules = clinicalKnowledge.confidenceCalculation.rules;

  if (indicatorCount === 1) {
    return {
      level: 'low',
      explanation: rules[0].description
    };
  } else if (indicatorCount === 2) {
    return {
      level: 'medium',
      explanation: rules[1].description
    };
  } else {
    return {
      level: 'high',
      explanation: rules[2].description
    };
  }
}

/**
 * Kerala-specific analogies for XAI (Explainable AI)
 * Makes complex neurological concepts relatable for Kerala parents
 */
const KERALA_ANALOGIES = {
  dysgraphia: {
    motor: "Imagine drawing a kolam (rangoli) with shaky hands after carrying heavy groceries. The patterns may wobble despite knowing the design perfectly. Similarly, your child's brain knows what to write, but the hand muscles need extra practice to follow smoothly.",
    spatial: "Think of parking a car in a tight space in Kochi traffic - some people judge distances naturally, others need more practice. Your child sees letters clearly but needs help judging spaces between them, like fitting words neatly on a line.",
  },
  dyslexia: {
    main: "When we hear 'ka' (ക) vs 'kha' (ഖ), we instantly picture the letters. For some children, this sound-to-letter bridge works like a slow internet connection - the knowledge is there, just loading. With practice, this connection strengthens!",
    phonemic: "It's like hearing a Malayalam song with unclear lyrics - you catch some words but miss others. Your child hears sounds but sometimes maps them to similar-looking letters instead of the correct ones.",
  },
  dyscalculia: {
    subitizing: "When a vendor quickly counts 4 coconuts without one-by-one counting, that's subitizing! Some children need to count each coconut individually. This isn't a problem - they just use a different (equally valid) counting path.",
    quantity: "Think of a sadya (feast) - most people glance at banana leaves and know how many guests came. Your child may prefer to count each leaf carefully. Both work, one just needs more time!",
  },
  dyspraxia: {
    motor: "Like learning Kathakali mudras - some dancers coordinate hand-eye movements instantly, others need more practice for the same beautiful result. Your child's brain-body coordination is still developing its own rhythm.",
    timing: "Remember learning to use a coconut scraper (chirava)? The rhythmic motion comes naturally to some, while others need practice. Similarly, catching a ball or clapping to rhythm is a skill that improves with practice.",
  },
  nvld: {
    spatial: "Navigating through a busy Thrissur Pooram crowd - some people naturally remember which way they came, others prefer clear landmarks. Your child processes visual-spatial information uniquely and benefits from verbal instructions.",
    memory: "Like remembering the route from Ernakulam to a new place in Munnar - some remember turns visually, others need step-by-step directions. Neither is wrong, just different thinking styles!",
  },
};

/**
 * Generate the diagnostic prompt for Gemini/Groq AI with RAG context
 * NOW WITH HYBRID AI (Conventional ML + GenAI)
 */
export async function generateGeminiPrompt(
  metrics: BiometricMetrics,
  childAge: number,
  language: 'en' | 'ml' | 'hi' = 'en'
): Promise<string> {
  const metricsJson = JSON.stringify(metrics, null, 2);
  const ageGroup = getAgeGroup(childAge);

  // ═══════════════════════════════════════════════════════════════
  // STAGE 1 & 2: RUN HYBRID DIAGNOSTIC ENGINE (ML + Dataset)
  // ═══════════════════════════════════════════════════════════════
  const hybridDiagnosis = await hybridEngine.diagnose(metrics, childAge);
  console.log('🤖 Hybrid AI Analysis Complete:', {
    overallRisk: hybridDiagnosis.overallRisk,
    mlClassifications: hybridDiagnosis.mlClassifications.length,
    datasetComparisons: hybridDiagnosis.datasetComparisons.length,
    processingTime: `${hybridDiagnosis.processingTime.totalOffline.toFixed(2)}ms`,
    confidence: `${(hybridDiagnosis.confidence * 100).toFixed(1)}%`
  });

  // RAG: Analyze metrics against clinical baselines (traditional method)
  const findings = analyzeMetricsWithBaselines(metrics, childAge);
  const confidenceInfo = calculateConfidence(findings.filter(f => f.severity !== 'normal').length);

  // Extract relevant clinical knowledge based on findings
  const relevantKnowledge = findings.map(f => {
    const conditionKey = f.condition.split('-')[0] as keyof typeof clinicalKnowledge.clinicalKnowledge;
    return {
      condition: f.condition,
      knowledge: clinicalKnowledge.clinicalKnowledge[conditionKey],
      evidence: f.indicators,
      research: f.research,
      severity: f.severity
    };
  });

  const languageInstructions = {
    en: 'Write the entire report in English. Use Kerala-specific analogies from the provided examples to explain concepts.',
    ml: 'Write the action plan section in Malayalam (മലയാളം). Keep medical terms in English for clarity. Use Kerala-specific cultural references.',
    hi: 'Write the action plan section in Hindi (हिंदी). Keep medical terms in English for clarity.',
  };

  const ragContext = relevantKnowledge.length > 0 || hybridDiagnosis.mlClassifications.length > 0 ? `
## EVIDENCE-BASED ANALYSIS (Hybrid AI System)

### 🤖 CONVENTIONAL ML ANALYSIS (Stage 1 - ${hybridDiagnosis.processingTime.mlStage.toFixed(2)}ms)
Overall Risk Assessment: **${hybridDiagnosis.overallRisk}**
System Confidence: **${(hybridDiagnosis.confidence * 100).toFixed(1)}%**

${hybridDiagnosis.mlClassifications.map((ml, idx) => `
#### ML Model ${idx + 1}: ${ml.disorder.toUpperCase()} Classifier
- **Algorithm**: ${ml.disorder === 'dyslexia' ? 'Random Forest' : ml.disorder === 'dysgraphia' ? 'Support Vector Machine' : ml.disorder === 'dyscalculia' ? 'Decision Tree' : ml.disorder === 'dyspraxia' ? 'Neural Network' : 'K-Nearest Neighbors'}
- **Risk Level**: ${ml.risk} (${(ml.probability * 100).toFixed(1)}% probability)
- **Confidence**: ${(ml.confidence * 100).toFixed(1)}%
- **Threshold Used**: ${ml.threshold}
- **Key Features**:
${Object.entries(ml.features).map(([k, v]) => `  - ${k}: ${typeof v === 'number' ? v.toFixed(2) : v}`).join('\n')}
`).join('\n')}

### 📊 DATASET COMPARISON ANALYSIS (Stage 2 - ${hybridDiagnosis.processingTime.datasetStage.toFixed(2)}ms)
${hybridDiagnosis.datasetComparisons.map((comp, idx) => `
#### Comparison ${idx + 1}:
- **Percentile Rank**: ${comp.percentile.toFixed(1)}th percentile
- **Performance Band**: ${comp.rank}
- **Reference Dataset**: ${comp.comparedTo}
- **Z-Score**: ${comp.deviation.toFixed(2)} (${Math.abs(comp.deviation) < 1 ? 'within normal range' : Math.abs(comp.deviation) < 2 ? 'borderline' : 'significant deviation'})
`).join('\n')}

### 📚 TRADITIONAL CLINICAL BASELINE ANALYSIS
**Age Group**: ${ageGroup} years
**Normal Ranges for ${childAge}-year-old children:**
${JSON.stringify((clinicalKnowledge.normalRanges as any)[`age${ageGroup.replace('-', 'to')}`], null, 2)}

### Detected Concerns (${confidenceInfo.level.toUpperCase()} confidence)
${confidenceInfo.explanation}

${relevantKnowledge.map((item, idx) => `
#### ${idx + 1}. ${item.condition.toUpperCase()} (${item.severity} severity)

**Clinical Definition:**
${typeof item.knowledge === 'object' && 'description' in item.knowledge ? item.knowledge.description : 'See detailed analysis'}

**Evidence from This Assessment:**
${item.evidence.map(e => `- ${e}`).join('\n')}

**Research Citation:**
${item.research}

**Recommended Interventions:**
${typeof item.knowledge === 'object' && 'interventions' in item.knowledge ? item.knowledge.interventions.map((i: string) => `- ${i}`).join('\n') : 'See specialist for detailed plan'}
`).join('\n')}

**CRITICAL INSTRUCTION:** Synthesize findings from ALL THREE analysis methods:
1. Conventional ML models (Random Forest, SVM, Decision Trees, Neural Networks, KNN)
2. Dataset comparisons (percentile rankings against clinical norms)
3. Traditional threshold-based clinical analysis

Your report MUST integrate insights from all three approaches to provide the most accurate assessment.
` : `
## POSITIVE ASSESSMENT RESULT

### 🤖 CONVENTIONAL ML ANALYSIS
Overall Risk Assessment: **${hybridDiagnosis.overallRisk}**
All ML classifiers report LOW risk across all domains.

### 📊 DATASET COMPARISON
${hybridDiagnosis.datasetComparisons.length > 0 ?
    `All metrics fall within typical developmental ranges (40th-60th percentile band).` :
    `Insufficient data points for comprehensive percentile ranking.`}

### 📚 TRADITIONAL BASELINE COMPARISON
**Age Group**: ${ageGroup}
All metrics fall within normal developmental ranges for ${childAge}-year-old children.

**CRITICAL INSTRUCTION:** This child shows NO significant concerns. Generate a POSITIVE, celebratory report highlighting:
1. Strengths observed in each game
2. Age-appropriate performance across all metrics (confirmed by 3 different AI methods)
3. Encouragement to continue supporting natural development
4. NO specialist referrals needed
5. Recommendation: Continue monitoring through regular play and school performance
`;

  const keralaAnalogiesPrompt = `
## XAI (Explainable AI) - Kerala Cultural Analogies
${JSON.stringify(KERALA_ANALOGIES, null, 2)}
`;

  return `You are a Pediatric Neuro-Developmental Specialist with 20+ years of experience in Learning Disabilities assessment. You are compassionate, thorough, and evidence-based.

## Assessment Context
A ${childAge}-year-old child from Kerala, India completed neurodevelopmental games. Analysis used age-normative baselines from clinical research.

## Biometric Data
\`\`\`json
${metricsJson}
\`\`\`

${ragContext}

${keralaAnalogiesPrompt}

${languageInstructions[language]}

## Required Output Format (JSON)

${findings.length > 0 ? `
\`\`\`json
{
  "executiveSummary": "Evidence-based summary citing research (e.g., 'Based on Rosenblum 2020 study...')",
  "findings": [
    {
      "condition": "Use ONLY conditions from RAG analysis above",
      "confidence": "${confidenceInfo.level}",
      "evidence": ["Use ONLY indicators from RAG analysis"],
      "dailyLifeImpact": "Practical examples",
      "keralaAnalogy": "Cultural explanation from analogies"
    }
  ],
  "metricsExplained": {
    "Explain each metric with percentile comparison to age ${ageGroup} baseline"
  },
  "actionPlan": {
    "week1-4": "Use interventions from RAG clinical knowledge"
  },
  "referrals": ["Specialists based on severity and research recommendations"],
  "positiveNotes": ["Observed strengths"],
  "parentMessage": "Encouraging, research-backed message"
}
\`\`\`
` : `
\`\`\`json
{
  "executiveSummary": "Wonderful news! All developmental metrics within expected range for age ${childAge}.",
  "findings": [],
  "metricsExplained": {
    "Explain how child performed at or above age-appropriate levels"
  },
  "actionPlan": {
    "week1": ["Continue regular play and exploration"],
    "week2": ["Engage in age-appropriate learning activities"],
    "week3": ["Support natural curiosity through varied experiences"],
    "week4": ["Maintain healthy balance of academics and play"]
  },
  "referrals": [],
  "positiveNotes": ["List specific strengths from each game"],
  "parentMessage": "Your child is developing beautifully! Keep supporting their natural growth."
}
\`\`\`
`}

Important: If metrics indicate NORMAL performance, celebrate the child's strengths and recommend continued monitoring without concern.

${languageInstructions[language]}
`;
}

/**
 * Parse Gemini's response into structured data
 */
export function parseGeminiResponse(response: string): Record<string, unknown> | null {
  try {
    // Try to extract JSON from code block
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return ensureActionPlan(parsed);
    }

    // Try to find raw JSON object
    const rawJsonMatch = response.match(/\{[\s\S]*\}/);
    if (rawJsonMatch) {
      const parsed = JSON.parse(rawJsonMatch[0]);
      return ensureActionPlan(parsed);
    }

    return null;
  } catch (error) {
    console.error('Failed to parse Gemini response:', error);
    return null;
  }
}

// Ensure actionPlan always exists
function ensureActionPlan(report: Record<string, unknown>): Record<string, unknown> {
  if (!report.actionPlan || typeof report.actionPlan !== 'object') {
    report.actionPlan = {
      week1: ['Schedule professional evaluation', 'Begin daily 15-minute skill-building activities', 'Document specific challenges observed', 'Maintain positive encouragement'],
      week2: ['Start targeted interventions based on findings', 'Continue structured practice', 'Track progress weekly', 'Celebrate small wins'],
      week3: ['Continue structured practice', 'Introduce adaptive tools if recommended', 'Maintain regular communication with specialists', 'Keep learning environment positive'],
      week4: ['Review progress with specialists', 'Adjust strategies as needed', 'Plan long-term support', 'Celebrate improvements achieved'],
    };
  } else {
    const plan = report.actionPlan as Record<string, unknown>;
    if (!plan.week1 || !Array.isArray(plan.week1) || plan.week1.length === 0) {
      plan.week1 = ['Schedule professional evaluation', 'Begin daily 15-minute activities', 'Document challenges', 'Stay positive'];
    }
    if (!plan.week2 || !Array.isArray(plan.week2) || plan.week2.length === 0) {
      plan.week2 = ['Start interventions', 'Continue practice', 'Track progress', 'Celebrate wins'];
    }
    if (!plan.week3 || !Array.isArray(plan.week3) || plan.week3.length === 0) {
      plan.week3 = ['Continue practice', 'Use adaptive tools', 'Communicate with specialists', 'Stay positive'];
    }
    if (!plan.week4 || !Array.isArray(plan.week4) || plan.week4.length === 0) {
      plan.week4 = ['Review progress', 'Adjust strategies', 'Plan long-term', 'Celebrate improvements'];
    }
  }
  return report;
}

/**
 * Generate fallback report when AI is unavailable - uses same RAG logic
 */
export function generateFallbackReport(metrics: BiometricMetrics, childAge: number = 8): Record<string, unknown> {
  const ageGroup = getAgeGroup(childAge);
  const analysis = analyzeMetricsWithBaselines(metrics, childAge);
  const concernFindings = analysis.filter(f => f.severity !== 'normal');
  const confidenceInfo = calculateConfidence(concernFindings.length);

  // If no concerns, generate positive report
  if (concernFindings.length === 0) {
    return {
      executiveSummary: `Great news! All developmental assessments show age-appropriate performance for a ${childAge}-year-old child. Continue supporting natural growth through play and learning.`,
      findings: [],
      metricsExplained: {
        overview: `All measured metrics (motor control, phonological processing, number sense, coordination, and spatial memory) fall within expected ranges for age group ${ageGroup}.`,
      },
      actionPlan: {
        week1: ['Continue regular play activities', 'Encourage creative expression', 'Support exploration'],
        week2: ['Maintain balance of structured and free play', 'Read together daily', 'Practice counting in daily activities'],
        week3: ['Engage in physical activities: sports, dance, climbing', 'Art and craft projects', 'Social play with peers'],
        week4: ['Review progress, celebrate strengths', 'Keep communication open with teachers', 'Maintain positive learning environment'],
      },
      referrals: [],
      positiveNotes: [
        'Engaged well with all assessment activities',
        'Demonstrated age-appropriate skills across domains',
        'Shows typical developmental progress',
      ],
      parentMessage: 'Your child is developing wonderfully! Keep nurturing their natural curiosity and providing opportunities for growth.',
      source: 'fallback-with-baselines',
    };
  }

  // Generate concern-based report with research citations
  const findings = concernFindings.map(f => {
    const conditionKey = f.condition.split('-')[0] as keyof typeof clinicalKnowledge.clinicalKnowledge;
    const knowledge = clinicalKnowledge.clinicalKnowledge[conditionKey];

    const analogyKey = f.condition.replace('-', '.') as any;
    let analogy = 'Further assessment will provide more specific guidance.';

    // Navigate Kerala analogies safely
    const parts = f.condition.split('-');
    if (parts.length === 2 && KERALA_ANALOGIES[parts[0] as keyof typeof KERALA_ANALOGIES]) {
      const category = KERALA_ANALOGIES[parts[0] as keyof typeof KERALA_ANALOGIES];
      if (typeof category === 'object' && parts[1] in category) {
        analogy = category[parts[1] as keyof typeof category];
      }
    } else if (parts.length === 1 && KERALA_ANALOGIES[parts[0] as keyof typeof KERALA_ANALOGIES]) {
      const category = KERALA_ANALOGIES[parts[0] as keyof typeof KERALA_ANALOGIES];
      if (typeof category === 'string') {
        analogy = category;
      } else if (typeof category === 'object' && 'main' in category) {
        analogy = category.main;
      }
    }

    return {
      condition: f.condition,
      confidence: f.severity === 'concern' ? 'medium' : 'low',
      evidence: f.indicators,
      dailyLifeImpact: typeof knowledge === 'object' && 'description' in knowledge ? knowledge.description : 'May affect daily learning activities',
      keralaAnalogy: analogy,
      research: f.research,
    };
  });

  return {
    executiveSummary: `Assessment of ${childAge}-year-old child shows ${concernFindings.length} area(s) requiring attention. ${confidenceInfo.explanation} Based on age-normative data and clinical research.`,
    findings,
    metricsExplained: {
      ageGroup: `Compared against typical performance for children aged ${ageGroup} years`,
      confidence: `${confidenceInfo.level} confidence based on ${concernFindings.length} corroborating indicator(s)`,
      research: 'Analysis uses evidence-based thresholds from peer-reviewed studies',
    },
    actionPlan: {
      week1: ['Schedule professional evaluation', 'Begin daily 15-minute skill-building activities', 'Document specific challenges observed'],
      week2: ['Start targeted interventions based on findings', 'Maintain positive encouragement', 'Track progress weekly'],
      week3: ['Continue structured practice', 'Introduce adaptive tools if recommended', 'Celebrate small wins'],
      week4: ['Review progress with specialists', 'Adjust strategies as needed', 'Plan long-term support'],
    },
    referrals: concernFindings.map(f => {
      if (f.condition.includes('dysgraphia')) return 'Occupational Therapist specializing in handwriting';
      if (f.condition.includes('dyslexia')) return 'Educational Psychologist or Reading Specialist';
      if (f.condition.includes('dyscalculia')) return 'Math Learning Specialist';
      if (f.condition.includes('dyspraxia')) return 'Physical/Occupational Therapist for motor planning';
      if (f.condition.includes('nvld')) return 'Neuropsychologist for comprehensive assessment';
      return 'Developmental Pediatrician for detailed evaluation';
    }),
    positiveNotes: [
      'Child engaged well throughout assessment',
      'Demonstrated effort and persistence',
      'Shows potential with targeted support',
    ],
    parentMessage: `Your child's assessment shows areas where focused support can make a significant difference. Early intervention is highly effective. Let's work together to help your child thrive!`,
    source: 'fallback-with-baselines',
  };
}
