'use client';

import { useEffect, useState } from 'react';
import { useWebcam } from '@/hooks/useWebcam';
import { useAudioInput } from '@/hooks/useAudioInput';

interface MediaCaptureProps {
  onWebcamReady?: () => void;
  onAudioReady?: () => void;
  showPreview?: boolean;
  autoStart?: boolean;
  className?: string;
}

export default function MediaCapture({
  onWebcamReady,
  onAudioReady,
  showPreview = true,
  autoStart = false,
  className = '',
}: MediaCaptureProps) {
  const { videoRef, state: webcamState, startWebcam, stopWebcam } = useWebcam();
  const { state: audioState, startAudio, stopAudio } = useAudioInput();
  const [minimized, setMinimized] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && autoStart) {
      startWebcam().then(() => onWebcamReady?.());
      startAudio().then(() => onAudioReady?.());
    }
    return () => {
      stopWebcam();
      stopAudio();
    };
  }, [mounted, autoStart]);

  const handleStartMedia = async () => {
    await startWebcam();
    await startAudio();
    onWebcamReady?.();
    onAudioReady?.();
  };

  const handleStopMedia = () => {
    stopWebcam();
    stopAudio();
  };

  if (!mounted) return null;

  // Minimized floating indicator
  if (minimized && (webcamState.isActive || audioState.isActive)) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-slate-800/90 backdrop-blur-sm border border-slate-600 rounded-full shadow-lg hover:bg-slate-700 transition ${className}`}
      >
        {webcamState.isActive && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-300">📷</span>
          </span>
        )}
        {audioState.isActive && (
          <span className="flex items-center gap-1">
            <span
              className="w-2 h-2 bg-green-500 rounded-full"
              style={{ opacity: 0.3 + audioState.volume * 0.7 }}
            />
            <span className="text-xs text-gray-300">🎤</span>
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-xl shadow-2xl overflow-hidden ${className}`}
      style={{ width: showPreview && webcamState.isActive ? '200px' : 'auto' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-700/50 border-b border-slate-600">
        <span className="text-xs font-bold text-gray-300">Media Capture</span>
        <div className="flex items-center gap-1">
          {(webcamState.isActive || audioState.isActive) && (
            <button
              onClick={() => setMinimized(true)}
              className="p-1 text-gray-400 hover:text-white transition"
              title="Minimize"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Video Preview */}
      {showPreview && webcamState.isActive && (
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-auto transform scale-x-[-1]"
          />
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-red-600/80 rounded text-xs text-white">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            LIVE
          </div>
        </div>
      )}

      {/* Status & Controls */}
      <div className="p-3 space-y-2">
        {/* Status indicators */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 ${webcamState.isActive ? 'text-green-400' : 'text-gray-500'}`}>
              📷 {webcamState.isActive ? 'On' : 'Off'}
            </span>
            <span className={`flex items-center gap-1 ${audioState.isActive ? 'text-green-400' : 'text-gray-500'}`}>
              🎤 {audioState.isActive ? 'On' : 'Off'}
            </span>
          </div>
        </div>

        {/* Audio level meter */}
        {audioState.isActive && (
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-75"
              style={{ width: `${audioState.volume * 100}%` }}
            />
          </div>
        )}

        {/* Error messages */}
        {(webcamState.error || audioState.error) && (
          <p className="text-xs text-red-400">
            {webcamState.error || audioState.error}
          </p>
        )}

        {/* Control buttons */}
        <div className="flex gap-2">
          {!webcamState.isActive && !audioState.isActive ? (
            <button
              onClick={handleStartMedia}
              className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500 transition"
            >
              Start Capture
            </button>
          ) : (
            <button
              onClick={handleStopMedia}
              className="flex-1 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-500 transition"
            >
              Stop
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
