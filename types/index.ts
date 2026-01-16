// NeuroGen Suite - Core Types

export interface Coordinate {
  x: number;
  y: number;
  timestamp: number;
}

export interface GameSession {
  id: string;
  gameType: 'maze' | 'phonic' | 'cricket' | 'sync' | 'star';
  startTime: number;
  endTime?: number;
  coordinates: Coordinate[];
  events: GameEvent[];
  metrics: BiometricMetrics;
}

export interface GameEvent {
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface BiometricMetrics {
  // Maze (Dysgraphia)
  mse?: number;                    // Mean Squared Error from ideal path
  wallCollisions?: number;         // Number of wall hits
  proximityEvents?: number;        // Near-wall events
  wallHuggingRatio?: number;       // Collisions/Proximity ratio
  jerkMean?: number;               // Average jerk value
  jerkVariance?: number;           // Jerk variance
  tremorIndicator?: number;        // 0-100 tremor score
  
  // Phonic Finder (Dyslexia)
  phonicDelay?: number;            // Retrieval speed in ms
  phonemicSlips?: number;          // Auditory-visual mapping errors
  totalPhonicAttempts?: number;    // Total attempts
  
  // Cricket Forge (Dyscalculia)
  subitizingThreshold?: number;    // Max instant recognition (1-5)
  subitizingFailed?: boolean;      // Failed subitizing test
  symbolicMappingSpeed?: number;   // Digit-quantity connection ms
  symbolicMappingErrors?: number;  // Mapping errors
  
  // Sync Master (Dyspraxia)
  motorLag?: number;               // Eye-hand coordination lag ms
  gazeEntropy?: number;            // Eye movement chaos (0-1)
  rhythmAccuracy?: number;         // Timing accuracy percentage
  
  // Star Mapper (NVLD)
  spatialDecay1s?: number;         // Accuracy after 1s delay
  spatialDecay3s?: number;         // Accuracy after 3s delay
  spatialDecay5s?: number;         // Accuracy after 5s delay
  visualMemoryScore?: number;      // Overall visual memory score
}

export interface SuspectedCondition {
  condition: 'dysgraphia-motor' | 'dysgraphia-spatial' | 'dyslexia' | 'dyscalculia' | 'dyspraxia' | 'nvld';
  confidence: 'low' | 'medium' | 'high';
  indicators: string[];
  dailyLifeImpact: string;
}

export interface DiagnosticReport {
  sessionId: string;
  childAge: number;
  generatedAt: number;
  executiveSummary: string;
  findings: SuspectedCondition[];
  metricsExplained: {
    mse?: string;
    jerk?: string;
    gazeEntropy?: string;
    subitizing?: string;
    spatialDecay?: string;
  };
  actionPlan: {
    week1: string[];
    week2: string[];
    week3: string[];
    week4: string[];
  };
  referrals: string[];
  rawMetrics: BiometricMetrics;
}

export interface WallBoundary {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface MazePath {
  idealPath: Coordinate[];
  walls: WallBoundary[];
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
}

export interface PhonicItem {
  id: string;
  word: string;
  phoneme: string;
  imageUrl: string;
  isCorrect: boolean;
}

export interface CricketBall {
  id: string;
  quantity: number;
  displayType: 'dots' | 'digit';
  targetZone: number;
}

export interface StarPattern {
  id: string;
  points: { x: number; y: number }[];
  connections: [number, number][];
}

export interface ChildProfile {
  id: string;
  name: string;
  age: number;
  grade: string;
  school?: string;
  interests: string[];
  previousConcerns?: string;
  preferredLanguage: 'en' | 'ml' | 'hi';
  createdAt: number;
}

// Enhanced IEP Types for Biometric-to-IEP Generator
export interface EnhancedFinding {
  condition: string;
  conditionMalayalam: string;
  confidence: number;
  evidenceChain: string[];
  ruledOut: Array<{ condition: string; reason: string }>;
  dailyLifeImpact: string;
  keralaAnalogy: string;
}

export interface IEPAccommodation {
  type: string;
  reason: string;
  implementation: string;
}

export interface IEPWeeklyGoal {
  week: number;
  goal: string;
  metric: string;
  homeActivity: string;
  homeActivityMalayalam: string;
}

export interface IndividualizedEducationPlan {
  accommodations: IEPAccommodation[];
  weeklyGoals: IEPWeeklyGoal[];
}

export interface EnhancedDiagnosticReport {
  sessionId: string;
  childProfile: ChildProfile;
  executiveSummary: {
    english: string;
    malayalam: string;
  };
  findings: EnhancedFinding[];
  iep: IndividualizedEducationPlan;
  teacherSummary: string;
  malayalamActionPlan: string;
  generatedAt: number;
  rawMetrics: BiometricMetrics;
}

// Generative Level Engine Types
export interface GeneratedLevel {
  gameType: 'maze' | 'phonic' | 'cricket' | 'sync' | 'star';
  theme: string;
  difficulty: 'easy' | 'medium' | 'hard';
  customContent: Record<string, unknown>;
  narrative: string;
  childInterestIntegration: string;
}
