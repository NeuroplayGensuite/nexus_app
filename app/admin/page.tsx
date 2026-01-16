'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  getAllChildren, 
  getSessionsByChild, 
  getReportsByChild,
  isSupabaseConfigured,
  DbReport
} from '@/lib/supabase/client';
import { ChildProfile, GameSession } from '@/types';

interface ChildWithStats extends ChildProfile {
  sessionsCount: number;
  reportsCount: number;
  completedGames: string[];
  latestReport?: DbReport;
}

export default function AdminPage() {
  const [children, setChildren] = useState<ChildWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<ChildWithStats | null>(null);
  const [childSessions, setChildSessions] = useState<GameSession[]>([]);

  useEffect(() => {
    loadChildren();
  }, []);

  const loadChildren = async () => {
    if (!isSupabaseConfigured()) {
      setError('Supabase not configured. Please add credentials to .env.local');
      setLoading(false);
      return;
    }

    try {
      const allChildren = await getAllChildren();
      
      // Load stats for each child
      const childrenWithStats: ChildWithStats[] = await Promise.all(
        allChildren.map(async (child) => {
          const sessions = await getSessionsByChild(child.id);
          const reports = await getReportsByChild(child.id);
          const completedGames = [...new Set(sessions.map(s => s.gameType))];
          
          return {
            ...child,
            sessionsCount: sessions.length,
            reportsCount: reports.length,
            completedGames,
            latestReport: reports[0],
          };
        })
      );
      
      setChildren(childrenWithStats);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const viewChildDetails = async (child: ChildWithStats) => {
    setSelectedChild(child);
    const sessions = await getSessionsByChild(child.id);
    setChildSessions(sessions);
  };

  const getGameEmoji = (gameType: string) => {
    const emojis: Record<string, string> = {
      maze: '🎮',
      phonic: '🔊',
      cricket: '🏏',
      sync: '🎵',
      star: '⭐',
    };
    return emojis[gameType] || '🎯';
  };

  if (!isSupabaseConfigured()) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-8 text-center">
            <h1 className="text-2xl font-bold text-red-400 mb-4">⚠️ Supabase Not Configured</h1>
            <p className="text-gray-400 mb-4">
              Add your Supabase credentials to <code className="bg-slate-700 px-2 py-1 rounded">.env.local</code>
            </p>
            <Link href="/" className="text-blue-400 hover:underline">
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">🔐 Admin Dashboard</h1>
              <p className="text-gray-400 mt-1">View all assessments and reports</p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
            >
              ← Back to Home
            </Link>
          </div>
        </header>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <div className="text-3xl font-bold text-white">{children.length}</div>
            <div className="text-gray-400 text-sm">Total Children</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <div className="text-3xl font-bold text-green-400">
              {children.reduce((sum, c) => sum + c.sessionsCount, 0)}
            </div>
            <div className="text-gray-400 text-sm">Total Sessions</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <div className="text-3xl font-bold text-purple-400">
              {children.reduce((sum, c) => sum + c.reportsCount, 0)}
            </div>
            <div className="text-gray-400 text-sm">Reports Generated</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <div className="text-3xl font-bold text-yellow-400">
              {children.filter(c => c.completedGames.length === 5).length}
            </div>
            <div className="text-gray-400 text-sm">Completed All Games</div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Loading data from Supabase...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        ) : children.length === 0 ? (
          <div className="bg-slate-800/50 rounded-xl p-12 text-center border border-slate-700">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-xl font-bold text-white mb-2">No Assessments Yet</h2>
            <p className="text-gray-400 mb-4">
              Start a new assessment to see data here
            </p>
            <Link
              href="/profile"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition"
            >
              🚀 Start New Assessment
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Children List */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-700">
                <h2 className="text-lg font-bold text-white">👧 All Children</h2>
              </div>
              <div className="divide-y divide-slate-700 max-h-[600px] overflow-y-auto">
                {children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => viewChildDetails(child)}
                    className={`w-full p-4 text-left hover:bg-slate-700/50 transition ${
                      selectedChild?.id === child.id ? 'bg-slate-700/50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">{child.name}</div>
                        <div className="text-sm text-gray-400">
                          Age {child.age} • {child.grade || 'No grade'} • 
                          {child.interests.slice(0, 2).join(', ') || 'No interests'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex gap-1">
                          {['maze', 'phonic', 'cricket', 'sync', 'star'].map((game) => (
                            <span
                              key={game}
                              className={`text-xs ${
                                child.completedGames.includes(game)
                                  ? 'opacity-100'
                                  : 'opacity-30'
                              }`}
                            >
                              {getGameEmoji(game)}
                            </span>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {child.completedGames.length}/5 games
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Child Details */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-700">
                <h2 className="text-lg font-bold text-white">📋 Details</h2>
              </div>
              {selectedChild ? (
                <div className="p-4 space-y-4">
                  {/* Profile */}
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <h3 className="font-bold text-white text-lg mb-2">
                      {selectedChild.name}
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-gray-400">Age: <span className="text-white">{selectedChild.age}</span></div>
                      <div className="text-gray-400">Grade: <span className="text-white">{selectedChild.grade || 'N/A'}</span></div>
                      <div className="text-gray-400">Language: <span className="text-white">{selectedChild.preferredLanguage}</span></div>
                      <div className="text-gray-400">Sessions: <span className="text-white">{selectedChild.sessionsCount}</span></div>
                    </div>
                    {selectedChild.interests.length > 0 && (
                      <div className="mt-2">
                        <span className="text-gray-400 text-sm">Interests: </span>
                        <span className="text-white text-sm">{selectedChild.interests.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  {/* Sessions */}
                  <div>
                    <h4 className="font-medium text-white mb-2">Game Sessions</h4>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {childSessions.length === 0 ? (
                        <p className="text-gray-500 text-sm">No sessions recorded</p>
                      ) : (
                        childSessions.map((session) => (
                          <div
                            key={session.id}
                            className="bg-slate-700/30 rounded-lg p-3 text-sm"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-white">
                                {getGameEmoji(session.gameType)} {session.gameType.toUpperCase()}
                              </span>
                              <span className="text-gray-400">
                                {new Date(session.startTime).toLocaleDateString()}
                              </span>
                            </div>
                            {Object.keys(session.metrics).length > 0 && (
                              <div className="mt-1 text-xs text-gray-500">
                                Metrics: {Object.keys(session.metrics).join(', ')}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Latest Report */}
                  {selectedChild.latestReport && (
                    <div>
                      <h4 className="font-medium text-white mb-2">Latest Report</h4>
                      <div className="bg-slate-700/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            selectedChild.latestReport.source === 'gemini'
                              ? 'bg-purple-500/30 text-purple-300'
                              : 'bg-gray-500/30 text-gray-300'
                          }`}>
                            {selectedChild.latestReport.source === 'gemini' ? '✨ AI Generated' : '📊 Fallback'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(selectedChild.latestReport.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <pre className="text-xs text-gray-400 overflow-x-auto max-h-[150px] overflow-y-auto">
                          {JSON.stringify(selectedChild.latestReport.report_data, null, 2).slice(0, 500)}...
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  Select a child to view details
                </div>
              )}
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <button
            onClick={loadChildren}
            className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
          >
            🔄 Refresh Data
          </button>
        </div>
      </div>
    </main>
  );
}
