'use client';

import { useRouter } from 'next/navigation';
import DotConnect from '@/components/games/DotConnect';
import Link from 'next/link';
import { GameErrorBoundary } from '@/components/ErrorBoundary';

export default function DotConnectPage() {
  const router = useRouter();

  const handleComplete = async (metrics: any) => {
    console.log('Dot Connect metrics saved via session store');
    // Session already saved by the component's endSession() call
    // Just redirect to home after 3 seconds
    setTimeout(() => {
      router.push('/');
    }, 3000);
  };

  return (
    <div className="relative">
      <Link
        href="/profile"
        className="absolute top-4 left-4 z-10 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full transition-all"
      >
        ← Back
      </Link>
      <GameErrorBoundary gameName="Dot Connect">
        <DotConnect onComplete={handleComplete} />
      </GameErrorBoundary>
    </div>
  );
}
