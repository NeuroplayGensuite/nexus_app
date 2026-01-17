'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSessionStore } from '@/stores/session-store';

interface SyncMasterProps {
  onComplete: (metrics: any) => void;
}

interface ColorButton {
  id: number;
  color: string;
  emoji: string;
  name: string;
}

const BUTTONS: ColorButton[] = [
  { id: 0, color: 'bg-red-500', emoji: '🔴', name: 'Red' },
  { id: 1, color: 'bg-green-500', emoji: '🟢', name: 'Green' },
  { id: 2, color: 'bg-blue-500', emoji: '🔵', name: 'Blue' },
  { id: 3, color: 'bg-yellow-500', emoji: '🟡', name: 'Yellow' },
];

export default function SyncMaster({ onComplete }: SyncMasterProps) {
  const { addEvent, startSession, endSession, updateMetrics } = useSessionStore();

  // Start session on mount
  useEffect(() => {
    startSession('sync');
  }, [startSession]);

  // Game state
  const [gamePhase, setGamePhase] = useState<'intro' | 'watch' | 'play' | 'feedback' | 'complete'>('intro');
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds] = useState(8);
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerSequence, setPlayerSequence] = useState<number[]>([]);
  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');

  // Metrics
  const [startTime, setStartTime] = useState<number>(0);
  const [roundMetrics, setRoundMetrics] = useState<any[]>([]);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [lastFlashTime, setLastFlashTime] = useState<number>(0);

  // Generate sequence for round
  const generateSequence = useCallback(() => {
    const length = currentRound; // Round 1 = 1 button, Round 8 = 8 buttons
    const newSeq: number[] = [];
    for (let i = 0; i < length; i++) {
      newSeq.push(Math.floor(Math.random() * 4));
    }
    return newSeq;
  }, [currentRound]);

  // Start game
  const startGame = () => {
    const newSeq = generateSequence();
    setSequence(newSeq);
    setPlayerSequence([]);
    setGamePhase('watch');
    setStartTime(Date.now());

    addEvent({
      type: 'game-start',
      data: { round: currentRound, sequenceLength: newSeq.length }
    });

    // Play sequence
    playSequence(newSeq);
  };

  // Play sequence animation
  const playSequence = (seq: number[]) => {
    seq.forEach((buttonId, index) => {
      setTimeout(() => {
        setActiveButton(buttonId);
        // Play sound effect (visual feedback)
        setTimeout(() => {
          setActiveButton(null);
          if (index === seq.length - 1) {
            // Sequence done, player's turn
            setTimeout(() => {
              setGamePhase('play');
              setLastFlashTime(Date.now());
            }, 500);
          }
        }, 400);
      }, index * 800); // 800ms between each flash
    });
  };

  // Handle button click
  const handleButtonClick = (buttonId: number) => {
    if (gamePhase !== 'play') return;

    const reactionTime = Date.now() - lastFlashTime;
    setReactionTimes(prev => [...prev, reactionTime]);
    setLastFlashTime(Date.now());

    // Flash button
    setActiveButton(buttonId);
    setTimeout(() => setActiveButton(null), 200);

    const newPlayerSeq = [...playerSequence, buttonId];
    setPlayerSequence(newPlayerSeq);

    addEvent({
      type: 'button-click',
      data: { buttonId, position: newPlayerSeq.length, reactionTime }
    });

    // Check if wrong
    if (buttonId !== sequence[newPlayerSeq.length - 1]) {
      // Wrong button!
      evaluateRound(newPlayerSeq, false);
      return;
    }

    // Check if sequence complete
    if (newPlayerSeq.length === sequence.length) {
      evaluateRound(newPlayerSeq, true);
    }
  };

  // Evaluate round
  const evaluateRound = (playerSeq: number[], perfect: boolean) => {
    const correct = playerSeq.filter((val, idx) => val === sequence[idx]).length;
    const accuracy = (correct / sequence.length) * 100;
    const roundScore = perfect ? sequence.length * 10 : correct * 5;
    const timeSpent = Date.now() - startTime;
    const avgReactionTime = reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length;

    setScore(prev => prev + roundScore);
    setRoundMetrics(prev => [...prev, {
      round: currentRound,
      accuracy,
      correct,
      total: sequence.length,
      timeSpent,
      avgReactionTime,
      perfect
    }]);

    // Show feedback
    setGamePhase('feedback');
    if (perfect) {
      setFeedback(`🎉 Perfect! +${roundScore} points!`);
    } else if (accuracy >= 50) {
      setFeedback(`👍 Good try! ${correct}/${sequence.length} correct`);
    } else {
      setFeedback(`💪 Keep going! ${correct}/${sequence.length} correct`);
    }

    addEvent({
      type: 'round-complete',
      data: { round: currentRound, accuracy, perfect }
    });

    setReactionTimes([]);

    // Next round or complete
    setTimeout(() => {
      if (currentRound < totalRounds) {
        setCurrentRound(prev => prev + 1);
        setGamePhase('intro');
      } else {
        completeGame();
      }
    }, 2000);
  };

  // Complete game
  const completeGame = () => {
    setGamePhase('complete');

    const totalTime = roundMetrics.reduce((sum, m) => sum + m.timeSpent, 0);
    const avgAccuracy = roundMetrics.reduce((sum, m) => sum + m.accuracy, 0) / roundMetrics.length;
    const avgReactionTime = roundMetrics.reduce((sum, m) => sum + m.avgReactionTime, 0) / roundMetrics.length;
    const perfectRounds = roundMetrics.filter(m => m.perfect).length;

    const metrics = {
      timeSpent: totalTime,
      accuracy: avgAccuracy,
      avgReactionTime,
      perfectRounds,
      totalRounds,
      coordinationScore: score,
    };

    updateMetrics(metrics);
    endSession();

    onComplete({
      ...metrics,
      roundMetrics,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full bg-white/10 backdrop-blur-md rounded-3xl p-8 text-white">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">🎮 Color Memory</h1>
          <div className="text-right">
            <div className="text-sm opacity-75">Level {currentRound}/{totalRounds}</div>
            <div className="text-2xl font-bold">{score} pts</div>
          </div>
        </div>

        {/* Intro Phase */}
        {gamePhase === 'intro' && (
          <div className="text-center py-12">
            <p className="text-xl mb-8">
              {currentRound === 1
                ? "Watch the color sequence, then repeat it by clicking the buttons!"
                : `Level ${currentRound} - ${currentRound} colors to remember!`}
            </p>
            <button
              onClick={startGame}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-4 px-8 rounded-full text-xl transition-all transform hover:scale-105"
            >
              {currentRound === 1 ? '🎮 Start Game' : '▶️ Next Level'}
            </button>
          </div>
        )}

        {/* Watch Phase */}
        {gamePhase === 'watch' && (
          <div className="space-y-8">
            <div className="text-center text-2xl font-bold animate-pulse mb-8">
              👀 Watch carefully!
            </div>
            <div className="grid grid-cols-4 gap-4 max-w-2xl mx-auto">
              {BUTTONS.map(button => (
                <button
                  key={button.id}
                  disabled
                  className={`
                    ${button.color} 
                    ${activeButton === button.id ? 'scale-110 shadow-2xl ring-4 ring-white' : 'opacity-50'}
                    transition-all duration-200 aspect-square rounded-2xl text-6xl
                    flex items-center justify-center
                  `}
                >
                  {button.emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Play Phase */}
        {gamePhase === 'play' && (
          <div className="space-y-8">
            <div className="text-center">
              <div className="text-2xl font-bold mb-2">Your turn!</div>
              <div className="text-lg opacity-75">
                {playerSequence.length}/{sequence.length} colors
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 max-w-2xl mx-auto">
              {BUTTONS.map(button => (
                <button
                  key={button.id}
                  onClick={() => handleButtonClick(button.id)}
                  className={`
                    ${button.color} 
                    ${activeButton === button.id ? 'scale-110 shadow-2xl ring-4 ring-white' : 'hover:scale-105'}
                    transition-all duration-200 aspect-square rounded-2xl text-6xl
                    flex items-center justify-center cursor-pointer
                  `}
                >
                  {button.emoji}
                </button>
              ))}
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-2">
              {sequence.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-3 h-3 rounded-full ${idx < playerSequence.length
                      ? playerSequence[idx] === sequence[idx]
                        ? 'bg-green-400'
                        : 'bg-red-400'
                      : 'bg-white/30'
                    }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Feedback Phase */}
        {gamePhase === 'feedback' && (
          <div className="text-center py-12">
            <div className="text-4xl mb-6 animate-bounce">{feedback}</div>
            <div className="text-lg opacity-75">
              {currentRound < totalRounds ? 'Get ready for next level...' : 'Game Complete!'}
            </div>
          </div>
        )}

        {/* Complete Phase */}
        {gamePhase === 'complete' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-6">🏆</div>
            <div className="text-3xl font-bold mb-4">Amazing!</div>
            <div className="text-xl mb-6">Total Score: {score}</div>
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-left bg-white/10 rounded-xl p-6">
              <div>
                <div className="text-sm opacity-75">Perfect Rounds</div>
                <div className="text-2xl font-bold">{roundMetrics.filter(m => m.perfect).length}/{totalRounds}</div>
              </div>
              <div>
                <div className="text-sm opacity-75">Avg Accuracy</div>
                <div className="text-2xl font-bold">
                  {Math.round(roundMetrics.reduce((sum, m) => sum + m.accuracy, 0) / roundMetrics.length)}%
                </div>
              </div>
            </div>
            <div className="text-sm opacity-60 mt-4">Saving results...</div>
          </div>
        )}
      </div>
    </div>
  );
}
