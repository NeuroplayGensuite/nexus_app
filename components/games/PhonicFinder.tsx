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

// ─────────────────────────────────────────────────────────────────────────────
// Vocabulary — imported from shared source of truth.
// The LLM prompt and this validator use the EXACT same word list.
// ─────────────────────────────────────────────────────────────────────────────
import {
  PHONIC_VOCAB_MAP,
  PHONEME_POOL,
  isAllowedWord,
  getPhonicEmoji,
} from '@/lib/phonic-vocabulary';

/** Returns the emoji for a word, or undefined if not in the approved vocabulary. */
function getEmoji(word: string): string | undefined {
  return getPhonicEmoji(word);
}

/** True only if the word is in the approved vocabulary (guaranteed visual + LLM-safe). */
function hasEmoji(word: string): boolean {
  return isAllowedWord(word);
}





/** Pick N random words from a phoneme pool, guaranteed to all have emojis. */
function pickFromPool(phoneme: string, count: number, exclude: string[] = []): string[] {
  const pool = (PHONEME_POOL[phoneme] ?? []).filter(
    w => !exclude.map(e => e.toLowerCase()).includes(w.toLowerCase()) && hasEmoji(w)
  );
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback round definitions — all words guaranteed to be in EMOJI_MAP.
// Distractors are phonemically similar for real auditory challenge.
// ─────────────────────────────────────────────────────────────────────────────
const FALLBACK_ROUND_TEMPLATES: Array<{
  targetWord: string;
  phoneme: string;
  distractorPhonemes: string[]; // phoneme pools to sample distractors from
}> = [
  // Round 1 — /sh/ vs /s/ contrast
  { targetWord: 'ship',   phoneme: 'sh', distractorPhonemes: ['s', 's', 'f']  },
  // Round 2 — /b/ vs /p/ vs /d/ contrast
  { targetWord: 'ball',   phoneme: 'b',  distractorPhonemes: ['p', 'p', 'd']  },
  // Round 3 — all /f/ (child must listen carefully within same phoneme)
  { targetWord: 'fish',   phoneme: 'f',  distractorPhonemes: ['f', 'f', 'f']  },
  // Round 4 — /ch/ vs /sh/ minimal pair (classic dyslexia confusion)
  { targetWord: 'cherry', phoneme: 'ch', distractorPhonemes: ['sh','sh','ch'] },
  // Round 5 — /t/ vs /d/ minimal pair
  { targetWord: 'tiger',  phoneme: 't',  distractorPhonemes: ['d', 't', 't']  },
];

/** Build a randomised fallback round from a template. */
function buildFallbackRound(roundIndex: number): {
  targetWord: string;
  phoneme: string;
  distractors: string[];
} {
  const tmpl = FALLBACK_ROUND_TEMPLATES[roundIndex % FALLBACK_ROUND_TEMPLATES.length];
  const distractors: string[] = [];
  const used = [tmpl.targetWord.toLowerCase()];

  for (const dp of tmpl.distractorPhonemes) {
    const [pick] = pickFromPool(dp, 1, used);
    if (pick) {
      distractors.push(pick);
      used.push(pick.toLowerCase());
    }
  }

  // If we couldn't fill 3 distractors from pool, fill remainder from any pool
  const anyWords = Object.values(PHONEME_POOL).flat();
  while (distractors.length < 3) {
    const candidate = anyWords.find(w => !used.includes(w.toLowerCase()) && hasEmoji(w));
    if (!candidate) break;
    distractors.push(candidate);
    used.push(candidate.toLowerCase());
  }

  return { targetWord: tmpl.targetWord, phoneme: tmpl.phoneme, distractors };
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Checks that the target word actually starts with its declared phoneme */
function wordMatchesPhoneme(word: string, phoneme: string): boolean {
  const w = word.toLowerCase();
  const p = phoneme.toLowerCase().replace(/\//g, '');
  return w.startsWith(p);
}

/** Ensure no duplicate words and that target differs from all distractors */
function questionsAreValid(
  targetWord: string,
  distractors: string[]
): boolean {
  const all = [targetWord.toLowerCase(), ...distractors.map(d => d.toLowerCase())];
  const unique = new Set(all);
  return unique.size === all.length; // no duplicates
}

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

  // ── UNCHANGED: timing ref used by calculatePhonicRetrievalSpeed ──
  const audioCueTimeRef = useRef<number>(0);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  // Stores the last spoken cue text so "Hear Again" can replay it exactly
  const lastCueRef = useRef<{ phoneme: string; word: string }>({ phoneme: '', word: '' });
  // !! Stores the RESOLVED (post-validation/fallback) word+phoneme per round.
  //    The audio MUST always come from here, never from raw AI data.
  const resolvedRoundsRef = useRef<Map<number, { word: string; phoneme: string }>>(new Map());

  // ── UNCHANGED: Zustand session hooks ──
  const { startSession, endSession, addEvent, updateMetrics } = useSessionStore();

  // ── UNCHANGED: Generative Level Engine hook ──
  const { level: generatedLevel, isLoading: levelLoading, isGenerated } = usePhonicLevel();

  // ─────────────────────────────────────────────────────────────────────────
  // Build the question cards for the current round.
  // ONLY use words that have a confirmed emoji in EMOJI_MAP.
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!generatedLevel) return;

    const words = generatedLevel.targetWords;
    if (currentRound >= words.length) return;

    const targetWord = words[currentRound];

    // ── Validate AI output: word must match phoneme + have emoji + no dupes ──
    const aiWordHasEmoji = hasEmoji(targetWord.word);
    const aiDistractors = (targetWord.distractors ?? [])
      .filter(d => hasEmoji(d) && d.toLowerCase() !== targetWord.word.toLowerCase());
    const aiIsValid =
      aiWordHasEmoji &&
      wordMatchesPhoneme(targetWord.word, targetWord.phoneme) &&
      questionsAreValid(targetWord.word, aiDistractors) &&
      aiDistractors.length >= 3;

    let word: string;
    let phoneme: string;
    let distractors: string[];

    if (aiIsValid) {
      word        = targetWord.word;
      phoneme     = targetWord.phoneme;
      distractors = aiDistractors.slice(0, 3);
    } else {
      // Build a randomised fallback round (all words guaranteed emoji-covered)
      const fb = buildFallbackRound(currentRound);
      word        = fb.targetWord;
      phoneme     = fb.phoneme;
      distractors = fb.distractors;
    }

    const items: PhonicItem[] = [
      {
        id: 'target',
        word,
        phoneme,
        emoji: getEmoji(word) ?? '📦',
        isCorrect: true,
      },
      ...distractors.map((d, idx) => ({
        id: `distractor-${idx}`,
        word: d,
        phoneme: d[0]?.toLowerCase() ?? '',
        emoji: getEmoji(d) ?? '📦',
        isCorrect: false,
      })),
    ];

    // Cache the resolved data so audio always matches the displayed cards
    resolvedRoundsRef.current.set(currentRound, { word, phoneme });

    // Shuffle
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    setCurrentItems(shuffled);
  }, [generatedLevel, currentRound]);


  // ─────────────────────────────────────────────────────────────────────────
  // UNCHANGED: Web Speech API — speak the cue
  // ─────────────────────────────────────────────────────────────────────────
  const speakPhoneme = useCallback((phoneme: string, word: string) => {
    // Store so "Hear Again" can replay exactly
    lastCueRef.current = { phoneme, word };

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance();
        utterance.lang = 'en-US';
        utterance.rate = 0.8;
        utterance.pitch = 1.2;
        // Say the phoneme sound name first, then pronounce the target word
        utterance.text = `Find the word that starts with the ${phoneme} sound. ${word}.`;

        utterance.onstart = () => {
          // ── UNCHANGED: record timing for phonicDelay calculation ──
          audioCueTimeRef.current = Date.now();
          setShowingPhoneme(true);
        };

        utterance.onerror = (event) => {
          if (event.error !== 'interrupted') {
            console.error('Speech synthesis error:', event.error);
          }
          setShowingPhoneme(true);
          audioCueTimeRef.current = Date.now();
        };

        speechSynthRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('Speech synthesis failed:', error);
        setShowingPhoneme(true);
        audioCueTimeRef.current = Date.now();
      }
    } else {
      setShowingPhoneme(true);
      audioCueTimeRef.current = Date.now();
    }

    addEvent({
      type: 'phonic_audio_cue',
      data: {
        event: 'phonic_cue_played',
        data: { phoneme, word },
      },
    });
  }, [addEvent]);

  // ─────────────────────────────────────────────────────────────────────────
  // "Hear Again" handler — replays the same cue WITHOUT touching any metrics
  // ─────────────────────────────────────────────────────────────────────────
  const handleHearAgain = useCallback(() => {
    const { phoneme, word } = lastCueRef.current;
    if (!phoneme || !word) return;

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance();
        utterance.lang = 'en-US';
        utterance.rate = 0.8;
        utterance.pitch = 1.2;
        // ── Replay exactly the same cue text ──
        utterance.text = `Find the word that starts with the ${phoneme} sound. ${word}.`;
        // ── DO NOT touch audioCueTimeRef — timer must NOT reset ──
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('Hear Again speech failed:', error);
      }
    }
    // Not an attempt, not a slip — no metric changes
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // UNCHANGED: start the game
  // ─────────────────────────────────────────────────────────────────────────
  const handleStart = useCallback(() => {
    if (!generatedLevel) return;
    setIsPlaying(true);
    setCurrentRound(0);
    setResults([]);
    startSession('phonic');

    setTimeout(() => {
      // Always speak from the RESOLVED data (post-validation), not raw AI data
      const resolved = resolvedRoundsRef.current.get(0);
      if (resolved) {
        speakPhoneme(resolved.phoneme, resolved.word);
      }
    }, 500);
  }, [startSession, speakPhoneme, generatedLevel]);

  // ─────────────────────────────────────────────────────────────────────────
  // UNCHANGED: item click — all metric calculations identical to original
  // ─────────────────────────────────────────────────────────────────────────
  const handleItemClick = useCallback((item: PhonicItem) => {
    if (!showingPhoneme || feedback || !generatedLevel) return;

    const responseTime = Date.now();
    // ── UNCHANGED: uses existing calculatePhonicRetrievalSpeed ──
    const delay = calculatePhonicRetrievalSpeed(audioCueTimeRef.current, responseTime);

    const targetWord = generatedLevel.targetWords[currentRound];
    // ── UNCHANGED: wasSlip detection ──
    const wasSlip =
      !item.isCorrect &&
      item.word[0].toLowerCase() === targetWord.word[0].toLowerCase();

    const result = {
      delay,
      wasCorrect: item.isCorrect,
      wasSlip,
    };

    setResults(prev => [...prev, result]);

    // ── UNCHANGED: addEvent call ──
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

    setFeedback(item.isCorrect ? 'correct' : 'wrong');

    setTimeout(() => {
      setFeedback(null);
      setShowingPhoneme(false);

      if (currentRound < generatedLevel.targetWords.length - 1) {
        const nextRound = currentRound + 1;
        setCurrentRound(nextRound);

        setTimeout(() => {
          // Always speak from the RESOLVED data — not the raw AI targetWords
          const resolved = resolvedRoundsRef.current.get(nextRound);
          if (resolved) {
            speakPhoneme(resolved.phoneme, resolved.word);
          }
        }, 500);
      } else {
        handleComplete();
      }
    }, 1000);
  }, [showingPhoneme, feedback, currentRound, addEvent, speakPhoneme, generatedLevel]);

  // ─────────────────────────────────────────────────────────────────────────
  // UNCHANGED: complete the game — identical metric assembly
  // ─────────────────────────────────────────────────────────────────────────
  const handleComplete = useCallback(() => {
    setIsPlaying(false);
    setIsComplete(true);

    const correctResults = results.filter(r => r.wasCorrect);
    const avgDelay =
      results.length > 0
        ? results.reduce((sum, r) => sum + r.delay, 0) / results.length
        : 0;
    const slipCount = results.filter(r => r.wasSlip).length;

    const metrics = {
      phonicDelay: Math.round(avgDelay),
      phonemicSlips: slipCount,
      totalAttempts: results.length,
      accuracy: Math.round((correctResults.length / results.length) * 100),
    };

    // ── UNCHANGED: updateMetrics ──
    updateMetrics({
      phonicDelay: metrics.phonicDelay,
      phonemicSlips: metrics.phonemicSlips,
      totalPhonicAttempts: metrics.totalAttempts,
    });

    // ── UNCHANGED: endSession + onComplete ──
    endSession();
    onComplete(metrics);
  }, [results, updateMetrics, endSession, onComplete]);

  // ── UNCHANGED: cleanup ──
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Loading screen
  // ─────────────────────────────────────────────────────────────────────────
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
            ? 'Creating sound challenges based on your interests...'
            : 'Loading audio elements...'}
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

  // ─────────────────────────────────────────────────────────────────────────
  // Current round data (for display)
  // ─────────────────────────────────────────────────────────────────────────
  const currentTarget =
    generatedLevel && currentRound < generatedLevel.targetWords.length
      ? generatedLevel.targetWords[currentRound]
      : null;

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      {/* Header */}
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
              : 'Listen carefully and choose the picture!'}
        </p>
      </div>

      {/* Progress dots */}
      {isPlaying && generatedLevel && (
        <div className="flex gap-2 mb-2">
          {generatedLevel.targetWords.map((_, idx) => (
            <div
              key={idx}
              className={`w-3 h-3 rounded-full transition-all ${
                idx < currentRound
                  ? 'bg-green-500'
                  : idx === currentRound
                    ? 'bg-blue-500 animate-pulse scale-125'
                    : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
      )}

      {/* Audio cue panel — shows "Listen carefully!" but hides the written phoneme */}
      {isPlaying && showingPhoneme && currentTarget && (
        <div className="bg-blue-900/50 border-2 border-blue-500 rounded-xl px-8 py-5 text-center">
          <p className="text-blue-300 text-sm font-medium mb-1 uppercase tracking-widest">
            Listen carefully!
          </p>
          <p className="text-white text-lg font-semibold">
            Choose the picture that starts with the sound you heard 🎧
          </p>
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

      {/* Answer grid — 2×2 */}
      {isPlaying && showingPhoneme && currentItems.length > 0 && (
        <div className="grid grid-cols-2 gap-4 max-w-md w-full">
          {currentItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              disabled={!!feedback}
              className={`
                p-6 rounded-2xl text-center transition-all transform hover:scale-105 active:scale-95
                ${feedback === 'correct' && item.isCorrect
                  ? 'bg-green-500 scale-110 ring-4 ring-green-400'
                  : feedback === 'wrong' && item.isCorrect
                    ? 'bg-green-500 ring-4 ring-green-400'   // reveal correct on wrong answer
                    : feedback === 'wrong' && !item.isCorrect
                      ? 'bg-red-900/60 opacity-50'
                      : 'bg-slate-700 hover:bg-slate-600 border border-slate-600'}
              `}
            >
              <div className="text-5xl mb-2">{item.emoji}</div>
              <div className="text-lg font-semibold text-white capitalize">{item.word}</div>
            </button>
          ))}
        </div>
      )}

      {/* ── "Hear Again" button ─────────────────────────────────────────── */}
      {isPlaying && showingPhoneme && !feedback && (
        <button
          onClick={handleHearAgain}
          className="flex items-center gap-2 px-5 py-3 bg-slate-700/80 hover:bg-slate-600 border border-blue-500/50 text-blue-300 font-semibold rounded-full transition-all hover:scale-105 active:scale-95 text-sm"
        >
          <span className="text-lg">🔊</span>
          Hear Again
        </button>
      )}

      {/* Feedback overlay */}
      {feedback && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-8xl animate-ping pointer-events-none">
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
