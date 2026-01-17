'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSessionStore } from '@/stores/session-store';
import {
  calculateMSE,
  calculateWallHuggingVariance,
  interpolatePath,
  countWallCollisions,
  countProximityEvents
} from '@/lib/biometrics/mse-calculator';
import {
  calculateJerk,
  analyzeJerkPatterns,
  calculateTremor
} from '@/lib/biometrics/jerk-analysis';
import { useMazeLevel } from '@/lib/hooks/use-level-generator';
import { Coordinate, WallBoundary, BiometricMetrics } from '@/types';

interface MazeGameProps {
  onComplete: (metrics: {
    mse: number;
    wallCollisions: number;
    proximityEvents: number;
    wallHuggingRatio: number;
    jerkMean: number;
    jerkVariance: number;
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

  // Draw the maze - MUST be before early return
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
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pathRef.current[0].x, pathRef.current[0].y);
      pathRef.current.forEach((point) => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    }

    // Draw character (pointer/finger)
    if (isDrawing || (isPlaying && !isComplete)) {
      // Outer glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = isDrawing ? '#60a5fa' : '#22c55e';

      ctx.fillStyle = isDrawing ? '#3b82f6' : '#10b981';
      ctx.beginPath();
      ctx.arc(charPos.x, charPos.y, 8, 0, Math.PI * 2);
      ctx.fill();

      // Reset shadow
      ctx.shadowBlur = 0;

      // Inner white dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(charPos.x, charPos.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [width, height, isDrawing, isPlaying, isComplete, isHoveringStart]);

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
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    setCharacterPos({ x, y });

    if (isDrawing) {
      const now = performance.now();
      pathRef.current.push({ x, y, timestamp: now });
      addCoordinate({ x, y, timestamp: now });
    }
  }, [isPlaying, isComplete, isDrawing, width, height, addCoordinate]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [handleMove]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isPlaying || isComplete) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Check if clicking on start button
    const distToStart = Math.sqrt(
      Math.pow(x - IDEAL_PATH[0].x, 2) + Math.pow(y - IDEAL_PATH[0].y, 2)
    );

    if (distToStart < 30) {
      handleStart();
    }
  }, [isPlaying, isComplete, width, height]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isPlaying || isComplete) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;

    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;

    // Check if tapping on start button
    const distToStart = Math.sqrt(
      Math.pow(x - IDEAL_PATH[0].x, 2) + Math.pow(y - IDEAL_PATH[0].y, 2)
    );

    if (distToStart < 30) {
      handleStart();
    }
  }, [isPlaying, isComplete, width, height]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // Start drawing from start point
  const handleStart = useCallback(() => {
    if (isComplete) return;
    setIsDrawing(true);
    setHasStarted(true);
    pathRef.current = [IDEAL_PATH[0]];
    setCharacterPos(IDEAL_PATH[0]);
    addCoordinate(IDEAL_PATH[0]);
    startSession('maze');
  }, [isComplete, addCoordinate, startSession]);

  // Handle game start button click
  const handleGameStart = useCallback(() => {
    setIsPlaying(true);
    setHasStarted(true);
  }, []);

  // Calculate metrics and complete
  const handleComplete = useCallback(() => {
    const endPoint = IDEAL_PATH[IDEAL_PATH.length - 1];
    const distance = Math.sqrt(
      Math.pow(characterPos.x - endPoint.x, 2) + Math.pow(characterPos.y - endPoint.y, 2)
    );

    if (distance < 30 && hasStarted && isDrawing) {
      setIsComplete(true);
      setIsDrawing(false);

      // Calculate MSE
      const mse = calculateMSE(pathRef.current, INTERPOLATED_PATH);

      // Count wall collisions
      const wallCollisions = countWallCollisions(pathRef.current, WALLS);

      // Count proximity events
      const proximityEvents = countProximityEvents(pathRef.current, WALLS);

      // Calculate wall hugging ratio
      const wallHuggingRatio = proximityEvents > 0 ? wallCollisions / proximityEvents : 0;

      // Calculate jerk (movement irregularity)
      const jerkValues = calculateJerk(pathRef.current);
      const jerkMean = jerkValues.length > 0
        ? jerkValues.reduce((a, b) => a + b, 0) / jerkValues.length
        : 0;
      const jerkVariance = jerkValues.length > 0
        ? jerkValues.reduce((sum, val) => sum + Math.pow(val - jerkMean, 2), 0) / jerkValues.length
        : 0;

      // Calculate tremor indicator
      const tremorIndicator = calculateTremor(pathRef.current);

      const metrics = {
        mse,
        wallCollisions,
        proximityEvents,
        wallHuggingRatio,
        jerkMean,
        jerkVariance,
        tremorIndicator,
      };

      updateMetrics(metrics);
      endSession();
      onComplete(metrics);
    }
  }, [characterPos, hasStarted, isDrawing, updateMetrics, endSession, onComplete]);

  // Check for completion on every move
  useEffect(() => {
    if (isDrawing && hasStarted) {
      handleComplete();
    }
  }, [characterPos, isDrawing, hasStarted, handleComplete]);

  // Show loading state while generating content
  if (levelLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-8">
        <div className="relative mb-6">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">🎮</span>
          </div>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">
          Creating Your Personalized Maze...
        </h3>
        <p className="text-gray-400 text-center max-w-md">
          {isGenerated
            ? "Customizing the maze based on your interests..."
            : "Preparing your adventure..."}
        </p>
      </div>
    );
  }

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
              onClick={handleGameStart}
              className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-bold text-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
            >
              🎮 Start Game
            </button>
          </div>
        )}
      </div>

      {hasStarted && !isComplete && (
        <div className="text-sm text-gray-400 text-center">
          💡 <strong>Tip:</strong> Stay close to the center path for better accuracy!
        </div>
      )}

      {isComplete && (
        <div className="text-center animate-fade-in">
          <div className="text-6xl mb-2">🎉</div>
          <p className="text-2xl font-bold text-green-400">
            {generatedLevel?.victoryMessage || 'Maze Completed!'}
          </p>
          <p className="text-gray-400 mt-2">Analyzing your performance...</p>
        </div>
      )}
    </div>
  );
}
