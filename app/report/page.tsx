'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSessionStore } from '@/stores/session-store';
import { saveReport, isSupabaseConfigured } from '@/lib/supabase/client';
import { BiometricMetrics, DiagnosticReport } from '@/types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Radar, Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ReportData {
  executiveSummary: string;
  findings: Array<{
    condition: string;
    confidence: string;
    evidence: string[];
    dailyLifeImpact: string;
  }>;
  metricsExplained: {
    mse?: string;
    jerk?: string;
    gazeEntropy?: string;
    subitizing?: string;
    spatialDecay?: string;
  };
  actionPlan: {
    week1: string[];
    week2: string[];
    week3: string[];
    week4: string[];
  };
  referrals: string[];
  positiveNotes?: string[];
}

const CONDITION_COLORS: Record<string, string> = {
  'dysgraphia-motor': 'bg-orange-500',
  'dysgraphia-spatial': 'bg-amber-500',
  'dyslexia': 'bg-purple-500',
  'dyscalculia': 'bg-blue-500',
  'dyspraxia': 'bg-pink-500',
  'nvld': 'bg-indigo-500',
};

const CONDITION_LABELS: Record<string, string> = {
  'dysgraphia-motor': 'Motor Dysgraphia',
  'dysgraphia-spatial': 'Spatial Dysgraphia',
  'dyslexia': 'Dyslexia',
  'dyscalculia': 'Dyscalculia',
  'dyspraxia': 'Dyspraxia',
  'nvld': 'NVLD',
};

export default function ReportPage() {
  const { childProfile, getAggregatedMetrics, allSessions } = useSessionStore();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeWeek, setActiveWeek] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState('');

  // Email state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Only compute these on client after mount to prevent hydration mismatch
  const metrics = mounted ? getAggregatedMetrics() : {};
  const completedGames = mounted ? new Set(allSessions.map(s => s.gameType)) : new Set<string>();

  // Handle mounting and date formatting on client only
  useEffect(() => {
    setMounted(true);
    setCurrentDate(new Date().toLocaleDateString('en-IN', { dateStyle: 'long' }));
  }, []);

  useEffect(() => {
    if (mounted && Object.keys(metrics).length > 0 && childProfile) {
      generateReport();
    }
  }, [mounted]);

  // Send report via email using Nodemailer API route
  const sendReportEmail = async () => {
    if (!emailAddress || !report) return;

    setEmailSending(true);
    setEmailStatus(null);

    try {
      const response = await fetch('/api/send-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailAddress,
          childName: childProfile?.name || 'Child',
          childAge: childProfile?.age || 8,
          report: report,
        }),
      });

      const result = await response.json();
      console.log('Email result:', result);

      if (result.success) {
        const message = result.demo
          ? `Demo mode: ${result.message}`
          : `Report sent to ${emailAddress}! Check your inbox.`;
        setEmailStatus({ success: true, message });
        setTimeout(() => {
          setShowEmailModal(false);
          setEmailStatus(null);
          setEmailAddress('');
        }, 3000);
      } else {
        setEmailStatus({ success: false, message: result.error || 'Failed to send email' });
      }
    } catch (err: unknown) {
      console.error('Email error:', err);
      setEmailStatus({ success: false, message: 'Failed to send. Check your internet connection.' });
    } finally {
      setEmailSending(false);
    }
  };

  const [reportSource, setReportSource] = useState<string>('');
  
  const generateReport = async () => {
    setLoading(true);
    setError(null);
    setReportSource('');

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics,
          childAge: childProfile?.age || 8,
          language: childProfile?.preferredLanguage || 'en',
        }),
      });

      const data = await response.json();
      
      // Always get a report (API returns fallback if AI fails)
      const reportData = data.report as ReportData;
      setReport(reportData);
      setReportSource(data.source || 'local-ml');
      
      // Log the source
      console.log('📊 Report generated via:', data.source);

      // Save report to Supabase (non-blocking)
      if (isSupabaseConfigured() && childProfile) {
        const sessionIds = allSessions.map(s => s.id);
        saveReport(
          childProfile.id,
          sessionIds,
          reportData as unknown as DiagnosticReport,
          data.source || 'local-ml'
        ).then(saved => {
          if (saved) console.log('✅ Report saved to Supabase');
        }).catch(() => {
          // Silently ignore - report still works locally
        });
      }
    } catch (err) {
      console.warn('API call failed, using local report:', err);
      // Use local fallback if API completely fails
      const fallbackReport = generateLocalReport(metrics);
      setReport(fallbackReport);
      setReportSource('local-ml');

      // Still save fallback report to Supabase
      if (isSupabaseConfigured() && childProfile) {
        const sessionIds = allSessions.map(s => s.id);
        await saveReport(
          childProfile.id,
          sessionIds,
          fallbackReport as unknown as DiagnosticReport,
          'local-ml'
        ).catch(console.error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Local fallback report generation
  const generateLocalReport = (m: BiometricMetrics): ReportData => {
    const findings: ReportData['findings'] = [];

    if ((m.mse ?? 0) > 30) {
      findings.push({
        condition: (m.wallHuggingRatio ?? 0) > 0.5 ? 'dysgraphia-motor' : 'dysgraphia-spatial',
        confidence: (m.mse ?? 0) > 50 ? 'high' : 'medium',
        evidence: [`Path deviation score: ${m.mse?.toFixed(1)}`],
        dailyLifeImpact: 'May have difficulty with handwriting and drawing tasks',
      });
    }

    if ((m.phonicDelay ?? 0) > 1500 || (m.phonemicSlips ?? 0) > 2) {
      findings.push({
        condition: 'dyslexia',
        confidence: (m.phonemicSlips ?? 0) > 3 ? 'high' : 'medium',
        evidence: [`Sound-to-image delay: ${m.phonicDelay}ms`],
        dailyLifeImpact: 'May struggle with reading and spelling tasks',
      });
    }

    if (m.subitizingFailed || (m.subitizingThreshold ?? 5) < 3) {
      findings.push({
        condition: 'dyscalculia',
        confidence: m.subitizingFailed ? 'high' : 'medium',
        evidence: [`Instant number recognition: ${m.subitizingThreshold ?? 0} items`],
        dailyLifeImpact: 'May have difficulty with counting and basic math',
      });
    }

    return {
      executiveSummary: findings.length > 0
        ? `Based on ${completedGames.size} games played, we identified ${findings.length} area(s) that may benefit from additional support. These are preliminary observations and professional consultation is recommended.`
        : `Great news! ${childProfile?.name || 'Your child'} performed within typical ranges across all assessed areas. Keep encouraging their learning journey!`,
      findings,
      metricsExplained: {
        mse: 'This measures how closely the path was followed in the maze game - lower is better.',
        jerk: 'This analyzes hand movement smoothness - smoother movements indicate better motor control.',
        subitizing: 'This tests instant number recognition without counting.',
        spatialDecay: 'This measures how well visual patterns are remembered over time.',
      },
      actionPlan: {
        week1: ['Practice tracing shapes for 10 minutes daily', 'Play counting games with toys', 'Read together for 15 minutes'],
        week2: ['Do simple mazes and connect-the-dots', 'Practice rhythm with clapping games', 'Sort objects by size and color'],
        week3: ['Write in a daily journal with drawings', 'Play memory card games', 'Practice skip counting'],
        week4: ['Review progress and celebrate wins', 'Continue activities showing improvement', 'Consider professional consultation if needed'],
      },
      referrals: findings.length > 0
        ? ['Educational Psychologist', 'Occupational Therapist', 'Learning Support Specialist']
        : ['Continue regular developmental check-ups'],
      positiveNotes: ['Completed all games with enthusiasm', 'Showed good focus and attention'],
    };
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 py-8 print:bg-white print:py-0">
      <div className="max-w-4xl mx-auto px-4 print:max-w-none print:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 print:hidden">
          <Link
            href="/"
            className="inline-flex items-center text-gray-400 hover:text-white transition"
          >
            ← Back to Games
          </Link>
          <div className="flex gap-2">
            <button
              onClick={() => setShowEmailModal(true)}
              disabled={!report}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition disabled:opacity-50"
            >
              📧 Email Report
            </button>
            <button
              onClick={handlePrint}
              disabled={!report}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition disabled:opacity-50"
            >
              🖨️ Print / PDF
            </button>
            <button
              onClick={generateReport}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition disabled:opacity-50"
            >
              {loading ? '🔄 Generating...' : '🔄 Regenerate Report'}
            </button>
          </div>
        </div>

        {/* Print Header - Only visible when printing */}
        <div className="hidden print:block print:mb-8 print:border-b print:border-gray-300 print:pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">NeuroGen Suite - Diagnostic Report</h1>
              <p className="text-gray-600">AI Samasya 2026 Hackathon Project</p>
            </div>
            <div className="text-right">
              <p className="text-gray-900 font-bold">{childProfile?.name || 'Player'}</p>
              <p className="text-gray-600">Age: {childProfile?.age || '?'} | Grade: {childProfile?.grade || 'N/A'}</p>
              <p className="text-gray-500 text-sm">{currentDate}</p>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8 print:hidden">
          <h1 className="text-3xl font-bold text-white mb-2">📊 Diagnostic Report</h1>
          <p className="text-gray-400">
            For {childProfile?.name || 'Player'}, Age {childProfile?.age || '?'}
          </p>
          <p className="text-gray-500 text-sm mt-1">
            Based on {completedGames.size}/5 games completed
          </p>
          {reportSource && (
            <div className={`inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full text-sm ${
              reportSource.includes('local') || reportSource.includes('fallback')
                ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
                : 'bg-green-900/50 text-green-300 border border-green-700'
            }`}>
              {reportSource.includes('local') || reportSource.includes('fallback') ? (
                <>
                  <span>🧠</span> Local ML Analysis
                </>
              ) : (
                <>
                  <span>✨</span> AI Enhanced ({reportSource})
                </>
              )}
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 animate-bounce">🧠</div>
            <p className="text-gray-400">Analyzing your results with AI...</p>
          </div>
        )}

        {/* Error State */}
        {error && !report && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Report Content */}
        {report && !loading && (
          <div className="space-y-6">
            {/* Executive Summary */}
            <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 rounded-2xl p-6 border border-indigo-700/50 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span>📝</span> Overall Summary
                </h2>
                <p className="text-sm text-indigo-100/80 bg-indigo-900/50 px-3 py-1 rounded-full border border-indigo-700/60">Parent-friendly overview</p>
              </div>
              <p className="text-gray-200 text-lg leading-relaxed font-medium">
                {report.executiveSummary}
              </p>
              {report.findings?.[0]?.dailyLifeImpact && (
                <p className="mt-3 text-sm text-indigo-100 bg-indigo-900/40 border border-indigo-700/40 rounded-lg px-3 py-2">
                  In simple words: {report.findings[0].dailyLifeImpact}
                </p>
              )}
            </div>

            {/* Findings - parent friendly */}
            {/* Visual Charts */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <span>📊</span> Performance Overview
              </h2>

              {/* Quick stats */}
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/30 rounded-xl p-4 border border-green-700/40">
                  <p className="text-green-300 text-xs font-bold uppercase">Games Completed</p>
                  <p className="text-3xl font-bold text-green-400 mt-1">{completedGames.size}/5</p>
                  <p className="text-green-200 text-xs mt-1">✨ More data improves accuracy</p>
                </div>
                <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/30 rounded-xl p-4 border border-blue-700/40">
                  <p className="text-blue-300 text-xs font-bold uppercase">Overall Performance</p>
                  <p className="text-3xl font-bold text-blue-400 mt-1">{Math.round((completedGames.size / 5) * 100)}%</p>
                  <p className="text-blue-200 text-xs mt-1">📊 Assessment completeness</p>
                </div>
                <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/30 rounded-xl p-4 border border-purple-700/40">
                  <p className="text-purple-300 text-xs font-bold uppercase">Areas Checked</p>
                  <p className="text-3xl font-bold text-purple-400 mt-1">{report.findings.length > 0 ? report.findings.length : 0}</p>
                  <p className="text-purple-200 text-xs mt-1">Focus areas identified</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {/* Radar Chart - Skills Profile */}
                <div className="md:col-span-2 bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
                  <h3 className="text-sm font-bold text-gray-300 mb-3 text-center">Skill Strengths & Areas for Growth</h3>
                  <p className="text-xs text-gray-400 text-center mb-3">Outer ring = stronger; inner ring = needs practice</p>
                  <div className="h-72">
                    <Radar
                      data={{
                        labels: ['Motor Control', 'Spatial Skills', 'Reading & Phonics', 'Math & Numbers', 'Rhythm & Timing'],
                        datasets: [{
                          label: 'Your Child',
                          data: [
                            Math.max(0, 100 - (metrics.mse ?? 0)),
                            Math.max(0, 100 - (metrics.wallHuggingRatio ?? 0) * 100),
                            Math.max(0, 100 - (metrics.phonemicSlips ?? 0) * 20),
                            (metrics.subitizingThreshold ?? 3) * 20,
                            (metrics.rhythmAccuracy ?? 0.5) * 100,
                          ],
                          backgroundColor: 'rgba(168, 85, 247, 0.2)',
                          borderColor: 'rgb(168, 85, 247)',
                          pointBackgroundColor: 'rgb(168, 85, 247)',
                          pointBorderColor: '#fff',
                          pointRadius: 5,
                          pointHoverRadius: 7,
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          r: {
                            beginAtZero: true,
                            max: 100,
                            ticks: { color: '#9CA3AF', stepSize: 25, font: { size: 11 } },
                            grid: { color: 'rgba(156, 163, 175, 0.2)' },
                            angleLines: { color: 'rgba(156, 163, 175, 0.2)' },
                            pointLabels: { color: '#D1D5DB', font: { size: 12, weight: 'bold' } },
                          },
                        },
                        plugins: { legend: { display: false } },
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-2">Higher scores = stronger in that area</p>
                </div>

                {/* Doughnut Chart - Game Completion */}
                <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
                  <h3 className="text-sm font-bold text-gray-300 mb-3 text-center">Assessment Progress</h3>
                  <div className="h-72 flex items-center justify-center">
                    <div className="text-center">
                      <div className="relative w-40 h-40 mx-auto mb-4">
                        <Doughnut
                          data={{
                            labels: ['Completed', 'Remaining'],
                            datasets: [{
                              data: [completedGames.size, Math.max(0, 5 - completedGames.size)],
                              backgroundColor: ['#22c55e', '#334155'],
                              borderWidth: 0,
                            }],
                          }}
                          options={{
                            cutout: '70%',
                            plugins: { legend: { display: false } },
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-white">{Math.round((completedGames.size / 5) * 100)}%</p>
                            <p className="text-xs text-gray-400">done</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm">{completedGames.size}/5 games finished</p>
                    </div>
                  </div>
                </div>

                {/* Bar Chart - Focused scores */}
                <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
                  <h3 className="text-sm font-bold text-gray-300 mb-3 text-center">Areas to watch</h3>
                  <div className="h-72">
                    <Bar
                      data={{
                        labels: ['Attention', 'Motor Control', 'Reading', 'Math'],
                        datasets: [{
                          label: 'Score (higher is better)',
                          data: [
                            Math.max(0, 100 - (metrics.gazeEntropy ?? 0) * 10),
                            Math.max(0, 100 - (metrics.mse ?? 0)),
                            Math.max(0, 100 - (metrics.phonemicSlips ?? 0) * 20),
                            (metrics.subitizingThreshold ?? 3) * 20,
                          ],
                          backgroundColor: ['#38bdf8', '#34d399', '#c084fc', '#fbbf24'],
                          borderRadius: 8,
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: { color: '#9CA3AF', stepSize: 20 },
                            grid: { color: 'rgba(148, 163, 184, 0.2)' },
                          },
                          x: {
                            ticks: { color: '#E5E7EB' },
                            grid: { display: false },
                          },
                        },
                        plugins: { legend: { display: false } },
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-2">Lower bars suggest where to focus practice first</p>
                </div>
              </div>
            </div>

            {/* Bar Chart - Detailed Metrics */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span>📈</span> Detailed Metrics
              </h2>
              <div className="h-64">
                <Bar
                  data={{
                    labels: Object.keys(metrics).slice(0, 8).map(k =>
                      k.replace(/([A-Z])/g, ' $1').trim().substring(0, 12)
                    ),
                    datasets: [{
                      label: 'Score',
                      data: Object.values(metrics).slice(0, 8).map(v =>
                        typeof v === 'number' ? v : 0
                      ),
                      backgroundColor: [
                        'rgba(99, 102, 241, 0.7)',
                        'rgba(139, 92, 246, 0.7)',
                        'rgba(168, 85, 247, 0.7)',
                        'rgba(217, 70, 239, 0.7)',
                        'rgba(236, 72, 153, 0.7)',
                        'rgba(244, 114, 182, 0.7)',
                        'rgba(251, 146, 60, 0.7)',
                        'rgba(250, 204, 21, 0.7)',
                      ],
                      borderRadius: 8,
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: {
                        ticks: { color: '#9CA3AF', font: { size: 10 } },
                        grid: { display: false },
                      },
                      y: {
                        ticks: { color: '#9CA3AF' },
                        grid: { color: 'rgba(156, 163, 175, 0.2)' },
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* Raw Metrics */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span>📈</span> Game Scores
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(metrics).map(([key, value]) => (
                  <div key={key} className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-xs text-gray-400 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="text-lg font-bold text-white">
                      {typeof value === 'number' ? value.toFixed(1) : String(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Plan */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span>📅</span> 4-Week Action Plan
              </h2>

              {/* Week Tabs */}
              <div className="flex gap-2 mb-4">
                {[1, 2, 3, 4].map((week) => (
                  <button
                    key={week}
                    onClick={() => setActiveWeek(week)}
                    className={`px-4 py-2 rounded-lg font-bold transition ${activeWeek === week
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                      }`}
                  >
                    Week {week}
                  </button>
                ))}
              </div>

              {/* Activities */}
              <ul className="space-y-2">
                {report.actionPlan[`week${activeWeek}` as keyof typeof report.actionPlan]?.map((activity, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-gray-300">
                    <span className="text-green-400 mt-0.5">✓</span>
                    {activity}
                  </li>
                ))}
              </ul>
            </div>

            {/* Referrals */}
            {report.referrals.length > 0 && (
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span>👨‍⚕️</span> Recommended Consultations
                </h2>
                <ul className="space-y-2">
                  {report.referrals.map((referral, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-gray-300">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      {referral}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Positive Notes */}
            {report.positiveNotes && report.positiveNotes.length > 0 && (
              <div className="bg-green-900/20 rounded-2xl p-6 border border-green-800">
                <h2 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
                  <span>💪</span> Strengths Observed
                </h2>
                <ul className="space-y-2">
                  {report.positiveNotes.map((note, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-gray-300">
                      <span className="text-green-400">⭐</span>
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disclaimer */}
            <div className="bg-yellow-900/20 rounded-xl p-4 border border-yellow-800/50">
              <p className="text-yellow-200/80 text-sm text-center">
                ⚠️ This is a screening tool, not a clinical diagnosis. Please consult with
                qualified healthcare professionals for comprehensive evaluation.
              </p>
            </div>
          </div>
        )}

        {/* No Data */}
        {!report && !loading && Object.keys(metrics).length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎮</div>
            <h3 className="text-xl font-bold text-white mb-2">No Games Played Yet</h3>
            <p className="text-gray-400 mb-4">
              Complete at least one game to see your report!
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition"
            >
              Start Playing
            </Link>
          </div>
        )}
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">📧 Email Report</h3>
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setEmailStatus(null);
                  setEmailAddress('');
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {emailStatus ? (
              <div className={`p-4 rounded-lg mb-4 ${emailStatus.success ? 'bg-green-900/50 border border-green-700' : 'bg-red-900/50 border border-red-700'
                }`}>
                <p className={emailStatus.success ? 'text-green-400' : 'text-red-400'}>
                  {emailStatus.success ? '✅' : '❌'} {emailStatus.message}
                </p>
              </div>
            ) : (
              <>
                <p className="text-gray-400 mb-2">
                  Send the diagnostic report to your email address for easy sharing with educators or healthcare providers.
                </p>
                <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-3 mb-4">
                  <p className="text-blue-300 text-sm">
                    📎 <strong>Includes:</strong> HTML report + PDF attachment
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-gray-300 mb-2 text-sm">Email Address</label>
                  <input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="parent@example.com"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowEmailModal(false)}
                    className="flex-1 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendReportEmail}
                    disabled={!emailAddress || emailSending}
                    className="flex-1 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {emailSending ? '📤 Sending...' : '📧 Send Report'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
