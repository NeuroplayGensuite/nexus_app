'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/stores/session-store';

const INTEREST_OPTIONS = [
  { emoji: '⚽', name: 'Football' },
  { emoji: '🏏', name: 'Cricket' },
  { emoji: '🎨', name: 'Drawing' },
  { emoji: '💃', name: 'Dancing' },
  { emoji: '🎤', name: 'Singing' },
  { emoji: '🐕', name: 'Animals' },
  { emoji: '🚀', name: 'Space' },
  { emoji: '🦕', name: 'Dinosaurs' },
  { emoji: '🚗', name: 'Cars' },
  { emoji: '🦸', name: 'Superheroes' },
  { emoji: '📺', name: 'Cartoons' },
  { emoji: '🎮', name: 'Video Games' },
  { emoji: '🍳', name: 'Cooking' },
  { emoji: '📚', name: 'Reading' },
  { emoji: '🎵', name: 'Music' },
];

const GRADE_OPTIONS = ['LKG', 'UKG', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];

export default function ProfilePage() {
  const router = useRouter();
  const { setChildProfile, resetAllSessions } = useSessionStore();

  const [name, setName] = useState('');
  const [age, setAge] = useState(8);
  const [grade, setGrade] = useState('');
  const [school, setSchool] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [previousConcerns, setPreviousConcerns] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'ml' | 'hi'>('en');
  const [step, setStep] = useState(1);

  const toggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest));
    } else if (interests.length < 5) {
      setInterests([...interests, interest]);
    }
  };

  const handleSubmit = () => {
    const profile = {
      id: crypto.randomUUID(),
      name: name || 'Player',
      age,
      grade,
      school: school || undefined,
      interests,
      previousConcerns: previousConcerns || undefined,
      preferredLanguage,
      createdAt: Date.now(),
    };

    // Reset all sessions when creating a new profile
    resetAllSessions();
    setChildProfile(profile);
    router.push('/');
  };

  // Pre-defined particle positions to avoid hydration mismatch
  const particles = [
    { w: 52, h: 99, l: 43, t: 47, delay: 6.6, dur: 19.5 },
    { w: 74, h: 77, l: 91, t: 20, delay: 2.8, dur: 14.9 },
    { w: 49, h: 101, l: 50, t: 84, delay: 12.5, dur: 18.9 },
    { w: 46, h: 65, l: 99, t: 65, delay: 11.3, dur: 16.9 },
    { w: 91, h: 43, l: 38, t: 65, delay: 9.3, dur: 14.8 },
    { w: 93, h: 60, l: 81, t: 91, delay: 5.2, dur: 14.0 },
    { w: 78, h: 88, l: 1, t: 33, delay: 4.7, dur: 15.2 },
    { w: 108, h: 76, l: 9, t: 25, delay: 3.4, dur: 17.1 },
    { w: 63, h: 46, l: 50, t: 30, delay: 14.9, dur: 16.9 },
    { w: 77, h: 66, l: 38, t: 50, delay: 4.2, dur: 13.3 },
    { w: 54, h: 88, l: 33, t: 15, delay: 8.2, dur: 16.7 },
    { w: 119, h: 93, l: 88, t: 54, delay: 2.0, dur: 12.3 },
    { w: 114, h: 80, l: 83, t: 99, delay: 2.8, dur: 18.5 },
    { w: 97, h: 108, l: 9, t: 14, delay: 1.4, dur: 16.6 },
    { w: 90, h: 102, l: 7, t: 57, delay: 0.9, dur: 18.0 },
  ];

  return (
    <main className="min-h-screen animated-gradient relative overflow-hidden p-4 md:p-8">
      {/* Animated Particles Background */}
      <div className="particles-bg">
        {particles.map((p, i) => (
          <div
            key={i}
            className="particle"
            style={{
              width: `${p.w}px`,
              height: `${p.h}px`,
              left: `${p.l}%`,
              top: `${p.t}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Animated Logo */}
        <div className="text-center mb-8 animate-float">
          <span className="text-8xl inline-block animate-bounce">🎮</span>
          <h1 className="text-4xl md:text-5xl font-black mt-4 mb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500">
              Create Your Profile
            </span>
          </h1>
          <p className="text-purple-200 text-lg font-semibold">Let's make your gaming experience personal! ✨</p>
        </div>

        {/* Enhanced Progress indicator with glow */}
        <div className="flex justify-center gap-4 mb-12">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-col items-center gap-2">
              <div
                className={`w-4 h-4 rounded-full transition-all duration-500 ${s === step
                  ? 'bg-yellow-400 scale-150 neon-glow-purple shadow-2xl'
                  : s < step
                    ? 'bg-green-400 scale-110 shadow-lg shadow-green-400/50'
                    : 'bg-white/20 scale-100'
                  }`}
              />
              <span className={`text-xs font-bold ${s === step ? 'text-yellow-400' : s < step ? 'text-green-400' : 'text-white/40'
                }`}>
                {s === 1 ? 'Info' : s === 2 ? 'Interests' : 'Finish'}
              </span>
            </div>
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="glass-card-strong rounded-3xl p-8 md:p-10 border-2 border-purple-500/30 shadow-2xl animate-fadeIn">
            <div className="text-center mb-8">
              <span className="text-6xl mb-4 inline-block animate-bounce">👋</span>
              <h2 className="text-4xl font-black text-white mb-3">
                Hello, New Friend!
              </h2>
              <p className="text-purple-200 text-lg font-semibold">
                Let's get to know you! / നമുക്ക് പരിചയപ്പെടാം!
              </p>
            </div>

            <div className="space-y-8">
              {/* Name */}
              <div>
                <label className="flex items-center gap-2 text-white font-black text-lg mb-3">
                  <span className="text-2xl">🌟</span>
                  What's your name?
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-6 py-5 rounded-2xl bg-white/10 text-white text-xl font-semibold placeholder-white/40 border-2 border-purple-500/30 focus:border-cyan-400 focus:outline-none transition-all focus:scale-105 focus:shadow-xl focus:shadow-cyan-400/20"
                  placeholder="Type your awesome name..."
                />
              </div>

              {/* Age Slider */}
              <div>
                <label className="flex items-center gap-2 text-white font-black text-lg mb-3">
                  <span className="text-2xl">🎂</span>
                  How old are you?
                </label>
                <div className="glass-card rounded-2xl p-6 border border-purple-500/30">
                  <div className="text-center mb-6">
                    <div className="inline-block glass-card-strong px-8 py-4 rounded-3xl border-2 border-yellow-400/50 neon-glow-purple">
                      <span className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                        {age}
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={16}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full h-4 rounded-full appearance-none bg-purple-900/50 cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #fbbf24 0%, #f59e0b ${((age - 4) / 12) * 100}%, rgba(139, 92, 246, 0.3) ${((age - 4) / 12) * 100}%, rgba(139, 92, 246, 0.3) 100%)`
                    }}
                  />
                  <div className="flex justify-between text-purple-300 text-sm font-bold mt-3">
                    <span>4 years</span>
                    <span>16 years</span>
                  </div>
                </div>
              </div>

              {/* Grade */}
              <div>
                <label className="flex items-center gap-2 text-white font-black text-lg mb-3">
                  <span className="text-2xl">📚</span>
                  Which class are you in?
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {GRADE_OPTIONS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGrade(g)}
                      className={`py-3 px-4 rounded-xl text-sm font-black transition-all ${grade === g
                        ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-purple-900 scale-110 shadow-xl shadow-yellow-500/50'
                        : 'glass-card text-white hover:scale-105 border border-purple-500/20'
                        }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!name || !grade}
              className="btn-primary w-full mt-10 py-5 text-white font-black text-xl rounded-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-2xl"
            >
              Next → What do you love? 💖
            </button>
          </div>
        )}

        {/* Step 2: Interests */}
        {step === 2 && (
          <div className="glass-card-strong rounded-3xl p-8 md:p-10 border-2 border-purple-500/30 shadow-2xl animate-fadeIn">
            <div className="text-center mb-8">
              <span className="text-6xl mb-4 inline-block animate-bounce">🎯</span>
              <h2 className="text-4xl font-black text-white mb-3">
                Pick Your Favorites!
              </h2>
              <p className="text-purple-200 text-lg font-semibold mb-2">
                Choose up to 5 things you love
              </p>
              <div className="glass-card inline-block px-6 py-3 rounded-2xl border border-yellow-400/50">
                <p className="text-yellow-400 text-sm font-black">
                  ✨ Selected: {interests.length}/5
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
              {INTEREST_OPTIONS.map((interest) => (
                <button
                  key={interest.name}
                  type="button"
                  onClick={() => toggleInterest(interest.name)}
                  disabled={!interests.includes(interest.name) && interests.length >= 5}
                  className={`flex flex-col items-center justify-center p-5 rounded-2xl transition-all duration-300 ${interests.includes(interest.name)
                    ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-purple-900 scale-110 shadow-2xl shadow-yellow-500/50 neon-glow-purple'
                    : 'glass-card text-white hover:scale-105 border border-purple-500/20 disabled:opacity-30 disabled:cursor-not-allowed'
                    }`}
                >
                  <span className="text-4xl mb-2 transform transition-transform duration-300 hover:scale-125">
                    {interest.emoji}
                  </span>
                  <span className="text-xs font-black text-center">{interest.name}</span>
                  {interests.includes(interest.name) && (
                    <span className="text-lg mt-1">✓</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-4 mt-10">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-5 glass-card text-white font-black text-lg rounded-2xl hover:scale-105 transition-all border border-purple-500/30"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={interests.length === 0}
                className="btn-primary flex-1 py-5 text-white font-black text-lg rounded-2xl hover:scale-105 transition-all disabled:opacity-50 shadow-2xl"
              >
                Next → Almost Done! 🎉
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Language & Concerns */}
        {step === 3 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 md:p-8 animate-fadeIn">
            <h1 className="text-3xl font-bold text-white text-center mb-2">
              🌐 Almost Done!
            </h1>
            <p className="text-purple-200 text-center mb-8">
              Just a few more things...
            </p>

            <div className="space-y-6">
              {/* Language */}
              <div>
                <label className="block text-white font-medium mb-3">
                  Which language for your report?
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPreferredLanguage('en')}
                    className={`py-4 rounded-xl font-medium transition-all ${preferredLanguage === 'en'
                      ? 'bg-yellow-400 text-purple-900'
                      : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                  >
                    🇬🇧 English
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferredLanguage('ml')}
                    className={`py-4 rounded-xl font-medium transition-all ${preferredLanguage === 'ml'
                      ? 'bg-yellow-400 text-purple-900'
                      : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                  >
                    🇮🇳 മലയാളം
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferredLanguage('hi')}
                    className={`py-4 rounded-xl font-medium transition-all ${preferredLanguage === 'hi'
                      ? 'bg-yellow-400 text-purple-900'
                      : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                  >
                    🇮🇳 हिंदी
                  </button>
                </div>
              </div>

              {/* School (Optional) */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Your school name (optional) 🏫
                </label>
                <input
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/50 border-2 border-white/30 focus:border-yellow-400 focus:outline-none transition"
                  placeholder="e.g., St. Mary's School, Kochi"
                />
              </div>

              {/* Previous Concerns (For Parents) */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Any concerns from teachers? (optional) 📝
                </label>
                <p className="text-white/60 text-sm mb-2">
                  Parents: Share any feedback from school here
                </p>
                <textarea
                  value={previousConcerns}
                  onChange={(e) => setPreviousConcerns(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/50 border-2 border-white/30 focus:border-yellow-400 focus:outline-none transition resize-none"
                  placeholder="e.g., Teacher mentioned difficulty with reading..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-4 bg-white/20 text-white font-bold rounded-xl hover:bg-white/30 transition"
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-4 bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold text-xl rounded-xl hover:scale-105 transition-transform"
              >
                🚀 Start Games!
              </button>
            </div>
          </div>
        )}

        {/* Summary Preview */}
        {step === 3 && name && (
          <div className="mt-6 bg-white/5 rounded-xl p-4 text-center">
            <p className="text-white/80">
              Ready to play, <span className="text-yellow-400 font-bold">{name}</span>!
              You love {interests.slice(0, 3).join(', ')}
              {interests.length > 3 && ` and ${interests.length - 3} more`}.
              Let&apos;s go! 🎮
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
