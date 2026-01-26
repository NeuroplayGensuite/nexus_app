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
    const [hasDevices, setHasDevices] = useState<boolean | null>(null);
    const [hidden, setHidden] = useState(false);

    // Check if devices exist on mount
    useEffect(() => {
        setMounted(true);

        // Check for available devices
        const checkDevices = async () => {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                    setHasDevices(false);
                    return;
                }

                const devices = await navigator.mediaDevices.enumerateDevices();
                const hasVideo = devices.some(d => d.kind === 'videoinput');
                const hasAudio = devices.some(d => d.kind === 'audioinput');
                setHasDevices(hasVideo || hasAudio);

                if (!hasVideo && !hasAudio) {
                    console.log('📷 No camera/mic detected - media capture disabled');
                }
            } catch {
                setHasDevices(false);
            }
        };

        checkDevices();

        return () => {
            stopAllMedia();
        };
    }, []);

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
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => { });
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

        try {
            // Try video + audio first
            let stream: MediaStream;

            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
                    audio: { echoCancellation: true, noiseSuppression: true },
                });
            } catch {
                // Try video only
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
                        audio: false,
                    });
                } catch {
                    // Try audio only
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: false,
                        audio: { echoCancellation: true, noiseSuppression: true },
                    });
                }
            }

            streamRef.current = stream;

            // Set up video if available
            const videoTracks = stream.getVideoTracks();
            if (videoTracks.length > 0 && videoRef.current) {
                videoRef.current.srcObject = stream;
                try {
                    await videoRef.current.play();
                    setWebcamActive(true);
                    onWebcamReady?.();
                    console.log(`📹 Camera started for: ${gameType}`);
                } catch (e) {
                    console.warn('Video play failed:', e);
                }
            }

            // Set up audio if available
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
            const errorObj = err as { name?: string; message?: string };

            if (errorObj.name === 'NotAllowedError') {
                setError('Permission denied. Click 🔒 in address bar to allow.');
            } else if (errorObj.name === 'NotFoundError') {
                setError('No camera/mic found on this device.');
            } else if (errorObj.name === 'NotReadableError') {
                setError('Device in use by another app.');
            } else {
                setError('Could not access media devices.');
            }
            console.warn('Media access error:', errorObj.name);
        }
    }, [gameType, onWebcamReady, onAudioReady]);

    const handleStopMedia = useCallback(() => {
        stopAllMedia();
        console.log(`⏹️ Media stopped for: ${gameType}`);
    }, [stopAllMedia, gameType]);

    // Don't render anything if:
    // - Not mounted yet
    // - No devices available
    // - User closed the widget
    if (!mounted || hasDevices === false || hidden) {
        return null;
    }

    // Still checking for devices
    if (hasDevices === null) {
        return null;
    }

    // Minimized view
    if (minimized && isCapturing) {
        return (
            <button
                onClick={() => setMinimized(false)}
                className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-slate-800/90 backdrop-blur border border-slate-600 rounded-full shadow-lg hover:bg-slate-700 transition ${className}`}
            >
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-white">REC</span>
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
                <div className="flex items-center gap-1">
                    {isCapturing && (
                        <button
                            onClick={() => setMinimized(true)}
                            className="p-1 text-gray-400 hover:text-white text-xs"
                            title="Minimize"
                        >
                            ─
                        </button>
                    )}
                    <button
                        onClick={() => {
                            stopAllMedia();
                            setHidden(true);
                        }}
                        className="p-1 text-gray-400 hover:text-red-400 text-xs"
                        title="Close"
                    >
                        ✕
                    </button>
                </div>
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
                        style={{ maxHeight: '150px' }}
                    />
                    {!webcamActive && !isCapturing && (
                        <div className="h-24 flex items-center justify-center text-gray-500 text-sm">
                            📷 Click Start
                        </div>
                    )}
                    {!webcamActive && isCapturing && (
                        <div className="h-24 flex items-center justify-center text-gray-500 text-sm">
                            🎤 Audio only
                        </div>
                    )}
                    {webcamActive && (
                        <>
                            <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-red-600/80 rounded text-xs text-white flex items-center gap-1">
                                <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
                                LIVE
                            </div>
                            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-blue-600/80 rounded text-xs text-white">
                                {gameType}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Controls */}
            <div className="p-2 space-y-2">
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
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-75 ${audioLevel > 0.7 ? 'bg-red-500' :
                                    audioLevel > 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                            style={{ width: `${Math.max(audioLevel * 100, 5)}%` }}
                        />
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="text-xs text-amber-400 bg-amber-900/30 rounded p-1.5">
                        ⚠️ {error}
                    </div>
                )}

                {/* Buttons */}
                <div className="flex gap-2">
                    {!isCapturing ? (
                        <button
                            onClick={handleStartMedia}
                            className="flex-1 px-2 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition"
                        >
                            ▶️ Start
                        </button>
                    ) : (
                        <button
                            onClick={handleStopMedia}
                            className="flex-1 px-2 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition"
                        >
                            ⏹️ Stop
                        </button>
                    )}
                </div>

                {/* Info */}
                <div className="text-center text-xs text-gray-500">
                    🔒 Optional • Not saved
                </div>
            </div>
        </div>
    );
}
