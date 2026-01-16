/**
 * Custom hook for Generative Level Engine
 * Fetches dynamically generated game content based on child's interests
 */

import { useState, useEffect, useCallback } from 'react';
import { useSessionStore } from '@/stores/session-store';
import {
  generateLevel,
  generateMazeLevelPrompt,
  generatePhonicLevelPrompt,
  generateMathLevelPrompt,
  generateRhythmLevelPrompt,
  generateMemoryLevelPrompt,
  GeneratedMazeLevel,
  GeneratedPhonicLevel,
  GeneratedMathLevel,
  GeneratedRhythmLevel,
  GeneratedMemoryLevel,
  FALLBACK_CONTENT,
} from '@/lib/gemini/level-generator';

type GameType = 'maze' | 'phonic' | 'math' | 'rhythm' | 'memory';
type Difficulty = 'easy' | 'medium' | 'hard';

interface UseLevelGeneratorResult<T> {
  level: T | null;
  isLoading: boolean;
  error: string | null;
  regenerate: () => void;
  isGenerated: boolean; // true if from Gemini, false if fallback
}

export function useLevelGenerator<T>(
  gameType: GameType,
  difficulty: Difficulty = 'easy'
): UseLevelGeneratorResult<T> {
  const { childProfile } = useSessionStore();
  const [level, setLevel] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerated, setIsGenerated] = useState(false);

  const fetchLevel = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // If no profile, use fallback immediately
    if (!childProfile || !childProfile.interests || childProfile.interests.length === 0) {
      setLevel(FALLBACK_CONTENT[gameType] as T);
      setIsGenerated(false);
      setIsLoading(false);
      return;
    }

    try {
      let prompt: string;
      
      switch (gameType) {
        case 'maze':
          prompt = generateMazeLevelPrompt(childProfile);
          break;
        case 'phonic':
          prompt = generatePhonicLevelPrompt(childProfile);
          break;
        case 'math':
          prompt = generateMathLevelPrompt(childProfile, difficulty);
          break;
        case 'rhythm':
          prompt = generateRhythmLevelPrompt(childProfile);
          break;
        case 'memory':
          prompt = generateMemoryLevelPrompt(childProfile);
          break;
        default:
          throw new Error(`Unknown game type: ${gameType}`);
      }

      const generatedLevel = await generateLevel<T>(prompt);
      
      if (generatedLevel) {
        setLevel(generatedLevel);
        setIsGenerated(true);
      } else {
        // Use fallback if generation fails
        setLevel(FALLBACK_CONTENT[gameType] as T);
        setIsGenerated(false);
      }
    } catch (err) {
      console.error('Level generation error:', err);
      setError(String(err));
      setLevel(FALLBACK_CONTENT[gameType] as T);
      setIsGenerated(false);
    } finally {
      setIsLoading(false);
    }
  }, [childProfile, gameType, difficulty]);

  useEffect(() => {
    fetchLevel();
  }, [fetchLevel]);

  return {
    level,
    isLoading,
    error,
    regenerate: fetchLevel,
    isGenerated,
  };
}

// Type-specific hooks for convenience
export function useMazeLevel() {
  return useLevelGenerator<GeneratedMazeLevel>('maze');
}

export function usePhonicLevel() {
  return useLevelGenerator<GeneratedPhonicLevel>('phonic');
}

export function useMathLevel(difficulty: Difficulty = 'easy') {
  return useLevelGenerator<GeneratedMathLevel>('math', difficulty);
}

export function useRhythmLevel() {
  return useLevelGenerator<GeneratedRhythmLevel>('rhythm');
}

export function useMemoryLevel() {
  return useLevelGenerator<GeneratedMemoryLevel>('memory');
}
