'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { 
  calculateMSE, 
  calculateWallHuggingVariance,
  interpolatePath 
} from '@/lib/biometrics/mse-calculator';
import { 
  calculateJerk, 
  analyzeJerkPatterns 
} from '@/lib/biometrics/jerk-analysis';
import { useMazeLevel } from '@/lib/hooks/use-level-generator';
import { Coordinate, WallBoundary } from '@/types';

interface MazeGameProps {
  onComplete: (metrics: {
    mse: number;
    wallCollisions: number;
    proximityEvents: number;
    wallHuggingRatio: number;
    tremorIndicator: number;
  }) => void;
  width?: number;
  height?: number;
}

// Maze configuration
const MAZE_CONFIG = {
  pathWidth: 60,
  characterRadius: 15,
  startColor: 0x4ade80,
  endColor: 0xf43f5e,
  pathColor: 0xe2e8f0,
  wallColor: 0x1e293b,
  characterColor: 0x3b82f6,
};

// Define the maze path (centerline)
const IDEAL_PATH: Coordinate[] = [
  { x: 80, y: 400, timestamp: 0 },
  { x: 80, y: 200, timestamp: 0 },
  { x: 200, y: 200, timestamp: 0 },
  { x: 200, y: 100, timestamp: 0 },
  { x: 400, y: 100, timestamp: 0 },
  { x: 400, y: 250, timestamp: 0 },
  { x: 550, y: 250, timestamp: 0 },
  { x: 550, y: 400, timestamp: 0 },
  { x: 700, y: 400, timestamp: 0 },
];

// Generate walls from path
function generateWalls(path: Coordinate[], pathWidth: number): WallBoundary[] {
  const walls: WallBoundary[] = [];
  const halfWidth = pathWidth / 2;

  for (let i = 0; i < path.length - 1; i++) {
    const curr = path[i];
    const next = path[i + 1];
    
    // Determine direction
    const dx = next.x - curr.x;
    const dy = next.y - curr.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal segment - walls above and below
      walls.push(
        { x1: curr.x, y1: curr.y - halfWidth, x2: next.x, y2: next.y - halfWidth },
        { x1: curr.x, y1: curr.y + halfWidth, x2: next.x, y2: next.y + halfWidth }
      );
    } else {
      // Vertical segment - walls left and right
      walls.push(
        { x1: curr.x - halfWidth, y1: curr.y, x2: next.x - halfWidth, y2: next.y },
        { x1: curr.x + halfWidth, y1: curr.y, x2: next.x + halfWidth, y2: next.y }
      );
    }
  }

  return walls;
}

const WALLS = generateWalls(IDEAL_PATH, MAZE_CONFIG.pathWidth);
const INTERPOLATED_PATH = interpolatePath(IDEAL_PATH, 200);

export default function MazeGame({ onComplete, width = 800, height = 500 }: MazeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isHoveringStart, setIsHoveringStart] = useState(false);
  const [characterPos, setCharacterPos] = useState({ x: 80, y: 400 });
  const [encouragementIndex, setEncouragementIndex] = useState(0);
  const pathRef = useRef<Coordinate[]>([]);
  
  const { startSession, endSession, addCoordinate, updateMetrics } = useSessionStore();
  
  // 🌟 Generative Level Engine - Get themed content based on child's interests
  const { level: generatedLevel, isLoading: levelLoading, isGenerated } = useMazeLevel();
  
  // Show encouragement messages periodically
  useEffect(() => {
    if (!isPlaying || !generatedLevel) return;
    
    const interval = setInterval(() => {
      setEncouragementIndex(prev => 
        (prev + 1) % (generatedLevel.encouragement?.length || 1)
      );
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isPlaying, generatedLevel]);

  // Draw the maze
  const drawMaze = useCallback((ctx: CanvasRenderingContext2D, charPos: { x: number; y: number }) => {
    // Clear canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Draw path background
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = MAZE_CONFIG.pathWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(IDEAL_PATH[0].x, IDEAL_PATH[0].y);
    IDEAL_PATH.forEach((point) => {
      ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();

    // Draw ideal center path (faint)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(IDEAL_PATH[0].x, IDEAL_PATH[0].y);
    IDEAL_PATH.forEach((point) => {
      ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw start zone with pulsing effect when not drawing
    const startPulse = (!isDrawing && isPlaying && !isComplete) || isHoveringStart;
    ctx.fillStyle = isHoveringStart ? '#10b981' : (startPulse ? '#34d399' : '#22c55e');
    ctx.beginPath();
    ctx.arc(IDEAL_PATH[0].x, IDEAL_PATH[0].y, startPulse ? 28 : 25, 0, Math.PI * 2);
    ctx.fill();
    
    // Add outer ring for click indicator
    if (startPulse) {
      ctx.strokeStyle = isHoveringStart ? '#10b981' : '#34d399';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(IDEAL_PATH[0].x, IDEAL_PATH[0].y, 35, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('START', IDEAL_PATH[0].x, IDEAL_PATH[0].y + 4);

    // Draw end zone
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    const endPoint = IDEAL_PATH[IDEAL_PATH.length - 1];
    ctx.arc(endPoint.x, endPoint.y, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('END', endPoint.x, endPoint.y + 4);

    // Draw player's traced path
    if (pathRef.current.length > 1) {
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pathRef.current[0].x, pathRef.current[0].y);
      pathRef.current.forEach((point) => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    }

    // Draw character
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(charPos.x, charPos.y, MAZE_CONFIG.characterRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw cute face on character
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(charPos.x - 4, charPos.y - 3, 3, 0, Math.PI * 2);
    ctx.arc(charPos.x + 4, charPos.y - 3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(charPos.x, charPos.y + 2, 5, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }, [width, height, isDrawing, isPlaying, isComplete, isHoveringStart]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawMaze(ctx, characterPos);
  }, [characterPos, drawMaze]);

  // Handle mouse/touch movement - only when drawing
  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isPlaying || isComplete) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Check if hovering over start (when not drawing)
    if (!isDrawing) {
      const startPoint = IDEAL_PATH[0];
      const distToStart = Math.sqrt(Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2));
      setIsHoveringStart(distToStart < 40);
    }

    if (!isDrawing) return;

    // Record coordinate
    const coord: Coordinate = { x, y, timestamp: Date.now() };
    pathRef.current.push(coord);
    addCoordinate(coord);

    setCharacterPos({ x, y });

    // Check if reached end
    const endPoint = IDEAL_PATH[IDEAL_PATH.length - 1];
    const distToEnd = Math.sqrt(Math.pow(x - endPoint.x, 2) + Math.pow(y - endPoint.y, 2));
    
    if (distToEnd < 30) {
      handleComplete();
    }
  }, [isPlaying, isComplete, isDrawing, addCoordinate]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      e.preventDefault();
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [handleMove]);

  // Start drawing on mouse/touch down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isPlaying || isComplete) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if starting near the start point
    const startPoint = IDEAL_PATH[0];
    const distToStart = Math.sqrt(Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2));
    
    if (distToStart < 40) {
      setIsDrawing(true);
      setCharacterPos({ x: startPoint.x, y: startPoint.y });
      pathRef.current = [{ x: startPoint.x, y: startPoint.y, timestamp: Date.now() }];
    }
  }, [isPlaying, isComplete]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isPlaying || isComplete || e.touches.length === 0) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;

    // Check if starting near the start point
    const startPoint = IDEAL_PATH[0];
    const distToStart = Math.sqrt(Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2));
    
    if (distToStart < 40) {
      setIsDrawing(true);
      setCharacterPos({ x: startPoint.x, y: startPoint.y });
      pathRef.current = [{ x: startPoint.x, y: startPoint.y, timestamp: Date.now() }];
    }
  }, [isPlaying, isComplete]);

  // Stop drawing on mouse/touch up
  const handleMouseUp = useCallback(() => {
    if (isDrawing && !isComplete) {
      setIsDrawing(false);
    }
  }, [isDrawing, isComplete]);

  const handleTouchEnd = useCallback(() => {
    if (isDrawing && !isComplete) {
      setIsDrawing(false);
    }
  }, [isDrawing, isComplete]);

  // Start the game
  const handleStart = useCallback(() => {
    setIsPlaying(true);
    setHasStarted(true);
    setIsDrawing(false);
    setCharacterPos({ x: IDEAL_PATH[0].x, y: IDEAL_PATH[0].y });
    pathRef.current = [];
    startSession('maze');
  }, [startSession]);

  // Complete the game
  const handleComplete = useCallback(() => {
    setIsPlaying(false);
    setIsComplete(true);

    const path = pathRef.current;
    
    // Calculate MSE
    const mse = calculateMSE(path, INTERPOLATED_PATH);
    
    // Calculate wall interactions
    const wallAnalysis = calculateWallHuggingVariance(path, WALLS);
    
    // Calculate jerk/tremor
    const jerkValues = calculateJerk(path);
    const jerkAnalysis = analyzeJerkPatterns(jerkValues);

    const metrics = {
      mse: Math.round(mse * 100) / 100,
      wallCollisions: wallAnalysis.collisions,
      proximityEvents: wallAnalysis.proximityEvents,
      wallHuggingRatio: Math.round(wallAnalysis.ratio * 100) / 100,
      jerkMean: Math.round(jerkAnalysis.mean * 100) / 100,
      jerkVariance: Math.round(jerkAnalysis.variance * 100) / 100,
      tremorIndicator: Math.round(jerkAnalysis.tremorIndicator * 100) / 100,
    };

    updateMetrics(metrics);
    endSession();
    onComplete(metrics);
  }, [updateMetrics, endSession, onComplete]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Loading state for level generation */}
      {levelLoading && (
        <div className="text-center mb-2 animate-pulse">
          <div className="text-2xl mb-2">✨</div>
          <p className="text-purple-400">Creating your personalized adventure...</p>
        </div>
      )}
      
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-white mb-1">
          🎮 {generatedLevel?.theme || 'The Maze Adventure'}
        </h2>
        {/* Show AI-generated badge */}
        {isGenerated && (
          <span className="inline-block px-2 py-1 text-xs bg-purple-600/30 text-purple-300 rounded-full mb-2">
            ✨ Personalized for you
          </span>
        )}
        <p className="text-gray-400 max-w-md">
          {!hasStarted 
            ? generatedLevel?.story || 'Click Start, then click and drag from START to END!'
            : isComplete 
              ? generatedLevel?.victoryMessage || '🎉 Great job! You completed the maze!'
              : isDrawing
                ? `Keep dragging to reach the ${generatedLevel?.goal || 'goal'}!`
                : `Click the START circle and drag to trace the path!`}
        </p>
        {/* Show encouragement while playing */}
        {isPlaying && generatedLevel?.encouragement && (
          <p className="text-yellow-400 mt-2 text-lg animate-bounce">
            {generatedLevel.encouragement[encouragementIndex]}
          </p>
        )}
      </div>

      <div className="relative rounded-xl overflow-hidden shadow-2xl border-4 border-slate-700">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={isHoveringStart ? "cursor-pointer touch-none" : (isDrawing ? "cursor-grabbing touch-none" : "cursor-grab touch-none")}
        />
        
        {!hasStarted && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <button
              onClick={handleStart}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xl font-bold rounded-full shadow-lg hover:scale-105 transition-transform"
            >
              🚀 Start Game
            </button>
          </div>
        )}

        {isComplete && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-2xl font-bold text-white mb-2">Maze Complete!</h3>
              <p className="text-gray-300">Your results have been recorded</p>
            </div>
          </div>
        )}
      </div>

      {isPlaying && (
        <div className="text-sm text-gray-400">
          Points recorded: {pathRef.current.length}
        </div>
      )}
    </div>
  );
}
