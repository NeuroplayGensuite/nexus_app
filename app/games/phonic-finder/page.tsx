'use client';

import { useRouter } from 'next/navigation';
import PhonicFinder from '@/components/games/PhonicFinder';
import Link from 'next/link';
import { GameErrorBoundary } from '@/components/ErrorBoundary';

export default function PhonicFinderPage() {
  const router = useRouter();

  const handleComplete = (metrics: {
    phonicDelay: number;
    phonemicSlips: number;
    totalAttempts: number;
    accuracy: number;
  }) => {
    console.log('Phonic Finder completed with metrics:', metrics);
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
          <GameErrorBoundary gameName="Phonic Finder">
            <PhonicFinder onComplete={handleComplete} />
          </GameErrorBoundary>
        </div>

        <div className="mt-6 bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
          <h3 className="text-lg font-bold text-white mb-2">🎯 What we&apos;re measuring:</h3>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• <strong>Phonological Speed:</strong> How quickly you connect sounds to pictures</li>
            <li>• <strong>Auditory-Visual Mapping:</strong> Accuracy in matching sounds to images</li>
            <li>• <strong>Phonemic Awareness:</strong> Recognition of beginning sounds</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
