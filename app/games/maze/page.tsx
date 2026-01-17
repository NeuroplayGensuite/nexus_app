'use client';

import { useRouter } from 'next/navigation';
import MazeGame from '@/components/games/MazeGame';
import Link from 'next/link';
import { GameErrorBoundary } from '@/components/ErrorBoundary';

export default function MazePage() {
  const router = useRouter();

  const handleComplete = (metrics: {
    mse: number;
    wallCollisions: number;
    proximityEvents: number;
    wallHuggingRatio: number;
    jerkMean: number;
    jerkVariance: number;
    tremorIndicator: number;
  }) => {
    console.log('Maze completed with metrics:', metrics);
    // Navigate back after a delay
    setTimeout(() => {
      router.push('/');
    }, 3000);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back button */}
        <Link
          href="/"
          className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition"
        >
          ← Back to Games
        </Link>

        {/* Game */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
          <GameErrorBoundary gameName="Maze Navigator">
            <MazeGame onComplete={handleComplete} />
          </GameErrorBoundary>
        </div>

        {/* Info */}
        <div className="mt-6 bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
          <h3 className="text-lg font-bold text-white mb-2">🎯 What we&apos;re measuring:</h3>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• <strong>Path Accuracy (MSE):</strong> How well you stay on the path center</li>
            <li>• <strong>Wall Interactions:</strong> How you handle obstacles</li>
            <li>• <strong>Movement Smoothness:</strong> How steady your hand movements are</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
