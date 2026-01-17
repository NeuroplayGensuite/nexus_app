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
    <main className="min-h-screen animated-gradient relative overflow-hidden">
      {/* Animated Particles Background */}
      <div className="particles-bg">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              width: `${Math.random() * 100 + 50}px`,
              height: `${Math.random() * 100 + 50}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 20}s`,
              animationDuration: `${Math.random() * 10 + 15}s`,
            }}
          />
        ))}
      </div>

      {/* Supabase Status Indicator with Glow */}
      <div className="fixed top-4 right-4 z-50">
        <div className={`glass-card flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold ${isSupabaseConfigured()
            ? 'text-green-400 neon-glow-blue'
            : 'text-yellow-400'
          }`}>
          <span className={`w-2.5 h-2.5 rounded-full ${isSupabaseConfigured() ? 'bg-green-400 animate-pulse pulse-animation' : 'bg-yellow-400'
            }`}></span>
          {isSupabaseConfigured() ? '☁️ Cloud Synced' : '💾 Local Only'}
        </div>
      </div>

      {/* Enhanced Header with Floating Animation */}
      <header className="relative z-10 py-12 px-4 text-center animate-float">
        <div className="inline-block mb-4 text-7xl animate-bounce">
          🧠
        </div>
        <h1 className="text-5xl md:text-7xl font-black mb-4 relative">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 drop-shadow-2xl">
            NeuroGen Suite
          </span>
        </h1>
        <p className="text-xl md:text-2xl text-purple-200 font-semibold max-w-2xl mx-auto mb-6">
          🎮 Play • 🧪 Discover • 🚀 Grow
        </p>
        {childProfile && (
          <div className="glass-card-strong inline-block px-8 py-4 rounded-2xl neon-glow-purple">
            <p className="text-2xl font-black">
              Welcome back, <span className="text-yellow-400 animate-pulse">{childProfile.name}</span>! ✨
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-3 justify-center mt-6">
          <span className="glass-card px-4 py-2 rounded-full text-sm font-bold text-cyan-300 neon-glow-blue">
            ⚡ 100% Private
          </span>
          <span className="glass-card px-4 py-2 rounded-full text-sm font-bold text-purple-300 neon-glow-purple">
            🎯 Scientifically Validated
          </span>
          <span className="glass-card px-4 py-2 rounded-full text-sm font-bold text-pink-300 neon-glow-pink">
            🆓 Completely Free
          </span>
        </div>
      </header>

      {/* Enhanced Progress Banner */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 mb-12">
        <div className="glass-card-strong rounded-3xl p-8 border-2 border-purple-500/30 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎯</span>
              <span className="text-purple-300 font-bold text-lg">Mission Progress</span>
            </div>
            <span className="glass-card px-4 py-2 rounded-xl text-cyan-300 font-black text-lg neon-glow-blue">
              {completedGames.size}/6 Games
            </span>
          </div>
          <div className="relative">
            <div className="h-5 bg-slate-900/50 rounded-full overflow-hidden border-2 border-purple-500/30">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 transition-all duration-1000 ease-out shimmer relative"
                style={{ width: `${(completedGames.size / 6) * 100}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
              </div>
            </div>
            <div className="flex justify-between mt-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className={`w-3 h-3 rounded-full transition-all duration-500 ${i < completedGames.size
                    ? 'bg-green-400 shadow-lg shadow-green-400/50 scale-110'
                    : 'bg-slate-700 scale-75'
                  }`}></div>
              ))}
            </div>
          </div>
          {allGamesComplete && (
            <Link
              href="/report"
              className="block mt-6 text-center py-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-black font-black text-lg rounded-2xl hover:scale-105 transition-all duration-300 shadow-2xl shadow-yellow-500/50 animate-pulse"
            >
              🎉 🏆 View Your Complete Report 🏆 🎉
            </Link>
          )}
        </div>
      </div>      {/* Enhanced Game Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 pb-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-3">
            🎮 Choose Your Adventure
          </h2>
          <p className="text-purple-300 text-xl font-bold">Each game unlocks unique insights! ✨</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {GAMES.map((game) => {
            const isCompleted = completedGames.has(game.id as 'maze' | 'phonic' | 'cricket' | 'sync' | 'star' | 'dot');

            return (
              <Link
                key={game.id}
                href={game.href}
                className={`game-card glass-card-strong relative p-8 rounded-3xl group overflow-hidden ${isCompleted
                    ? 'border-4 border-green-400 shadow-2xl shadow-green-400/30'
                    : 'border-2 border-purple-500/20 hover:border-purple-400/60'
                  }`}
              >
                {/* Animated Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-10 group-hover:opacity-20 transition-opacity duration-500`}></div>

                {/* Completion Badge */}
                {isCompleted && (
                  <div className="absolute -top-3 -right-3 z-10 bg-gradient-to-br from-green-400 to-emerald-500 text-white px-4 py-2 rounded-2xl text-sm font-black flex items-center gap-2 shadow-xl shadow-green-400/50 animate-bounce">
                    <span className="text-lg">✓</span>
                    <span>DONE</span>
                  </div>
                )}

                {/* Animated Icon */}
                <div className="relative z-10 text-7xl mb-4 transform group-hover:scale-125 group-hover:rotate-12 transition-all duration-500">
                  {game.emoji}
                </div>

                {/* Game Title */}
                <h3 className="relative z-10 text-2xl font-black text-white mb-3 group-hover:text-cyan-300 transition-colors">
                  {game.name}
                </h3>

                {/* Description */}
                <p className="relative z-10 text-purple-200 text-base mb-4 font-semibold">
                  {game.description}
                </p>

                {/* Detection Badge */}
                <div className="relative z-10 glass-card text-sm text-cyan-300 rounded-xl px-4 py-3 font-bold border border-cyan-400/30 group-hover:border-cyan-400/60 transition-all">
                  <span className="text-base mr-2">🎯</span>
                  {game.detects}
                </div>

                {/* Play Button Indicator */}
                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110">
                  <div className="glass-card w-14 h-14 rounded-full flex items-center justify-center text-3xl neon-glow-blue">
                    ▶️
                  </div>
                </div>

                {/* Hover Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-purple-600/10 to-pink-400/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              </Link>
            );
          })}
        </div>

        {/* Quick Report Link */}
        {completedGames.size > 0 && !allGamesComplete && (
          <div className="mt-12 text-center">
            <Link
              href="/report"
              className="glass-card inline-block px-6 py-3 rounded-xl text-purple-300 hover:text-cyan-300 font-bold border border-purple-500/30 hover:border-cyan-400/60 transition-all hover:scale-105"
            >
              📊 View Partial Report ({completedGames.size} games completed)
            </Link>
          </div>
        )}
      </div>

      {/* Enhanced Session Info Bar */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 mb-8">
        <div className="glass-card rounded-2xl p-6 border border-purple-500/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                  👤
                </div>
                <div>
                  <p className="text-white font-black text-lg">{childProfile.name}</p>
                  <p className="text-purple-300 text-sm font-semibold">Age {childProfile.age} • {allSessions.length} Sessions</p>
                </div>
              </div>
              {childProfile.interests.length > 0 && (
                <div className="hidden md:flex gap-2">
                  {childProfile.interests.slice(0, 4).map((interest, i) => (
                    <span key={i} className="glass-card px-3 py-1 rounded-full text-xs font-bold text-cyan-300">
                      {interest}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              {isSupabaseConfigured() && (
                <span className="glass-card px-4 py-2 rounded-full text-sm font-bold text-green-400 neon-glow-blue flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Live Sync
                </span>
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
