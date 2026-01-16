'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSessionStore } from '@/stores/session-store';

interface DotConnectProps {
  onComplete: (metrics: any) => void;
}

interface Dot {
  id: number;
  x: number;
  y: number;
}

interface Connection {
  from: number;
  to: number;
}

export default function DotConnect({ onComplete }: DotConnectProps) {
  const { addEvent } = useSessionStore();
  
  // Game state
  const [gamePhase, setGamePhase] = useState<'intro' | 'memorize' | 'draw' | 'feedback' | 'complete'>('intro');
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds] = useState(5);
  const [dots, setDots] = useState<Dot[]>([]);
  const [targetConnections, setTargetConnections] = useState<Connection[]>([]);
  const [playerConnections, setPlayerConnections] = useState<Connection[]>([]);
  const [currentDot, setCurrentDot] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [countdown, setCountdown] = useState(5);
  
  // Metrics
  const [startTime, setStartTime] = useState<number>(0);
  const [roundMetrics, setRoundMetrics] = useState<any[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Generate pattern (dots + connections)
  const generatePattern = useCallback(() => {
    const numDots = Math.min(4 + currentRound, 8); // 5 to 8 dots
    const newDots: Dot[] = [];
    
    // Generate dots with minimum distance
    for (let i = 0; i < numDots; i++) {
      let x: number;
      let y: number;
      let valid: boolean;
      let attempts = 0;
      do {
        x = 15 + Math.random() * 70;
        y = 15 + Math.random() * 70;
        valid = newDots.every(dot => {
          const dist = Math.sqrt(Math.pow(dot.x - x, 2) + Math.pow(dot.y - y, 2));
          return dist > 15;
        });
        attempts++;
      } while (!valid && attempts < 50);
      
      newDots.push({ id: i, x, y });
    }
    
    // Create interesting connections (not just sequential)
    const connections: Connection[] = [];
    const patterns = [
      // Star pattern
      () => {
        const center = Math.floor(numDots / 2);
        for (let i = 0; i < numDots; i++) {
          if (i !== center) connections.push({ from: center, to: i });
        }
      },
      // Circle pattern
      () => {
        for (let i = 0; i < numDots; i++) {
          connections.push({ from: i, to: (i + 1) % numDots });
        }
      },
      // Zigzag pattern
      () => {
        for (let i = 0; i < numDots - 1; i++) {
          connections.push({ from: i, to: i + 1 });
        }
      },
      // Random interesting pattern
      () => {
        const numConnections = Math.min(numDots + 1, numDots * 2);
        const used = new Set<string>();
        for (let i = 0; i < numConnections; i++) {
          let from = Math.floor(Math.random() * numDots);
          let to = Math.floor(Math.random() * numDots);
          const key = `${Math.min(from, to)}-${Math.max(from, to)}`;
          if (from !== to && !used.has(key)) {
            connections.push({ from, to });
            used.add(key);
          }
        }
      }
    ];
    
    // Pick random pattern
    patterns[Math.floor(Math.random() * patterns.length)]();
    
    return { dots: newDots, connections };
  }, [currentRound]);
  
  // Start game
  const startGame = () => {
    const pattern = generatePattern();
    setDots(pattern.dots);
    setTargetConnections(pattern.connections);
    setPlayerConnections([]);
    setCurrentDot(null);
    setGamePhase('memorize');
    setStartTime(Date.now());
    
    addEvent({
      type: 'game-start',
      data: { round: currentRound, dots: pattern.dots.length, connections: pattern.connections.length }
    });
    
    // Countdown then hide pattern
    let timeLeft = 5;
    setCountdown(5);
    const countInterval = setInterval(() => {
      timeLeft--;
      setCountdown(timeLeft);
      if (timeLeft === 0) {
        clearInterval(countInterval);
      }
    }, 1000);
    
    setTimeout(() => {
      setGamePhase('draw');
      addEvent({
        type: 'draw-start',
        data: { round: currentRound }
      });
    }, 5000);
  };
  
  // Handle dot click
  const handleDotClick = (dotId: number) => {
    if (gamePhase !== 'draw') return;
    
    if (currentDot === null) {
      // Start new line
      setCurrentDot(dotId);
    } else {
      // Complete line
      if (currentDot !== dotId) {
        const newConnection: Connection = {
          from: Math.min(currentDot, dotId),
          to: Math.max(currentDot, dotId)
        };
        
        // Check if already exists
        const exists = playerConnections.some(
          conn => conn.from === newConnection.from && conn.to === newConnection.to
        );
        
        if (!exists) {
          const newConnections = [...playerConnections, newConnection];
          setPlayerConnections(newConnections);
          
          addEvent({
            type: 'connection-drawn',
            data: { from: currentDot, to: dotId }
          });
        }
      }
      setCurrentDot(null);
    }
  };
  
  // Submit drawing
  const submitDrawing = () => {
    evaluateRound();
  };
  
  // Clear last connection
  const undoConnection = () => {
    if (playerConnections.length > 0) {
      setPlayerConnections(prev => prev.slice(0, -1));
    }
  };
  
  // Evaluate round
  const evaluateRound = () => {
    // Compare connections
    let correctConnections = 0;
    playerConnections.forEach(playerConn => {
      const isCorrect = targetConnections.some(
        targetConn => targetConn.from === playerConn.from && targetConn.to === playerConn.to
      );
      if (isCorrect) correctConnections++;
    });
    
    const extraConnections = playerConnections.length - correctConnections;
    const missedConnections = targetConnections.length - correctConnections;
    
    const accuracy = targetConnections.length > 0 
      ? (correctConnections / targetConnections.length) * 100 
      : 0;
    
    const roundScore = Math.round(accuracy);
    const timeSpent = Date.now() - startTime;
    
    setScore(prev => prev + roundScore);
    setRoundMetrics(prev => [...prev, {
      round: currentRound,
      accuracy,
      correctConnections,
      totalConnections: targetConnections.length,
      extraConnections,
      missedConnections,
      timeSpent,
    }]);
    
    // Show feedback
    setGamePhase('feedback');
    if (accuracy >= 80) {
      setFeedback(`🌟 Excellent! ${correctConnections}/${targetConnections.length} connections!`);
    } else if (accuracy >= 60) {
      setFeedback(`⭐ Good! ${correctConnections}/${targetConnections.length} connections!`);
    } else {
      setFeedback(`💫 Keep practicing! ${correctConnections}/${targetConnections.length} connections!`);
    }
    
    addEvent({
      type: 'round-complete',
      data: { round: currentRound, accuracy, correctConnections, totalConnections: targetConnections.length }
    });
    
    // Next round or complete
    setTimeout(() => {
      if (currentRound < totalRounds) {
        setCurrentRound(prev => prev + 1);
        setGamePhase('intro');
      } else {
        completeGame();
      }
    }, 3000);
  };
  
  // Complete game
  const completeGame = () => {
    setGamePhase('complete');
    
    const totalTime = roundMetrics.reduce((sum, m) => sum + m.timeSpent, 0);
    const avgAccuracy = roundMetrics.reduce((sum, m) => sum + m.accuracy, 0) / roundMetrics.length;
    const totalCorrect = roundMetrics.reduce((sum, m) => sum + m.correctConnections, 0);
    const totalConnections = roundMetrics.reduce((sum, m) => sum + m.totalConnections, 0);
    
    onComplete({
      timeSpent: totalTime,
      accuracy: avgAccuracy,
      correctConnections: totalCorrect,
      totalConnections,
      visualSpatialScore: score,
      roundMetrics,
    });
  };
  
  // Render SVG line
  const renderLine = (from: Dot, to: Dot, color: string, width: number = 3) => {
    return (
      <line
        x1={`${from.x}%`}
        y1={`${from.y}%`}
        x2={`${to.x}%`}
        y2={`${to.y}%`}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
      />
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 via-cyan-900 to-blue-900 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full bg-white/10 backdrop-blur-md rounded-3xl p-8 text-white">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">🔗 Dot Connect</h1>
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
                ? "Memorize the dot pattern, then recreate it by connecting the dots!"
                : `Round ${currentRound} - Get Ready!`}
            </p>
            <button
              onClick={startGame}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold py-4 px-8 rounded-full text-xl transition-all transform hover:scale-105"
            >
              {currentRound === 1 ? '🎮 Start Game' : '▶️ Next Round'}
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
              ref={canvasRef}
              className="relative bg-black/30 rounded-2xl aspect-square max-w-xl mx-auto border-2 border-cyan-500/30"
            >
              <svg className="absolute inset-0 w-full h-full">
                {targetConnections.map((conn, idx) => {
                  const fromDot = dots.find(d => d.id === conn.from)!;
                  const toDot = dots.find(d => d.id === conn.to)!;
                  return <g key={idx}>{renderLine(fromDot, toDot, '#22d3ee', 4)}</g>;
                })}
              </svg>
              {dots.map(dot => (
                <div
                  key={dot.id}
                  className="absolute w-8 h-8 bg-cyan-400 rounded-full border-4 border-white shadow-lg flex items-center justify-center font-bold text-black"
                  style={{
                    left: `${dot.x}%`,
                    top: `${dot.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {dot.id + 1}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Draw Phase */}
        {gamePhase === 'draw' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-xl mb-2">Recreate the pattern!</div>
              <div className="text-sm opacity-75">
                Click dots to connect them • {playerConnections.length} connections drawn
              </div>
            </div>
            <div 
              ref={canvasRef}
              className="relative bg-black/30 rounded-2xl aspect-square max-w-xl mx-auto border-2 border-teal-500/50"
            >
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {playerConnections.map((conn, idx) => {
                  const fromDot = dots.find(d => d.id === conn.from)!;
                  const toDot = dots.find(d => d.id === conn.to)!;
                  return <g key={idx}>{renderLine(fromDot, toDot, '#14b8a6', 3)}</g>;
                })}
                {currentDot !== null && (
                  <circle
                    cx={`${dots[currentDot].x}%`}
                    cy={`${dots[currentDot].y}%`}
                    r="20"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="3"
                    className="animate-pulse"
                  />
                )}
              </svg>
              {dots.map(dot => (
                <div
                  key={dot.id}
                  onClick={() => handleDotClick(dot.id)}
                  className={`
                    absolute w-8 h-8 rounded-full border-4 shadow-lg flex items-center justify-center font-bold cursor-pointer
                    ${currentDot === dot.id ? 'bg-yellow-400 border-yellow-300 scale-125' : 'bg-teal-400 border-white hover:scale-110'}
                    transition-all text-black
                  `}
                  style={{
                    left: `${dot.x}%`,
                    top: `${dot.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {dot.id + 1}
                </div>
              ))}
            </div>
            
            <div className="flex justify-center gap-4">
              <button
                onClick={undoConnection}
                disabled={playerConnections.length === 0}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-full transition-all"
              >
                ↩️ Undo
              </button>
              <button
                onClick={submitDrawing}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-full transition-all transform hover:scale-105"
              >
                ✅ Submit
              </button>
            </div>
          </div>
        )}
        
        {/* Feedback Phase */}
        {gamePhase === 'feedback' && (
          <div className="text-center py-12">
            <div className="text-4xl mb-6 animate-bounce">{feedback}</div>
            <div className="text-lg opacity-75 mb-8">
              {currentRound < totalRounds ? 'Get ready for next round...' : 'Game Complete!'}
            </div>
            {/* Show comparison */}
            <div className="max-w-xl mx-auto">
              <div className="text-sm mb-2">Your pattern vs Correct pattern</div>
              <div 
                className="relative bg-black/20 rounded-2xl aspect-square border border-white/20"
              >
                <svg className="absolute inset-0 w-full h-full">
                  {targetConnections.map((conn, idx) => {
                    const fromDot = dots.find(d => d.id === conn.from)!;
                    const toDot = dots.find(d => d.id === conn.to)!;
                    return <g key={`target-${idx}`}>{renderLine(fromDot, toDot, '#22d3ee', 2)}</g>;
                  })}
                  {playerConnections.map((conn, idx) => {
                    const fromDot = dots.find(d => d.id === conn.from)!;
                    const toDot = dots.find(d => d.id === conn.to)!;
                    const isCorrect = targetConnections.some(
                      tc => tc.from === conn.from && tc.to === conn.to
                    );
                    return <g key={`player-${idx}`}>{renderLine(fromDot, toDot, isCorrect ? '#10b981' : '#ef4444', 3)}</g>;
                  })}
                </svg>
                {dots.map(dot => (
                  <div
                    key={dot.id}
                    className="absolute w-6 h-6 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center text-xs font-bold text-black"
                    style={{
                      left: `${dot.x}%`,
                      top: `${dot.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {dot.id + 1}
                  </div>
                ))}
              </div>
              <div className="text-xs mt-2 opacity-60">
                <span className="text-cyan-400">━━</span> Correct pattern • 
                <span className="text-green-400"> ━━</span> Your correct lines • 
                <span className="text-red-400"> ━━</span> Wrong lines
              </div>
            </div>
          </div>
        )}
        
        {/* Complete Phase */}
        {gamePhase === 'complete' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-6">🏆</div>
            <div className="text-3xl font-bold mb-4">Excellent Work!</div>
            <div className="text-xl mb-6">Total Score: {score}</div>
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-left bg-white/10 rounded-xl p-6">
              <div>
                <div className="text-sm opacity-75">Correct Connections</div>
                <div className="text-2xl font-bold">
                  {roundMetrics.reduce((sum, m) => sum + m.correctConnections, 0)}/
                  {roundMetrics.reduce((sum, m) => sum + m.totalConnections, 0)}
                </div>
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
