'use client';

import { useState } from 'react';
import Link from 'next/link';

// Clinical distributions based on research
const CLINICAL_DISTRIBUTIONS = {
  dyslexia: {
    phonicDelay: { mean: 1800, std: 400, min: 1200, max: 3000 },
    phonemicSlips: { mean: 8, std: 3, min: 3, max: 15 },
    audioLatency: { mean: 600, std: 150, min: 300, max: 1000 },
    audioConfidence: { mean: 55, std: 15, min: 20, max: 80 },
    mse: { mean: 22, std: 10, min: 8, max: 45 },
    jerkMean: { mean: 280, std: 100, min: 100, max: 500 },
  },
  dysgraphia: {
    mse: { mean: 55, std: 18, min: 30, max: 100 },
    jerkMean: { mean: 850, std: 250, min: 400, max: 1500 },
    tremorIndicator: { mean: 0.65, std: 0.15, min: 0.4, max: 0.95 },
    wallCollisions: { mean: 12, std: 5, min: 5, max: 25 },
    proximityEvents: { mean: 35, std: 12, min: 15, max: 60 },
    phonicDelay: { mean: 950, std: 200, min: 600, max: 1400 },
  },
  dyscalculia: {
    subitizingThreshold: { mean: 2.5, std: 0.8, min: 1, max: 4 },
    subitizingSpeed: { mean: 2800, std: 600, min: 1800, max: 4500 },
    symbolicMapping: { mean: 3500, std: 800, min: 2200, max: 5500 },
    numberLineError: { mean: 25, std: 8, min: 12, max: 45 },
    mse: { mean: 20, std: 8, min: 8, max: 40 },
  },
  dyspraxia: {
    motorLag: { mean: 450, std: 120, min: 250, max: 750 },
    missedBeats: { mean: 6, std: 2, min: 3, max: 12 },
    rhythmAccuracy: { mean: 55, std: 12, min: 30, max: 75 },
    sequenceErrors: { mean: 4, std: 1.5, min: 2, max: 8 },
    mse: { mean: 38, std: 12, min: 20, max: 65 },
    jerkMean: { mean: 550, std: 180, min: 300, max: 900 },
  },
  nvld: {
    spatialMemory: { mean: 45, std: 12, min: 20, max: 70 },
    patternErrors: { mean: 6, std: 2, min: 3, max: 12 },
    gazeEntropy: { mean: 0.75, std: 0.12, min: 0.5, max: 0.95 },
    visualSearchTime: { mean: 4500, std: 1200, min: 2500, max: 7500 },
    phonicDelay: { mean: 900, std: 180, min: 600, max: 1300 },
  },
  typical: {
    phonicDelay: { mean: 850, std: 180, min: 500, max: 1200 },
    phonemicSlips: { mean: 2, std: 1, min: 0, max: 4 },
    audioLatency: { mean: 350, std: 80, min: 200, max: 550 },
    audioConfidence: { mean: 88, std: 8, min: 70, max: 98 },
    mse: { mean: 15, std: 6, min: 5, max: 30 },
    jerkMean: { mean: 180, std: 60, min: 80, max: 320 },
    tremorIndicator: { mean: 0.12, std: 0.06, min: 0.02, max: 0.25 },
    wallCollisions: { mean: 2, std: 1.5, min: 0, max: 6 },
    subitizingThreshold: { mean: 4.8, std: 0.4, min: 4, max: 6 },
    subitizingSpeed: { mean: 1100, std: 250, min: 700, max: 1700 },
    symbolicMapping: { mean: 1200, std: 280, min: 750, max: 1850 },
    motorLag: { mean: 180, std: 50, min: 100, max: 300 },
    rhythmAccuracy: { mean: 88, std: 6, min: 75, max: 98 },
    spatialMemory: { mean: 82, std: 10, min: 60, max: 98 },
    patternErrors: { mean: 1, std: 0.8, min: 0, max: 3 },
  }
};

const AGE_ADJUSTMENTS: Record<number, { multiplier: number; tolerance: number }> = {
  5: { multiplier: 1.25, tolerance: 1.3 },
  6: { multiplier: 1.15, tolerance: 1.2 },
  7: { multiplier: 1.08, tolerance: 1.1 },
  8: { multiplier: 1.0, tolerance: 1.0 },
  9: { multiplier: 0.95, tolerance: 0.95 },
  10: { multiplier: 0.92, tolerance: 0.9 },
  11: { multiplier: 0.90, tolerance: 0.88 },
  12: { multiplier: 0.88, tolerance: 0.85 },
};

const INDIAN_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan',
  'Krishna', 'Ishaan', 'Shaurya', 'Atharva', 'Advait', 'Arnav', 'Dhruv', 'Kabir',
  'Ananya', 'Aadhya', 'Saanvi', 'Aanya', 'Aaradhya', 'Pari', 'Diya', 'Myra',
  'Sara', 'Kiara', 'Prisha', 'Anvi', 'Anika', 'Navya', 'Angel', 'Avni',
  'Priya', 'Rahul', 'Neha', 'Rohit', 'Pooja', 'Amit', 'Sneha', 'Vikram',
  'Kavya', 'Riya', 'Meera', 'Lakshmi', 'Ganesh', 'Sita', 'Ram', 'Gita'
];

interface SyntheticProfile {
  id: string;
  name: string;
  age: number;
  diagnosis: string;
  confidence: number;
  biomarkers: Record<string, number>;
  generatedAt: string;
}

// Box-Muller transform for Gaussian random numbers
function gaussianRandom(mean: number, std: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * std;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function generateBiomarker(
  dist: { mean: number; std: number; min: number; max: number },
  ageAdj: { multiplier: number; tolerance: number }
): number {
  const adjustedMean = dist.mean * ageAdj.multiplier;
  const adjustedStd = dist.std * ageAdj.tolerance;
  const value = gaussianRandom(adjustedMean, adjustedStd);
  return clamp(value, dist.min, dist.max);
}

function generateProfile(diagnosis: string, age: number): SyntheticProfile {
  const dist = CLINICAL_DISTRIBUTIONS[diagnosis as keyof typeof CLINICAL_DISTRIBUTIONS];
  const typicalDist = CLINICAL_DISTRIBUTIONS.typical;
  const ageAdj = AGE_ADJUSTMENTS[age] || AGE_ADJUSTMENTS[8];

  const id = `syn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const name = INDIAN_NAMES[Math.floor(Math.random() * INDIAN_NAMES.length)];

  const biomarkers: Record<string, number> = {};

  // Generate all biomarkers
  const allKeys = new Set([...Object.keys(dist), ...Object.keys(typicalDist)]);
  
  for (const key of allKeys) {
    const specificDist = (dist as Record<string, any>)[key];
    const fallbackDist = (typicalDist as Record<string, any>)[key];
    const useDist = specificDist || fallbackDist;
    
    if (useDist) {
      biomarkers[key] = generateBiomarker(useDist, ageAdj);
    }
  }

  // Calculate confidence
  let confidence = 0.7 + Math.random() * 0.25;
  if (diagnosis === 'dyslexia' && biomarkers.phonicDelay > 1500) confidence += 0.05;
  if (diagnosis === 'dysgraphia' && biomarkers.mse > 45) confidence += 0.05;
  if (diagnosis === 'dyscalculia' && biomarkers.subitizingThreshold < 3) confidence += 0.05;
  if (diagnosis === 'dyspraxia' && biomarkers.motorLag > 400) confidence += 0.05;
  if (diagnosis === 'nvld' && biomarkers.spatialMemory < 55) confidence += 0.05;

  return {
    id,
    name,
    age,
    diagnosis,
    confidence: Math.min(0.98, confidence),
    biomarkers,
    generatedAt: new Date().toISOString(),
  };
}

export default function SyntheticGeneratorPage() {
  const [diagnosis, setDiagnosis] = useState<string>('all');
  const [count, setCount] = useState<number>(50);
  const [ageMin, setAgeMin] = useState<number>(5);
  const [ageMax, setAgeMax] = useState<number>(12);
  const [profiles, setProfiles] = useState<SyntheticProfile[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      const diagnoses = diagnosis === 'all' 
        ? ['dyslexia', 'dysgraphia', 'dyscalculia', 'dyspraxia', 'nvld', 'typical']
        : [diagnosis];
      
      const newProfiles: SyntheticProfile[] = [];
      
      for (let i = 0; i < count; i++) {
        const selectedDiagnosis = diagnoses[Math.floor(Math.random() * diagnoses.length)];
        const age = Math.floor(Math.random() * (ageMax - ageMin + 1)) + ageMin;
        newProfiles.push(generateProfile(selectedDiagnosis, age));
      }
      
      setProfiles(newProfiles);
      setIsGenerating(false);
    }, 500);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(profiles, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synthetic_${diagnosis}_${count}.json`;
    a.click();
  };

  const exportCSV = () => {
    if (profiles.length === 0) return;
    
    const biomarkerKeys = Object.keys(profiles[0].biomarkers);
    const headers = ['id', 'name', 'age', 'diagnosis', 'confidence', ...biomarkerKeys, 'generatedAt'];
    
    const rows = profiles.map(p => [
      p.id,
      p.name,
      p.age,
      p.diagnosis,
      p.confidence.toFixed(4),
      ...biomarkerKeys.map(k => p.biomarkers[k]?.toFixed(4) || ''),
      p.generatedAt
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synthetic_${diagnosis}_${count}.csv`;
    a.click();
  };

  const getDiagnosisColor = (d: string) => {
    const colors: Record<string, string> = {
      dyslexia: 'bg-red-500/20 text-red-400 border-red-500/30',
      dysgraphia: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      dyscalculia: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      dyspraxia: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      nvld: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      typical: 'bg-green-500/20 text-green-400 border-green-500/30',
    };
    return colors[d] || 'bg-gray-500/20 text-gray-400';
  };

  const diagnosisCounts = profiles.reduce((acc, p) => {
    acc[p.diagnosis] = (acc[p.diagnosis] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="text-purple-400 hover:text-purple-300 text-sm mb-2 inline-block">
              ← Back to Home
            </Link>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <span className="text-4xl">🧬</span>
              Synthetic Data Generator
            </h1>
            <p className="text-gray-400 mt-2">
              Generate clinically-accurate synthetic profiles for ML training
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-500">Based on</div>
            <div className="text-purple-400 font-semibold">DSM-5 & TIMSS Norms</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Panel */}
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span>⚙️</span> Generator Settings
            </h2>

            {/* Diagnosis Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Diagnosis Type
              </label>
              <select
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">🎲 All Types (Balanced)</option>
                <option value="dyslexia">📖 Dyslexia</option>
                <option value="dysgraphia">✏️ Dysgraphia</option>
                <option value="dyscalculia">🔢 Dyscalculia</option>
                <option value="dyspraxia">🎯 Dyspraxia</option>
                <option value="nvld">🧩 NVLD</option>
                <option value="typical">✅ Typical Development</option>
              </select>
            </div>

            {/* Count */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Number of Profiles: <span className="text-purple-400 font-bold">{count}</span>
              </label>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10</span>
                <span>500</span>
              </div>
            </div>

            {/* Age Range */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Age Range: <span className="text-purple-400 font-bold">{ageMin} - {ageMax} years</span>
              </label>
              <div className="flex gap-4">
                <input
                  type="number"
                  min="5"
                  max="12"
                  value={ageMin}
                  onChange={(e) => setAgeMin(Math.min(Number(e.target.value), ageMax))}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-center"
                />
                <span className="text-gray-500 self-center">to</span>
                <input
                  type="number"
                  min="5"
                  max="12"
                  value={ageMax}
                  onChange={(e) => setAgeMax(Math.max(Number(e.target.value), ageMin))}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-center"
                />
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Generating...
                </>
              ) : (
                <>
                  <span>🚀</span>
                  Generate {count} Profiles
                </>
              )}
            </button>

            {/* Export Buttons */}
            {profiles.length > 0 && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={exportJSON}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors text-sm"
                >
                  📥 Export JSON
                </button>
                <button
                  onClick={exportCSV}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors text-sm"
                >
                  📊 Export CSV
                </button>
              </div>
            )}

            {/* Stats */}
            {profiles.length > 0 && (
              <div className="mt-6 p-4 bg-slate-900/50 rounded-xl">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Distribution</h3>
                <div className="space-y-2">
                  {Object.entries(diagnosisCounts).map(([d, c]) => (
                    <div key={d} className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-xs border ${getDiagnosisColor(d)}`}>
                        {d}
                      </span>
                      <span className="text-white font-mono">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-2 bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>📋</span> Generated Profiles
                {profiles.length > 0 && (
                  <span className="text-sm font-normal text-gray-400">
                    ({profiles.length} total)
                  </span>
                )}
              </h2>
            </div>

            {profiles.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🧪</div>
                <p className="text-gray-400 text-lg">
                  Configure settings and click Generate to create synthetic profiles
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Based on clinical research from DSM-5, TIMSS, UCI, and PhonBank
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {profiles.slice(0, 50).map((profile, idx) => (
                  <div
                    key={profile.id}
                    className="bg-slate-900/50 rounded-xl p-4 border border-slate-700 hover:border-purple-500/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                          {profile.name[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{profile.name}</div>
                          <div className="text-sm text-gray-400">Age {profile.age} • #{idx + 1}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs border ${getDiagnosisColor(profile.diagnosis)}`}>
                          {profile.diagnosis}
                        </span>
                        <span className="text-xs text-gray-500">
                          {(profile.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    
                    {/* Key Biomarkers */}
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      {Object.entries(profile.biomarkers).slice(0, 4).map(([key, value]) => (
                        <div key={key} className="bg-slate-800 rounded px-2 py-1">
                          <div className="text-gray-500 truncate">{key}</div>
                          <div className="text-white font-mono">
                            {typeof value === 'number' ? value.toFixed(1) : value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {profiles.length > 50 && (
                  <div className="text-center py-4 text-gray-500">
                    Showing first 50 of {profiles.length} profiles. Export to see all.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Info Panel */}
        <div className="mt-6 bg-slate-800/30 rounded-2xl p-6 border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span>📚</span> Clinical Sources & Methodology
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="text-purple-400 font-semibold mb-2">Dyslexia Norms</div>
              <ul className="text-gray-400 space-y-1">
                <li>• PhonBank Corpus (CMU)</li>
                <li>• IDA Research 2020</li>
                <li>• Shaywitz et al. 2003</li>
              </ul>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="text-orange-400 font-semibold mb-2">Motor Control Norms</div>
              <ul className="text-gray-400 space-y-1">
                <li>• UCI Handwriting Dataset</li>
                <li>• Rosenblum 2018</li>
                <li>• Movement ABC-2</li>
              </ul>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="text-yellow-400 font-semibold mb-2">Number Sense Norms</div>
              <ul className="text-gray-400 space-y-1">
                <li>• TIMSS 2019 India (45K children)</li>
                <li>• Butterworth 2005</li>
                <li>• Geary et al. 2012</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
