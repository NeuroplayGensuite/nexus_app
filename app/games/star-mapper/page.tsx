'use client';

import { useRouter } from 'next/navigation';
import StarMapper from '@/components/games/StarMapper';
import Link from 'next/link';
import { GameErrorBoundary } from '@/components/ErrorBoundary';

export default function StarMapperPage() {
  const router = useRouter();

  const handleComplete = async (metrics: {
    spatialDecay1s: number;
    spatialDecay3s: number;
    spatialDecay5s: number;
    visualMemoryScore: number;
  }) => {
    console.log('Star Mapper metrics saved via session store');
    // Session already saved by the component's endSession() call
    // Just redirect to home after 3 seconds
    setTimeout(() => {
      router.push('/');
    }, 3000);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Link
          href="/"
          className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition"
        >
          ← Back to Games
        </Link>

        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
          <GameErrorBoundary gameName="Star Mapper">
            <StarMapper onComplete={handleComplete} />
          </GameErrorBoundary>
        </div>

        <div className="mt-6 bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
          <h3 className="text-lg font-bold text-white mb-2">🎯 What we&apos;re measuring:</h3>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• <strong>Visual-Spatial Memory:</strong> Ability to remember patterns</li>
            <li>• <strong>Memory Decay:</strong> How accuracy changes over time</li>
            <li>• <strong>Pattern Recreation:</strong> Precision in redrawing shapes</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
