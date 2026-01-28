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

    // Detect conditions
    const hasDysgraphia = (m.mse ?? 0) > 30;
    const hasDyslexia = (m.phonicDelay ?? 0) > 1500 || (m.phonemicSlips ?? 0) > 2;
    const hasDyscalculia = m.subitizingFailed || (m.subitizingThreshold ?? 5) < 3;
    const hasDyspraxia = (m.motorLag ?? 0) > 300 || (m.rhythmAccuracy ?? 100) < 70;
    const hasNVLD = (m.visualMemoryScore ?? 100) < 60 || (m.spatialDecay1s ?? 0) > 30;

    if (hasDysgraphia) {
      findings.push({
        condition: (m.wallHuggingRatio ?? 0) > 0.5 ? 'dysgraphia-motor' : 'dysgraphia-spatial',
        confidence: (m.mse ?? 0) > 50 ? 'high' : 'medium',
        evidence: [`Path deviation score: ${m.mse?.toFixed(1)}`],
        dailyLifeImpact: 'May have difficulty with handwriting and drawing tasks',
      });
    }

    if (hasDyslexia) {
      findings.push({
        condition: 'dyslexia',
        confidence: (m.phonemicSlips ?? 0) > 3 ? 'high' : 'medium',
        evidence: [`Sound-to-image delay: ${m.phonicDelay}ms`],
        dailyLifeImpact: 'May struggle with reading and spelling tasks',
      });
    }

    if (hasDyscalculia) {
      findings.push({
        condition: 'dyscalculia',
        confidence: m.subitizingFailed ? 'high' : 'medium',
        evidence: [`Instant number recognition: ${m.subitizingThreshold ?? 0} items`],
        dailyLifeImpact: 'May have difficulty with counting and basic math',
      });
    }

    if (hasDyspraxia) {
      findings.push({
        condition: 'dyspraxia',
        confidence: (m.motorLag ?? 0) > 400 ? 'high' : 'medium',
        evidence: [`Motor coordination lag: ${m.motorLag}ms`],
        dailyLifeImpact: 'May struggle with coordination and rhythm-based tasks',
      });
    }

    if (hasNVLD) {
      findings.push({
        condition: 'nvld',
        confidence: (m.visualMemoryScore ?? 100) < 50 ? 'high' : 'medium',
        evidence: [`Visual memory score: ${m.visualMemoryScore?.toFixed(0)}%`],
        dailyLifeImpact: 'May have difficulty with visual-spatial tasks and directions',
      });
    }

    // Generate condition-specific action plans
    const actionPlan = generateActionPlan(findings, childProfile?.age || 8);

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
      actionPlan,
      referrals: findings.length > 0
        ? getRecommendedReferrals(findings)
        : ['Continue regular developmental check-ups'],
      positiveNotes: ['Completed all games with enthusiasm', 'Showed good focus and attention'],
    };
  };

  // Generate detailed, condition-specific action plans
  const generateActionPlan = (findings: ReportData['findings'], age: number) => {
    const conditions = findings.map(f => f.condition);

    // Default plan for typical development
    if (findings.length === 0) {
      return {
        week1: [
          '📚 Read together for 20 minutes daily - let your child choose the book',
          '🎨 Free drawing time - encourage creative expression without correction',
          '🎲 Play board games that involve counting (Snakes & Ladders, Ludo)',
          '🏃 30 minutes of outdoor physical play daily'
        ],
        week2: [
          '✏️ Practice writing fun words (names of friends, pets, favorite things)',
          '🧩 Complete age-appropriate puzzles together',
          '🎵 Sing-along sessions with rhyming songs',
          '⚽ Ball games to improve hand-eye coordination'
        ],
        week3: [
          '📖 Visit the library - let child explore different book types',
          '🔢 Cooking together - measuring ingredients teaches math naturally',
          '🎭 Act out stories to build comprehension',
          '🎯 Target games (throwing into buckets, ring toss)'
        ],
        week4: [
          '🌟 Celebrate progress! Note 3 things your child improved at',
          '📝 Create a "Things I Can Do" poster together',
          '👨‍👩‍👧 Family game night with learning games',
          '🗓️ Plan next month\'s activities based on interests'
        ],
      };
    }

    // Build condition-specific plans
    const week1: string[] = [];
    const week2: string[] = [];
    const week3: string[] = [];
    const week4: string[] = [];

    // Dysgraphia activities
    if (conditions.some(c => c.includes('dysgraphia'))) {
      week1.push('✏️ Finger strengthening: Play with clay/playdough for 10 mins daily');
      week1.push('📝 Large writing practice: Use chalk on pavement or markers on big paper');
      week2.push('🎨 Tracing activities: Trace over dotted lines, shapes, then letters');
      week2.push('✂️ Cutting practice: Cut along straight, then curved lines');
      week3.push('📓 Structured writing: Use paper with raised lines or textured guides');
      week3.push('🖊️ Grip helpers: Try pencil grips or thicker writing tools');
      week4.push('📊 Track handwriting: Keep samples weekly to see improvement');
    }

    // Dyslexia activities
    if (conditions.includes('dyslexia')) {
      week1.push('🔊 Sound games: "What starts with the same sound as CAT?"');
      week1.push('📖 Audiobooks: Listen while following along in the book');
      week2.push('🎵 Rhyming songs: Learn nursery rhymes, find rhyming words');
      week2.push('🔤 Letter-sound matching: Use flashcards with pictures');
      week3.push('📚 Reading buddy: Take turns reading sentences aloud');
      week3.push('🎯 Word families: bat, cat, hat, mat - spot the pattern');
      week4.push('📝 Personal dictionary: Write new words with pictures');
    }

    // Dyscalculia activities
    if (conditions.includes('dyscalculia')) {
      week1.push('🔢 Counting objects: Count toys, snacks, steps - make it real');
      week1.push('🎲 Dice games: Roll and count dots without calculating');
      week2.push('🍕 Pizza math: "How many slices? If we eat 2, how many left?"');
      week2.push('📏 Measuring fun: Use rulers, cups, spoons for cooking');
      week3.push('💰 Money games: Play shop with real coins (supervised)');
      week3.push('🔢 Number lines: Jump on a floor number line, count steps');
      week4.push('🎮 Math apps: Try visual math games (Khan Academy Kids, Moose Math)');
    }

    // Dyspraxia activities
    if (conditions.includes('dyspraxia')) {
      week1.push('🤸 Simple stretches: 5-minute morning routine together');
      week1.push('🎵 Clapping games: Pat-a-cake, follow rhythm patterns');
      week2.push('⚽ Balloon games: Keep balloon in air - no pressure on catching');
      week2.push('🧱 Building blocks: Stack, balance, knock down - repeat');
      week3.push('🎯 Target practice: Throw soft balls into laundry baskets');
      week3.push('🕺 Dance time: Follow simple dance videos together');
      week4.push('🏃 Obstacle course: Set up simple home course with pillows, chairs');
    }

    // NVLD activities
    if (conditions.includes('nvld')) {
      week1.push('🗺️ Map games: Draw a simple map of your home together');
      week1.push('🧩 Pattern blocks: Copy simple designs with colored blocks');
      week2.push('📦 Organization: Sort toys by type, size, or color together');
      week2.push('🎨 Copy drawings: "Draw what I draw" - start with simple shapes');
      week3.push('🔍 I Spy games: "Find something square" - build visual scanning');
      week3.push('📍 Direction games: "Take 3 steps forward, turn left"');
      week4.push('🎪 Memory games: Start with 4 cards, gradually increase');
    }

    // Ensure each week has activities
    const defaultActivities = [
      '🌟 Praise effort, not just results - "I love how hard you tried!"',
      '😊 Keep sessions short (10-15 mins) and fun - stop before frustration',
      '🎉 Celebrate small wins daily - high fives, stickers, or special time together',
      '💬 Talk to your child\'s teacher about classroom accommodations',
    ];

    // Fill in any gaps
    while (week1.length < 4) week1.push(defaultActivities[week1.length % defaultActivities.length]);
    while (week2.length < 4) week2.push(defaultActivities[week2.length % defaultActivities.length]);
    while (week3.length < 4) week3.push(defaultActivities[week3.length % defaultActivities.length]);
    while (week4.length < 4) week4.push(defaultActivities[week4.length % defaultActivities.length]);

    return {
      week1: week1.slice(0, 4),
      week2: week2.slice(0, 4),
      week3: week3.slice(0, 4),
      week4: week4.slice(0, 4),
    };
  };

  // Get condition-specific referrals
  const getRecommendedReferrals = (findings: ReportData['findings']): string[] => {
    const referrals: string[] = [];
    const conditions = findings.map(f => f.condition);

    if (conditions.some(c => c.includes('dysgraphia'))) {
      referrals.push('Occupational Therapist - for handwriting and fine motor skills');
    }
    if (conditions.includes('dyslexia')) {
      referrals.push('Educational Psychologist - for reading assessment');
      referrals.push('Speech-Language Pathologist - for phonological processing');
    }
    if (conditions.includes('dyscalculia')) {
      referrals.push('Educational Psychologist - specializing in math learning');
      referrals.push('Learning Support Specialist - for math interventions');
    }
    if (conditions.includes('dyspraxia')) {
      referrals.push('Occupational Therapist - for motor coordination');
      referrals.push('Physiotherapist - for gross motor skills');
    }
    if (conditions.includes('nvld')) {
      referrals.push('Neuropsychologist - for comprehensive assessment');
      referrals.push('Occupational Therapist - for visual-spatial skills');
    }

    // Always include
    referrals.push('Developmental Pediatrician - for overall evaluation');

    return [...new Set(referrals)]; // Remove duplicates
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
            <div className={`inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full text-sm ${reportSource.includes('local') || reportSource.includes('fallback')
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

            {/* Likely Conditions / Screening Results Section */}
            <div className="bg-gradient-to-r from-rose-900/30 to-orange-900/30 rounded-2xl p-6 border border-rose-700/50 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span>🔍</span> Screening Results
                </h2>
                <p className="text-sm text-rose-100/80 bg-rose-900/50 px-3 py-1 rounded-full border border-rose-700/60">Likely Areas of Concern</p>
              </div>

              {report.findings.length > 0 ? (
                <div className="space-y-4">
                  {/* Condition Cards */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {report.findings.map((finding, idx) => (
                      <div
                        key={idx}
                        className={`rounded-xl p-4 border ${finding.confidence === 'high'
                            ? 'bg-red-900/40 border-red-600/60'
                            : 'bg-amber-900/30 border-amber-600/50'
                          }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${CONDITION_COLORS[finding.condition] || 'bg-gray-500'}`}></span>
                            <h3 className="text-lg font-bold text-white">
                              {CONDITION_LABELS[finding.condition] || finding.condition}
                            </h3>
                          </div>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${finding.confidence === 'high'
                              ? 'bg-red-600 text-white'
                              : 'bg-amber-600 text-white'
                            }`}>
                            {finding.confidence === 'high' ? '⚠️ High' : '📊 Medium'} Likelihood
                          </span>
                        </div>

                        {/* Evidence */}
                        <div className="mb-3">
                          <p className="text-xs text-gray-400 uppercase font-bold mb-1">Evidence:</p>
                          <ul className="text-sm text-gray-300 space-y-1">
                            {finding.evidence?.map((e, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <span className="text-blue-400">•</span> {e}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Daily Life Impact */}
                        <div className="bg-slate-800/50 rounded-lg p-3">
                          <p className="text-xs text-gray-400 uppercase font-bold mb-1">What this means:</p>
                          <p className="text-sm text-gray-200">{finding.dailyLifeImpact}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary Banner */}
                  <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-600">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">🎯</span>
                      <div>
                        <p className="text-white font-bold">
                          {report.findings.length} potential area{report.findings.length > 1 ? 's' : ''} identified
                        </p>
                        <p className="text-gray-400 text-sm">
                          {report.findings.filter(f => f.confidence === 'high').length > 0
                            ? `${report.findings.filter(f => f.confidence === 'high').length} with high likelihood - professional evaluation recommended`
                            : 'Early screening indicators - continued monitoring suggested'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-green-900/30 rounded-xl p-6 border border-green-700/50 text-center">
                  <span className="text-4xl mb-3 block">✨</span>
                  <h3 className="text-xl font-bold text-green-400 mb-2">No Concerns Detected</h3>
                  <p className="text-gray-300">
                    {childProfile?.name || 'Your child'} performed within typical ranges across all assessed areas.
                    Keep encouraging their learning journey!
                  </p>
                </div>
              )}

              {/* Important Disclaimer */}
              <div className="mt-4 bg-yellow-900/20 rounded-lg p-3 border border-yellow-700/40">
                <p className="text-yellow-200/90 text-xs flex items-start gap-2">
                  <span className="text-lg">⚠️</span>
                  <span>
                    <strong>Important:</strong> These are screening indicators only, not clinical diagnoses.
                    Learning differences often overlap, and many children show mixed patterns.
                    A qualified professional (educational psychologist, developmental pediatrician)
                    should conduct formal assessments before any diagnosis is made.
                  </span>
                </p>
              </div>
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
