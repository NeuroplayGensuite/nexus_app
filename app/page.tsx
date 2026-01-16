'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/stores/session-store';
import { isSupabaseConfigured } from '@/lib/supabase/client';

const GAMES = [
  {
    id: 'maze',
    name: 'The Maze',
    emoji: '🎮',
    description: 'Guide a character through a winding path',
    detects: 'Dysgraphia (Motor & Spatial)',
    color: 'from-green-500 to-emerald-600',
    href: '/games/maze',
  },
  {
    id: 'phonic',
    name: 'Phonic Finder',
    emoji: '🔊',
    description: 'Listen and find matching pictures',
    detects: 'Dyslexia (Phonological)',
    color: 'from-purple-500 to-pink-600',
    href: '/games/phonic-finder',
  },
  {
    id: 'cricket',
    name: 'Pizza Party',
    emoji: '🍕',
    description: 'Calculate customer orders quickly!',
    detects: 'Dyscalculia (Number Sense)',
    color: 'from-yellow-500 to-orange-600',
    href: '/games/cricket-forge',
  },
  {
    id: 'sync',
    name: 'Color Memory',
    emoji: '🎮',
    description: 'Watch and repeat the color sequence',
    detects: 'Dyspraxia (Motor Coordination)',
    color: 'from-pink-500 to-rose-600',
    href: '/games/sync-master',
  },
  {
    id: 'star',
    name: 'Star Mapper',
    emoji: '⭐',
    description: 'Memorize star patterns and recreate them',
    detects: 'NVLD (Visual-Spatial Memory)',
    color: 'from-amber-500 to-yellow-600',
    href: '/games/star-mapper',
  },
  {
    id: 'dot',
    name: 'Dot Connect',
    emoji: '🔗',
    description: 'Recreate the dot connection pattern',
    detects: 'Visual-Spatial Processing',
    color: 'from-teal-500 to-cyan-600',
    href: '/games/dot-connect',
  },
];

export default function Home() {
  const { childProfile, allSessions } = useSessionStore();
  const router = useRouter();

  // Redirect to profile page if no profile exists
  useEffect(() => {
    if (!childProfile) {
      router.push('/profile');
    }
  }, [childProfile, router]);

  const completedGames = new Set(allSessions.map(s => s.gameType));
  const allGamesComplete = completedGames.size === 6;

  // Show loading while checking profile
  if (!childProfile) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Supabase Status Indicator */}
      <div className="fixed top-4 right-4 z-50">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
          isSupabaseConfigured() 
            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            isSupabaseConfigured() ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
          }`}></span>
          {isSupabaseConfigured() ? '☁️ Cloud Synced' : '💾 Local Only'}
        </div>
      </div>

      {/* Header */}
      <header className="py-8 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
          🧠 NeuroGen Suite
        </h1>
        <p className="mt-2 text-gray-400 max-w-xl mx-auto">
          Play fun games while we secretly learn about how your brain works!
        </p>
        {childProfile && (
          <p className="mt-2 text-lg text-white">
            Welcome back, <span className="text-yellow-400 font-bold">{childProfile.name}</span>! 🌟
          </p>
        )}
      </header>

      {/* Progress Banner */}
      <div className="max-w-4xl mx-auto px-4 mb-8">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">Your Progress</span>
            <span className="text-white font-bold">{completedGames.size}/5 Games</span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
              style={{ width: `${(completedGames.size / 5) * 100}%` }}
            />
          </div>
          {allGamesComplete && (
            <Link 
              href="/report"
              className="block mt-4 text-center py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-bold rounded-lg hover:opacity-90 transition"
            >
              📊 View Your Report!
            </Link>
          )}
        </div>
      </div>      {/* Game Grid */}
      <div className="max-w-4xl mx-auto px-4 pb-12">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          🎮 Choose a Game
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {GAMES.map((game) => {
            const isCompleted = completedGames.has(game.id as 'maze' | 'phonic' | 'cricket' | 'sync' | 'star');
            
            return (
              <Link
                key={game.id}
                href={game.href}
                className={`
                  relative p-6 rounded-2xl bg-gradient-to-br ${game.color}
                  transform hover:scale-105 transition-all duration-200
                  shadow-lg hover:shadow-2xl
                  ${isCompleted ? 'ring-4 ring-green-400' : ''}
                `}
              >
                {isCompleted && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-lg">
                    ✓
                  </div>
                )}
                
                <div className="text-4xl mb-3">{game.emoji}</div>
                <h3 className="text-xl font-bold text-white mb-1">{game.name}</h3>
                <p className="text-white/80 text-sm mb-3">{game.description}</p>
                <div className="text-xs text-white/60 bg-black/20 rounded-full px-3 py-1 inline-block">
                  {game.detects}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quick Report Link */}
        {completedGames.size > 0 && !allGamesComplete && (
          <div className="mt-8 text-center">
            <Link
              href="/report"
              className="text-gray-400 hover:text-white transition"
            >
              📊 View partial report ({completedGames.size} games completed)
            </Link>
          </div>
        )}
      </div>

      {/* Session Info Bar */}
      <div className="max-w-4xl mx-auto px-4 mb-8">
        <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-6">
              <div className="text-gray-400">
                <span className="text-white font-medium">{childProfile.name}</span> • Age {childProfile.age}
              </div>
              {childProfile.interests.length > 0 && (
                <div className="text-gray-500">
                  Interests: {childProfile.interests.slice(0, 3).join(', ')}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 text-gray-500">
              <span>Session ID: {childProfile.id.slice(0, 8)}...</span>
              {isSupabaseConfigured() && (
                <span className="text-green-400">● Live Sync</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-500 text-sm">
        <p>Built with 💜 for AI Samasya 2026</p>
        <p className="mt-1">NeuroGen Suite - Stealth Assessment for Learning Disabilities</p>
        <Link 
          href="/admin" 
          className="inline-block mt-4 text-xs text-gray-600 hover:text-gray-400 transition"
        >
          🔒 Admin Dashboard
        </Link>
      </footer>
    </main>
  );
}
