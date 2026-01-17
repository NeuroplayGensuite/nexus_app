'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface AudioState {
    isActive: boolean;
    hasPermission: boolean | null;
    error: string | null;
    volume: number;
}

interface UseAudioInputReturn {
    state: AudioState;
    startAudio: () => Promise<void>;
    stopAudio: () => void;
    getAudioLevel: () => number;
}

export function useAudioInput(): UseAudioInputReturn {
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

    const [state, setState] = useState<AudioState>({
        isActive: false,
        hasPermission: null,
        error: null,
        volume: 0,
    });

    const startAudio = useCallback(async () => {
        try {
            setState(prev => ({ ...prev, error: null }));

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            streamRef.current = stream;

            // Set up audio analysis
            const audioContext = new AudioContext();
            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);

            analyser.fftSize = 256;
            source.connect(analyser);

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;
            dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

            setState({
                isActive: true,
                hasPermission: true,
                error: null,
                volume: 0,
            });

            // Start volume monitoring
            const updateVolume = () => {
                if (analyserRef.current && dataArrayRef.current && streamRef.current) {
                    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
                    const average = dataArrayRef.current.reduce((a, b) => a + b, 0) / dataArrayRef.current.length;
                    const normalizedVolume = Math.min(average / 128, 1);
                    setState(prev => ({ ...prev, volume: normalizedVolume }));
                    requestAnimationFrame(updateVolume);
                }
            };
            updateVolume();

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to access microphone';
            setState({
                isActive: false,
                hasPermission: false,
                error: message,
                volume: 0,
            });
        }
    }, []);

    const stopAudio = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => { });
            audioContextRef.current = null;
        }
        analyserRef.current = null;
        dataArrayRef.current = null;

        setState(prev => ({ ...prev, isActive: false, volume: 0 }));
    }, []);

    const getAudioLevel = useCallback((): number => {
        if (!analyserRef.current || !dataArrayRef.current) return 0;

        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const average = dataArrayRef.current.reduce((a, b) => a + b, 0) / dataArrayRef.current.length;
        return Math.min(average / 128, 1);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(() => { });
                audioContextRef.current = null;
            }
        };
    }, []);

    return {
        state,
        startAudio,
        stopAudio,
        getAudioLevel,
    };
}
