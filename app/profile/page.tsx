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

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-pink-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-3 h-3 rounded-full transition-all ${
                s === step ? 'bg-yellow-400 scale-125' : s < step ? 'bg-green-400' : 'bg-white/30'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 md:p-8 animate-fadeIn">
            <h1 className="text-3xl font-bold text-white text-center mb-2">
              👋 Hello, Friend!
            </h1>
            <p className="text-purple-200 text-center mb-8">
              Let&apos;s get to know you! / നമുക്ക് പരിചയപ്പെടാം!
            </p>

            <div className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-white font-medium mb-2">
                  What&apos;s your name? 🌟
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-4 rounded-xl bg-white/20 text-white text-lg placeholder-white/50 border-2 border-white/30 focus:border-yellow-400 focus:outline-none transition"
                  placeholder="Type your name here..."
                />
              </div>

              {/* Age Slider */}
              <div>
                <label className="block text-white font-medium mb-2">
                  How old are you? 🎂
                </label>
                <div className="bg-white/20 rounded-xl p-4">
                  <div className="text-center text-5xl font-bold text-yellow-400 mb-4">
                    {age}
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={16}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full h-3 rounded-full appearance-none bg-white/30 cursor-pointer"
                  />
                  <div className="flex justify-between text-white/60 text-sm mt-2">
                    <span>4 years</span>
                    <span>16 years</span>
                  </div>
                </div>
              </div>

              {/* Grade */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Which class are you in? 📚
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {GRADE_OPTIONS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGrade(g)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        grade === g
                          ? 'bg-yellow-400 text-purple-900 scale-105'
                          : 'bg-white/20 text-white hover:bg-white/30'
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
              className="w-full mt-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-purple-900 font-bold text-xl rounded-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
            >
              Next → What do you love? 💖
            </button>
          </div>
        )}

        {/* Step 2: Interests */}
        {step === 2 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 md:p-8 animate-fadeIn">
            <h1 className="text-3xl font-bold text-white text-center mb-2">
              🎯 Pick Your Favorites!
            </h1>
            <p className="text-purple-200 text-center mb-2">
              Choose up to 5 things you love
            </p>
            <p className="text-yellow-400 text-center mb-6 text-sm">
              This helps us make games just for you! ✨
            </p>

            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {INTEREST_OPTIONS.map((interest) => (
                <button
                  key={interest.name}
                  type="button"
                  onClick={() => toggleInterest(interest.name)}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all ${
                    interests.includes(interest.name)
                      ? 'bg-yellow-400 text-purple-900 scale-105 ring-4 ring-yellow-300'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  <span className="text-3xl mb-1">{interest.emoji}</span>
                  <span className="text-xs font-medium">{interest.name}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-4 bg-white/20 text-white font-bold rounded-xl hover:bg-white/30 transition"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={interests.length === 0}
                className="flex-1 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-purple-900 font-bold rounded-xl hover:scale-105 transition-transform disabled:opacity-50"
              >
                Next →
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
                    className={`py-4 rounded-xl font-medium transition-all ${
                      preferredLanguage === 'en'
                        ? 'bg-yellow-400 text-purple-900'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    🇬🇧 English
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferredLanguage('ml')}
                    className={`py-4 rounded-xl font-medium transition-all ${
                      preferredLanguage === 'ml'
                        ? 'bg-yellow-400 text-purple-900'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    🇮🇳 മലയാളം
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferredLanguage('hi')}
                    className={`py-4 rounded-xl font-medium transition-all ${
                      preferredLanguage === 'hi'
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
