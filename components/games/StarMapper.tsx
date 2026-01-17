'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSessionStore } from '@/stores/session-store';

interface StarMapperProps {
  onComplete: (metrics: any) => void;
}

interface Star {
  id: number;
  x: number;
  y: number;
}

export default function StarMapper({ onComplete }: StarMapperProps) {
  const { addEvent, startSession, endSession, updateMetrics } = useSessionStore();

  // Game state
  const [gamePhase, setGamePhase] = useState<'intro' | 'memorize' | 'recall' | 'feedback' | 'complete'>('intro');
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds] = useState(5);
  const [starPattern, setStarPattern] = useState<Star[]>([]);
  const [playerClicks, setPlayerClicks] = useState<Star[]>([]);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [countdown, setCountdown] = useState(3);

  // Metrics
  const [startTime, setStartTime] = useState<number>(0);
  const [roundMetrics, setRoundMetrics] = useState<any[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);

  // Grid configuration
  const GRID_SIZE = 6; // 6x6 grid
  const MEMORY_TIME = 3000; // 3 seconds to memorize
  const TOLERANCE = 35; // pixels - how close click must be to star

  // Generate random star pattern
  const generatePattern = useCallback(() => {
    const numStars = Math.min(3 + currentRound, 8); // 4 to 8 stars
    const pattern: Star[] = [];
    const usedPositions = new Set<string>();

    for (let i = 0; i < numStars; i++) {
      let x, y, key;
      do {
        x = Math.floor(Math.random() * GRID_SIZE);
        y = Math.floor(Math.random() * GRID_SIZE);
        key = `${x}-${y}`;
      } while (usedPositions.has(key));

      usedPositions.add(key);
      pattern.push({
        id: i,
        x: x * (100 / GRID_SIZE) + (50 / GRID_SIZE), // Convert to percentage
        y: y * (100 / GRID_SIZE) + (50 / GRID_SIZE),
      });
    }

    return pattern;
  }, [currentRound]);

  // Start game
  const startGame = () => {
    // Start session on first round
    if (currentRound === 1) {
      startSession('star');
    }

    setGamePhase('memorize');
    setStartTime(Date.now());
    const pattern = generatePattern();
    setStarPattern(pattern);
    setPlayerClicks([]);

    addEvent({
      type: 'game-start',
      data: { round: currentRound, patternSize: pattern.length }
    });

    // Countdown then hide stars
    let timeLeft = 3;
    setCountdown(3);
    const countInterval = setInterval(() => {
      timeLeft--;
      setCountdown(timeLeft);
      if (timeLeft === 0) {
        clearInterval(countInterval);
      }
    }, 1000);

    setTimeout(() => {
      setGamePhase('recall');
      addEvent({
        type: 'recall-start',
        data: { round: currentRound }
      });
    }, MEMORY_TIME);
  };

  // Handle grid click
  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (gamePhase !== 'recall') return;

    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newClick: Star = {
      id: playerClicks.length,
      x,
      y,
    };

    setPlayerClicks(prev => [...prev, newClick]);

    addEvent({
      type: 'star-click',
      data: { x, y, clickNumber: playerClicks.length + 1 }
    });

    // If player has clicked same number of times as stars, evaluate
    if (playerClicks.length + 1 === starPattern.length) {
      evaluateRound(x, y);
    }
  };

  // Evaluate round accuracy
  const evaluateRound = (lastX: number, lastY: number) => {
    const allClicks = [...playerClicks, { id: playerClicks.length, x: lastX, y: lastY }];

    let correctClicks = 0;
    const matched = new Set<number>();

    // Check each click against each star
    allClicks.forEach(click => {
      starPattern.forEach(star => {
        if (matched.has(star.id)) return;

        const distance = Math.sqrt(
          Math.pow(click.x - star.x, 2) + Math.pow(click.y - star.y, 2)
        );

        if (distance < (TOLERANCE / 6)) { // Adjust for percentage-based grid
          correctClicks++;
          matched.add(star.id);
        }
      });
    });

    const accuracy = (correctClicks / starPattern.length) * 100;
    const roundScore = Math.round(accuracy);
    const timeSpent = Date.now() - startTime;

    setScore(prev => prev + roundScore);
    setRoundMetrics(prev => [...prev, {
      round: currentRound,
      accuracy,
      correctClicks,
      totalStars: starPattern.length,
      timeSpent,
    }]);

    // Show feedback
    setGamePhase('feedback');
    if (accuracy >= 80) {
      setFeedback(`🌟 Excellent! ${correctClicks}/${starPattern.length} stars!`);
    } else if (accuracy >= 60) {
      setFeedback(`⭐ Good! ${correctClicks}/${starPattern.length} stars!`);
    } else {
      setFeedback(`💫 Keep trying! ${correctClicks}/${starPattern.length} stars!`);
    }

    addEvent({
      type: 'round-complete',
      data: { round: currentRound, accuracy, correctClicks, totalStars: starPattern.length }
    });

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
    const totalCorrect = roundMetrics.reduce((sum, m) => sum + m.correctClicks, 0);
    const totalStars = roundMetrics.reduce((sum, m) => sum + m.totalStars, 0);

    const metrics = {
      timeSpent: totalTime,
      accuracy: avgAccuracy,
      correctClicks: totalCorrect,
      totalStars,
      spatialErrors: totalStars - totalCorrect,
    };

    updateMetrics(metrics);
    endSession();

    onComplete({
      ...metrics,
      roundMetrics,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full bg-white/10 backdrop-blur-md rounded-3xl p-8 text-white">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">⭐ Star Mapper</h1>
          <div className="text-right">
            <div className="text-sm opacity-75">Round {currentRound}/{totalRounds}</div>
            <div className="text-2xl font-bold">{score} pts</div>
          </div>
        </div>

        {/* Intro Phase */}
        {gamePhase === 'intro' && (
          <div className="text-center py-12">
            <p className="text-xl mb-8">
              {currentRound === 1
                ? "Remember where the stars appear, then click to recreate the pattern!"
                : `Round ${currentRound} - Get Ready!`}
            </p>
            <button
              onClick={startGame}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold py-4 px-8 rounded-full text-xl transition-all transform hover:scale-105"
            >
              {currentRound === 1 ? 'Start Game' : 'Next Round'}
            </button>
          </div>
        )}

        {/* Memorize Phase */}
        {gamePhase === 'memorize' && (
          <div className="space-y-6">
            <div className="text-center text-2xl font-bold mb-4">
              Memorize! {countdown}s
            </div>
            <div
              ref={gridRef}
              className="relative bg-black/30 rounded-2xl aspect-square max-w-xl mx-auto border-2 border-purple-500/30"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: `${100 / GRID_SIZE}% ${100 / GRID_SIZE}%`
              }}
            >
              {starPattern.map(star => (
                <div
                  key={star.id}
                  className="absolute text-4xl animate-pulse"
                  style={{
                    left: `${star.x}%`,
                    top: `${star.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  ⭐
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recall Phase */}
        {gamePhase === 'recall' && (
          <div className="space-y-6">
            <div className="text-center text-xl mb-4">
              Click where the stars were! ({playerClicks.length}/{starPattern.length})
            </div>
            <div
              ref={gridRef}
              onClick={handleGridClick}
              className="relative bg-black/30 rounded-2xl aspect-square max-w-xl mx-auto border-2 border-pink-500/50 cursor-crosshair"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: `${100 / GRID_SIZE}% ${100 / GRID_SIZE}%`
              }}
            >
              {playerClicks.map(click => (
                <div
                  key={click.id}
                  className="absolute text-3xl"
                  style={{
                    left: `${click.x}%`,
                    top: `${click.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  ✨
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback Phase */}
        {gamePhase === 'feedback' && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4 animate-bounce">{feedback}</div>
            <div className="text-lg opacity-75">
              {currentRound < totalRounds ? 'Get ready for next round...' : 'Game Complete!'}
            </div>
            {/* Show both patterns for comparison */}
            <div className="mt-8 max-w-xl mx-auto">
              <div
                className="relative bg-black/20 rounded-2xl aspect-square border border-white/20"
                style={{
                  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
                  backgroundSize: `${100 / GRID_SIZE}% ${100 / GRID_SIZE}%`
                }}
              >
                {starPattern.map(star => (
                  <div
                    key={`actual-${star.id}`}
                    className="absolute text-2xl"
                    style={{
                      left: `${star.x}%`,
                      top: `${star.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    ⭐
                  </div>
                ))}
                {playerClicks.map(click => (
                  <div
                    key={`click-${click.id}`}
                    className="absolute text-2xl"
                    style={{
                      left: `${click.x}%`,
                      top: `${click.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    ✨
                  </div>
                ))}
              </div>
              <div className="text-sm mt-2 opacity-60">⭐ = Actual | ✨ = Your clicks</div>
            </div>
          </div>
        )}

        {/* Complete Phase */}
        {gamePhase === 'complete' && (
          <div className="text-center py-12">
            <div className="text-5xl mb-6">🎉</div>
            <div className="text-3xl font-bold mb-4">Game Complete!</div>
            <div className="text-xl mb-2">Total Score: {score}</div>
            <div className="text-lg opacity-75">Saving results...</div>
          </div>
        )}
      </div>
    </div>
  );
}
