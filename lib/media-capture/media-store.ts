import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MediaMetrics {
  sessionId: string;
  gameType: string;
  timestamp: number;
  duration: number;
  
  // Audio metrics
  audioLevels: number[];
  averageVolume: number;
  peakVolume: number;
  silencePercentage: number;
  voiceDetected: boolean;
  speechAttempts: number;
  
  // Engagement indicators
  facePresent: boolean;
  engagementScore: number;
}

interface MediaStore {
  // Current session
  isCapturing: boolean;
  currentSessionId: string | null;
  currentGameType: string | null;
  startTime: number | null;
  audioLevels: number[];
  
  // Historical data
  allMediaSessions: MediaMetrics[];
  
  // Actions
  startCapture: (gameType: string) => void;
  stopCapture: () => MediaMetrics | null;
  addAudioLevel: (level: number) => void;
  getMetricsForGame: (gameType: string) => MediaMetrics[];
  getLatestSession: () => MediaMetrics | null;
  clearAllMedia: () => void;
}

export const useMediaStore = create<MediaStore>()(
  persist(
    (set, get) => ({
      isCapturing: false,
      currentSessionId: null,
      currentGameType: null,
      startTime: null,
      audioLevels: [],
      allMediaSessions: [],
      
      startCapture: (gameType: string) => {
        const sessionId = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        set({
          isCapturing: true,
          currentSessionId: sessionId,
          currentGameType: gameType,
          startTime: Date.now(),
          audioLevels: [],
        });
        console.log('📹 Media capture started for:', gameType);
      },
      
      stopCapture: () => {
        const state = get();
        
        if (!state.isCapturing || !state.currentSessionId) return null;
        
        const audioLevels = state.audioLevels;
        const duration = Date.now() - (state.startTime || Date.now());
        
        // Calculate metrics
        const averageVolume = audioLevels.length > 0 
          ? audioLevels.reduce((a, b) => a + b, 0) / audioLevels.length 
          : 0;
        const peakVolume = audioLevels.length > 0 ? Math.max(...audioLevels) : 0;
        const silentSamples = audioLevels.filter(l => l < 5).length;
        const silencePercentage = audioLevels.length > 0 
          ? (silentSamples / audioLevels.length) * 100 
          : 100;
        
        // Count speech attempts (volume spikes above threshold)
        let speechAttempts = 0;
        let inSpeech = false;
        for (const level of audioLevels) {
          if (level > 20 && !inSpeech) {
            speechAttempts++;
            inSpeech = true;
          } else if (level < 10) {
            inSpeech = false;
          }
        }
        
        const metrics: MediaMetrics = {
          sessionId: state.currentSessionId,
          gameType: state.currentGameType || 'unknown',
          timestamp: state.startTime || Date.now(),
          duration,
          audioLevels: audioLevels.slice(-100), // Keep last 100 samples for storage
          averageVolume,
          peakVolume,
          silencePercentage,
          voiceDetected: peakVolume > 30,
          speechAttempts,
          facePresent: true, // Assume present if webcam was on
          engagementScore: Math.min(100, (100 - silencePercentage) + (speechAttempts * 5)),
        };
        
        set((state) => ({
          isCapturing: false,
          currentSessionId: null,
          currentGameType: null,
          startTime: null,
          audioLevels: [],
          allMediaSessions: [...state.allMediaSessions, metrics],
        }));
        
        console.log('📊 Media session saved:', {
          game: metrics.gameType,
          duration: `${(duration / 1000).toFixed(1)}s`,
          avgVolume: metrics.averageVolume.toFixed(1),
          speechAttempts: metrics.speechAttempts,
          engagement: `${metrics.engagementScore.toFixed(0)}%`,
        });
        
        return metrics;
      },
      
      addAudioLevel: (level: number) => {
        set((state) => {
          if (!state.isCapturing) return state;
          
          const newLevels = [...state.audioLevels, level];
          // Keep max 1000 samples (~17 seconds at 60fps)
          if (newLevels.length > 1000) newLevels.shift();
          
          return { audioLevels: newLevels };
        });
      },
      
      getMetricsForGame: (gameType: string) => {
        return get().allMediaSessions.filter(m => m.gameType === gameType);
      },
      
      getLatestSession: () => {
        const sessions = get().allMediaSessions;
        return sessions.length > 0 ? sessions[sessions.length - 1] : null;
      },
      
      clearAllMedia: () => {
        set({ 
          allMediaSessions: [], 
          isCapturing: false,
          currentSessionId: null,
          audioLevels: [],
        });
      },
    }),
    {
      name: 'neurogen-media-storage',
      partialize: (state) => ({
        allMediaSessions: state.allMediaSessions.slice(-50), // Keep last 50 sessions
      }),
    }
  )
);
