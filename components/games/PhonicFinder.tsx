'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { calculatePhonicRetrievalSpeed } from '@/lib/biometrics/timing-metrics';
import { usePhonicLevel } from '@/lib/hooks/use-level-generator';

interface PhonicFinderProps {
  onComplete: (metrics: {
    phonicDelay: number;
    phonemicSlips: number;
    totalAttempts: number;
    accuracy: number;
  }) => void;
}

interface PhonicItem {
  id: string;
  word: string;
  phoneme: string;
  emoji: string;
  isCorrect: boolean;
}

// Phoneme-based items for the game
const PHONIC_ROUNDS = [
  {
    targetPhoneme: '/sh/',
    targetWord: 'Ship',
    items: [
      { id: '1', word: 'Ship', phoneme: '/sh/', emoji: '🚢', isCorrect: true },
      { id: '2', word: 'Sun', phoneme: '/s/', emoji: '☀️', isCorrect: false },
      { id: '3', word: 'Sheep', phoneme: '/sh/', emoji: '🐑', isCorrect: true },
      { id: '4', word: 'Sock', phoneme: '/s/', emoji: '🧦', isCorrect: false },
    ],
  },
  {
    targetPhoneme: '/ch/',
    targetWord: 'Cheese',
    items: [
      { id: '1', word: 'Cat', phoneme: '/k/', emoji: '🐱', isCorrect: false },
      { id: '2', word: 'Cheese', phoneme: '/ch/', emoji: '🧀', isCorrect: true },
      { id: '3', word: 'Cherry', phoneme: '/ch/', emoji: '🍒', isCorrect: true },
      { id: '4', word: 'Car', phoneme: '/k/', emoji: '🚗', isCorrect: false },
    ],
  },
  {
    targetPhoneme: '/th/',
    targetWord: 'Three',
    items: [
      { id: '1', word: 'Tree', phoneme: '/tr/', emoji: '🌳', isCorrect: false },
      { id: '2', word: 'Three', phoneme: '/th/', emoji: '3️⃣', isCorrect: true },
      { id: '3', word: 'Thumb', phoneme: '/th/', emoji: '👍', isCorrect: true },
      { id: '4', word: 'Train', phoneme: '/tr/', emoji: '🚂', isCorrect: false },
    ],
  },
  {
    targetPhoneme: '/b/',
    targetWord: 'Ball',
    items: [
      { id: '1', word: 'Ball', phoneme: '/b/', emoji: '⚽', isCorrect: true },
      { id: '2', word: 'Doll', phoneme: '/d/', emoji: '🪆', isCorrect: false },
      { id: '3', word: 'Bird', phoneme: '/b/', emoji: '🐦', isCorrect: true },
      { id: '4', word: 'Door', phoneme: '/d/', emoji: '🚪', isCorrect: false },
    ],
  },
  {
    targetPhoneme: '/f/',
    targetWord: 'Fish',
    items: [
      { id: '1', word: 'Pig', phoneme: '/p/', emoji: '🐷', isCorrect: false },
      { id: '2', word: 'Fish', phoneme: '/f/', emoji: '🐟', isCorrect: true },
      { id: '3', word: 'Flower', phoneme: '/f/', emoji: '🌸', isCorrect: true },
      { id: '4', word: 'Pen', phoneme: '/p/', emoji: '🖊️', isCorrect: false },
    ],
  },
];

export default function PhonicFinder({ onComplete }: PhonicFinderProps) {
  const [currentRound, setCurrentRound] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showingPhoneme, setShowingPhoneme] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [results, setResults] = useState<{
    delay: number;
    wasCorrect: boolean;
    wasSlip: boolean;
  }[]>([]);
  const [currentItems, setCurrentItems] = useState<PhonicItem[]>([]);

  const audioCueTimeRef = useRef<number>(0);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  const { startSession, endSession, addEvent, updateMetrics } = useSessionStore();

  // 🌟 Get dynamically generated phoneme content based on child's interests
  const { level: generatedLevel, isLoading: levelLoading, isGenerated } = usePhonicLevel();

  // Helper to get emoji based on word - MUST be before early return
  const getEmojiForWord = (word: string): string => {
    const emojiMap: Record<string, string> = {
      ball: '⚽', bat: '🏏', catch: '🧤', pitch: '🎯', run: '🏃',
      ship: '🚢', sheep: '🐑', sun: '☀️', cat: '🐱', car: '🚗',
      fish: '🐟', tree: '🌳', bird: '🐦', dog: '🐕', house: '🏠',
      flower: '🌸', star: '⭐', moon: '🌙', rocket: '🚀', train: '🚂'
    };
    return emojiMap[word.toLowerCase()] || '📦';
  };

  // Generate shuffled items from the AI-generated level
  useEffect(() => {
    if (generatedLevel && currentRound < generatedLevel.targetWords.length) {
      const targetWord = generatedLevel.targetWords[currentRound];

      // Create items: 1 target word + 3 distractors
      const items: PhonicItem[] = [
        {
          id: 'target',
          word: targetWord.word,
          phoneme: targetWord.phoneme,
          emoji: getEmojiForWord(targetWord.word),
          isCorrect: true
        },
        ...targetWord.distractors.slice(0, 3).map((distractor, idx) => ({
          id: `distractor-${idx}`,
          word: distractor,
          phoneme: distractor[0].toLowerCase(),
          emoji: getEmojiForWord(distractor),
          isCorrect: false
        }))
      ];

      // Shuffle the items
      const shuffled = items.sort(() => Math.random() - 0.5);
      setCurrentItems(shuffled);
    }
  }, [generatedLevel, currentRound]);

  // Speak the phoneme using Web Speech API
  const speakPhoneme = useCallback((phoneme: string, word: string) => {
    if ('speechSynthesis' in window) {
      try {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance();

        // Configure speech
        utterance.lang = 'en-US';
        utterance.rate = 0.8; // Slower for clarity
        utterance.pitch = 1.2; // Slightly higher pitch for kids

        // Speak: "Find the word that starts with [phoneme]"
        utterance.text = `Find the word that starts with ${phoneme}. Listen: ${word}.`;

        utterance.onstart = () => {
          audioCueTimeRef.current = Date.now();
          setShowingPhoneme(true);
        };

        utterance.onerror = (event) => {
          console.error('Speech synthesis error:', event.error);
          setShowingPhoneme(true);
          audioCueTimeRef.current = Date.now();
        };

        speechSynthRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('Speech synthesis failed:', error);
        // Fallback: show the items without audio
        setShowingPhoneme(true);
        audioCueTimeRef.current = Date.now();
      }
    } else {
      // No speech synthesis support - show items immediately
      setShowingPhoneme(true);
      audioCueTimeRef.current = Date.now();
    }

    addEvent({
      type: 'phonic_audio_cue',
      data: {
        event: 'phonic_cue_played',
        data: { phoneme, word }
      }
    });
  }, [addEvent]);

  // Start the game
  const handleStart = useCallback(() => {
    if (!generatedLevel) return;

    setIsPlaying(true);
    setCurrentRound(0);
    setResults([]);
    startSession('phonic');

    // Start first round after a brief delay
    setTimeout(() => {
      speakPhoneme(generatedLevel.targetWords[0].phoneme, generatedLevel.targetWords[0].word);
    }, 500);
  }, [startSession, speakPhoneme, generatedLevel]);

  // Handle item selection
  const handleItemClick = useCallback((item: PhonicItem) => {
    if (!showingPhoneme || feedback || !generatedLevel) return;

    const responseTime = Date.now();
    const delay = calculatePhonicRetrievalSpeed(audioCueTimeRef.current, responseTime);

    // Determine if this was a "phonemic slip" - visually similar but phonetically different
    const targetWord = generatedLevel.targetWords[currentRound];
    const wasSlip = !item.isCorrect && item.word[0].toLowerCase() === targetWord.word[0].toLowerCase();

    const result = {
      delay,
      wasCorrect: item.isCorrect,
      wasSlip,
    };

    setResults(prev => [...prev, result]);

    addEvent({
      type: 'phonic_response',
      data: {
        round: currentRound,
        targetPhoneme: targetWord.phoneme,
        selectedWord: item.word,
        correct: item.isCorrect,
        delay,
        wasSlip,
      },
    });

    // Show feedback
    setFeedback(item.isCorrect ? 'correct' : 'wrong');

    setTimeout(() => {
      setFeedback(null);
      setShowingPhoneme(false);

      // Move to next round or complete
      if (currentRound < generatedLevel.targetWords.length - 1) {
        const nextRound = currentRound + 1;
        setCurrentRound(nextRound);

        setTimeout(() => {
          const nextTarget = generatedLevel.targetWords[nextRound];
          speakPhoneme(nextTarget.phoneme, nextTarget.word);
        }, 500);
      } else {
        handleComplete();
      }
    }, 1000);
  }, [showingPhoneme, feedback, currentRound, addEvent, speakPhoneme, generatedLevel]);

  // Complete the game
  const handleComplete = useCallback(() => {
    setIsPlaying(false);
    setIsComplete(true);

    const correctResults = results.filter(r => r.wasCorrect);
    const avgDelay = results.length > 0
      ? results.reduce((sum, r) => sum + r.delay, 0) / results.length
      : 0;
    const slipCount = results.filter(r => r.wasSlip).length;

    const metrics = {
      phonicDelay: Math.round(avgDelay),
      phonemicSlips: slipCount,
      totalAttempts: results.length,
      accuracy: Math.round((correctResults.length / results.length) * 100),
    };

    updateMetrics({
      phonicDelay: metrics.phonicDelay,
      phonemicSlips: metrics.phonemicSlips,
      totalPhonicAttempts: metrics.totalAttempts,
    });

    endSession();
    onComplete(metrics);
  }, [results, updateMetrics, endSession, onComplete]);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Show loading state while generating content
  if (levelLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-8">
        <div className="relative mb-6">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">🔊</span>
          </div>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">
          Preparing Your Phonics Game...
        </h3>
        <p className="text-gray-400 text-center max-w-md">
          {isGenerated
            ? "Creating sound challenges based on your interests..."
            : "Loading audio elements..."}
        </p>
        {typeof window !== 'undefined' && !('speechSynthesis' in window) && (
          <div className="mt-4 p-3 bg-yellow-600/20 border border-yellow-600/50 rounded-lg max-w-md">
            <p className="text-yellow-400 text-sm text-center">
              ℹ️ Audio not available in this browser. We'll show text instead!
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      {/* Loading state */}
      {levelLoading && (
        <div className="text-center mb-4 animate-pulse">
          <div className="text-2xl mb-2">✨</div>
          <p className="text-purple-400">Creating personalized phoneme game...</p>
        </div>
      )}

      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-white mb-1">
          🔊 {generatedLevel?.theme || 'Phonic Finder'}
        </h2>
        {isGenerated && (
          <span className="inline-block px-2 py-1 text-xs bg-purple-600/30 text-purple-300 rounded-full mb-2">
            ✨ Personalized for you
          </span>
        )}
        <p className="text-gray-400">
          {!isPlaying && !isComplete
            ? generatedLevel?.instructions || 'Listen to the sound and find the matching picture!'
            : isComplete
              ? '🎉 Amazing! You found all the sounds!'
              : generatedLevel && currentRound < generatedLevel.targetWords.length
                ? `Tap the picture that starts with /${generatedLevel.targetWords[currentRound].phoneme}/ sound!`
                : 'Listen and tap the matching picture!'}
        </p>
      </div>

      {/* Progress indicator */}
      {isPlaying && generatedLevel && (
        <div className="flex gap-2 mb-4">
          {generatedLevel.targetWords.map((_, idx) => (
            <div
              key={idx}
              className={`w-3 h-3 rounded-full ${idx < currentRound ? 'bg-green-500' : idx === currentRound ? 'bg-blue-500 animate-pulse' : 'bg-gray-600'
                }`}
            />
          ))}
        </div>
      )}

      {/* Current phoneme display */}
      {isPlaying && showingPhoneme && generatedLevel && currentRound < generatedLevel.targetWords.length && (
        <div className="bg-blue-900/50 border-2 border-blue-500 rounded-xl p-6 mb-4">
          <p className="text-gray-300 mb-2">Find pictures starting with:</p>
          <p className="text-4xl font-bold text-blue-400">/{generatedLevel.targetWords[currentRound].phoneme}/</p>
        </div>
      )}

      {/* Start button */}
      {!isPlaying && !isComplete && generatedLevel && (
        <button
          onClick={handleStart}
          disabled={levelLoading}
          className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white text-xl font-bold rounded-full shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🎧 Start Listening
        </button>
      )}

      {/* Game grid */}
      {isPlaying && showingPhoneme && currentItems.length > 0 && (
        <div className="grid grid-cols-2 gap-4 max-w-md">
          {currentItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              disabled={!!feedback}
              className={`
                p-6 rounded-2xl text-center transition-all transform hover:scale-105
                ${feedback === 'correct' && item.isCorrect
                  ? 'bg-green-500 scale-110'
                  : feedback === 'wrong' && !item.isCorrect
                    ? 'bg-red-500 opacity-50'
                    : 'bg-slate-700 hover:bg-slate-600'}
                ${feedback && item.isCorrect ? 'ring-4 ring-green-400' : ''}
              `}
            >
              <div className="text-5xl mb-2">{item.emoji}</div>
              <div className="text-lg font-semibold text-white">{item.word}</div>
            </button>
          ))}
        </div>
      )}

      {/* Feedback overlay */}
      {feedback && (
        <div className={`
          fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
          text-8xl animate-ping
        `}>
          {feedback === 'correct' ? '✅' : '❌'}
        </div>
      )}

      {/* Completion screen */}
      {isComplete && (
        <div className="text-center bg-slate-800 rounded-2xl p-8 max-w-md">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold text-white mb-4">Great Listening!</h3>
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-sm text-gray-400">Accuracy</div>
              <div className="text-2xl font-bold text-green-400">
                {Math.round((results.filter(r => r.wasCorrect).length / results.length) * 100)}%
              </div>
            </div>
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-sm text-gray-400">Avg Response</div>
              <div className="text-2xl font-bold text-blue-400">
                {Math.round(results.reduce((sum, r) => sum + r.delay, 0) / results.length)}ms
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
