'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

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
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    
    const [mounted, setMounted] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [webcamActive, setWebcamActive] = useState(false);
    const [audioActive, setAudioActive] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [permissionDenied, setPermissionDenied] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => {
            // Cleanup on unmount
            stopAllMedia();
        };
    }, []);

    // Auto-start if requested
    useEffect(() => {
        if (mounted && autoStart && !isCapturing) {
            handleStartMedia();
        }
    }, [mounted, autoStart]);

    // Audio level monitoring
    useEffect(() => {
        if (!audioActive || !analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        let animationId: number;

        const updateLevel = () => {
            if (analyserRef.current) {
                analyserRef.current.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                setAudioLevel(Math.min(avg / 128, 1));
            }
            animationId = requestAnimationFrame(updateLevel);
        };

        updateLevel();

        return () => {
            cancelAnimationFrame(animationId);
        };
    }, [audioActive]);

    const stopAllMedia = useCallback(() => {
        // Stop video tracks
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
            });
            streamRef.current = null;
        }

        // Clear video element
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        // Close audio context
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
        }
        analyserRef.current = null;

        setWebcamActive(false);
        setAudioActive(false);
        setIsCapturing(false);
        setAudioLevel(0);
    }, []);

    const handleStartMedia = useCallback(async () => {
        setError(null);
        setPermissionDenied(false);

        try {
            // Request both video and audio
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 320 },
                    height: { ideal: 240 },
                    facingMode: 'user',
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });

            streamRef.current = stream;

            // Set up video
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                try {
                    await videoRef.current.play();
                    setWebcamActive(true);
                    onWebcamReady?.();
                    console.log(`📹 Camera started for: ${gameType}`);
                } catch (playErr) {
                    console.error('Video play error:', playErr);
                }
            }

            // Set up audio analysis
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length > 0) {
                const audioContext = new AudioContext();
                const source = audioContext.createMediaStreamSource(stream);
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                source.connect(analyser);

                audioContextRef.current = audioContext;
                analyserRef.current = analyser;
                setAudioActive(true);
                onAudioReady?.();
                console.log(`🎤 Audio started for: ${gameType}`);
            }

            setIsCapturing(true);

        } catch (err: unknown) {
            console.error('Media error:', err);
            
            const errorObj = err as { name?: string; message?: string };
            
            if (errorObj.name === 'NotAllowedError' || errorObj.name === 'PermissionDeniedError') {
                setPermissionDenied(true);
                setError('Camera/mic permission denied. Please allow access.');
            } else if (errorObj.name === 'NotFoundError') {
                setError('No camera or microphone found.');
            } else if (errorObj.name === 'NotReadableError') {
                setError('Camera is in use by another app.');
            } else {
                setError(errorObj.message || 'Failed to start media');
            }
        }
    }, [gameType, onWebcamReady, onAudioReady]);

    const handleStopMedia = useCallback(() => {
        stopAllMedia();
        console.log(`⏹️ Media stopped for: ${gameType}`);
    }, [stopAllMedia, gameType]);

    if (!mounted) return null;

    // Minimized view
    if (minimized && isCapturing) {
        return (
            <button
                onClick={() => setMinimized(false)}
                className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-slate-800/90 backdrop-blur border border-slate-600 rounded-full shadow-lg hover:bg-slate-700 transition ${className}`}
            >
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-white">Recording</span>
                {webcamActive && <span>📷</span>}
                {audioActive && <span>🎤</span>}
            </button>
        );
    }

    return (
        <div
            className={`fixed bottom-4 right-4 z-50 bg-slate-800/95 backdrop-blur border border-slate-600 rounded-xl shadow-2xl overflow-hidden ${className}`}
            style={{ width: showPreview && webcamActive ? '240px' : '200px' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-700/50 border-b border-slate-600">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">📹 Media</span>
                    {isCapturing && (
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-xs text-red-400">REC</span>
                        </span>
                    )}
                </div>
                {isCapturing && (
                    <button
                        onClick={() => setMinimized(true)}
                        className="p-1 text-gray-400 hover:text-white"
                        title="Minimize"
                    >
                        ─
                    </button>
                )}
            </div>

            {/* Video Preview */}
            {showPreview && (
                <div className="relative bg-black">
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className={`w-full h-auto transform scale-x-[-1] ${webcamActive ? 'block' : 'hidden'}`}
                        style={{ maxHeight: '180px' }}
                    />
                    {!webcamActive && (
                        <div className="h-32 flex items-center justify-center text-gray-500 text-sm">
                            📷 Camera off
                        </div>
                    )}
                    {webcamActive && (
                        <>
                            <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-600/80 rounded text-xs text-white flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                LIVE
                            </div>
                            <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-blue-600/80 rounded text-xs text-white">
                                {gameType}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Controls */}
            <div className="p-3 space-y-3">
                {/* Status */}
                <div className="flex items-center justify-between text-xs">
                    <span className={webcamActive ? 'text-green-400' : 'text-gray-500'}>
                        📷 {webcamActive ? 'On' : 'Off'}
                    </span>
                    <span className={audioActive ? 'text-green-400' : 'text-gray-500'}>
                        🎤 {audioActive ? 'On' : 'Off'}
                    </span>
                </div>

                {/* Audio Meter */}
                {audioActive && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>Audio</span>
                            <span>{(audioLevel * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-75 ${
                                    audioLevel > 0.7 ? 'bg-red-500' :
                                    audioLevel > 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${audioLevel * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="text-xs text-red-400 bg-red-900/30 rounded p-2">
                        ⚠️ {error}
                        {permissionDenied && (
                            <div className="mt-1 text-gray-400">
                                Click the camera icon in your browser&apos;s address bar to allow access.
                            </div>
                        )}
                    </div>
                )}

                {/* Buttons */}
                <div className="flex gap-2">
                    {!isCapturing ? (
                        <button
                            onClick={handleStartMedia}
                            className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1"
                        >
                            ▶️ Start
                        </button>
                    ) : (
                        <button
                            onClick={handleStopMedia}
                            className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1"
                        >
                            ⏹️ Stop
                        </button>
                    )}
                </div>

                {/* Privacy */}
                <div className="text-center text-xs text-gray-500">
                    🔒 Video not saved - local only
                </div>
            </div>
        </div>
    );
}
