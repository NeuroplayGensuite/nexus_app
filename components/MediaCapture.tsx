'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useWebcam } from '@/hooks/useWebcam';
import { useAudioInput } from '@/hooks/useAudioInput';
import { useMediaStore } from '@/lib/media-capture/media-store';

interface MediaCaptureProps {
    gameType?: string;
    onWebcamReady?: () => void;
    onAudioReady?: () => void;
    showPreview?: boolean;
    autoStart?: boolean;
    className?: string;
}

export default function MediaCapture({
    gameType = 'unknown',
    onWebcamReady,
    onAudioReady,
    showPreview = true,
    autoStart = false,
    className = '',
}: MediaCaptureProps) {
    const { videoRef, state: webcamState, startWebcam, stopWebcam } = useWebcam();
    const { state: audioState, startAudio, stopAudio } = useAudioInput();
    const { startCapture, stopCapture, addAudioLevel, isCapturing } = useMediaStore();
    
    const [minimized, setMinimized] = useState(false);
    const [mounted, setMounted] = useState(false);
    const lastVolumeRef = useRef(0);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Track audio levels for analytics
    useEffect(() => {
        if (audioState.isActive && isCapturing) {
            const normalizedVolume = audioState.volume * 100;
            // Only store if changed significantly
            if (Math.abs(normalizedVolume - lastVolumeRef.current) > 2) {
                addAudioLevel(normalizedVolume);
                lastVolumeRef.current = normalizedVolume;
            }
        }
    }, [audioState.volume, audioState.isActive, isCapturing, addAudioLevel]);

    useEffect(() => {
        if (mounted && autoStart) {
            handleStartMedia();
        }
        return () => {
            handleStopMedia();
        };
    }, [mounted, autoStart]);

    const handleStartMedia = useCallback(async () => {
        try {
            await startWebcam();
            await startAudio();
            startCapture(gameType);
            onWebcamReady?.();
            onAudioReady?.();
        } catch (err) {
            console.error('Failed to start media:', err);
        }
    }, [startWebcam, startAudio, startCapture, gameType, onWebcamReady, onAudioReady]);

    const handleStopMedia = useCallback(() => {
        const metrics = stopCapture();
        stopWebcam();
        stopAudio();
        
        if (metrics) {
            console.log('📊 Captured session:', {
                game: metrics.gameType,
                engagement: `${metrics.engagementScore.toFixed(0)}%`,
            });
        }
    }, [stopCapture, stopWebcam, stopAudio]);

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
            style={{ width: showPreview && webcamState.isActive ? '220px' : 'auto' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-700/50 border-b border-slate-600">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-300">📹 Media Capture</span>
                    {isCapturing && (
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    )}
                </div>
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
                    {/* Game type indicator */}
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-blue-600/80 rounded text-xs text-white">
                        {gameType}
                    </div>
                </div>
            )}

            {/* Status & Controls */}
            <div className="p-3 space-y-2">
                {/* Status indicators */}
                <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                        <span className={`flex items-center gap-1 ${webcamState.isActive ? 'text-green-400' : 'text-gray-500'}`}>
                            📷 {webcamState.isActive ? 'On' : 'Off'}
                        </span>
                        <span className={`flex items-center gap-1 ${audioState.isActive ? 'text-green-400' : 'text-gray-500'}`}>
                            🎤 {audioState.isActive ? 'On' : 'Off'}
                        </span>
                    </div>
                    {isCapturing && (
                        <span className="text-cyan-400 text-xs">Recording...</span>
                    )}
                </div>

                {/* Audio level meter */}
                {audioState.isActive && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>Audio Level</span>
                            <span className="text-cyan-400">{(audioState.volume * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-75 ${
                                    audioState.volume > 0.7 ? 'bg-red-500' :
                                    audioState.volume > 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${audioState.volume * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Error messages */}
                {(webcamState.error || audioState.error) && (
                    <p className="text-xs text-red-400 bg-red-900/30 rounded p-2">
                        ⚠️ {webcamState.error || audioState.error}
                    </p>
                )}

                {/* Control buttons */}
                <div className="flex gap-2">
                    {!webcamState.isActive && !audioState.isActive ? (
                        <button
                            onClick={handleStartMedia}
                            className="flex-1 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold rounded-lg hover:from-green-400 hover:to-emerald-500 transition flex items-center justify-center gap-1"
                        >
                            <span>▶️</span> Start Capture
                        </button>
                    ) : (
                        <button
                            onClick={handleStopMedia}
                            className="flex-1 px-3 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-bold rounded-lg hover:from-red-400 hover:to-rose-500 transition flex items-center justify-center gap-1"
                        >
                            <span>⏹️</span> Stop
                        </button>
                    )}
                </div>

                {/* Privacy note */}
                <div className="text-center">
                    <span className="text-xs text-gray-500">
                        🔒 Data stays on your device
                    </span>
                </div>
            </div>
        </div>
    );
}
