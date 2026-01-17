'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface WebcamState {
  isActive: boolean;
  hasPermission: boolean | null;
  error: string | null;
}

interface UseWebcamReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  state: WebcamState;
  startWebcam: () => Promise<void>;
  stopWebcam: () => void;
  captureFrame: () => string | null;
}

export function useWebcam(): UseWebcamReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<WebcamState>({
    isActive: false,
    hasPermission: null,
    error: null,
  });

  const startWebcam = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState({
        isActive: true,
        hasPermission: true,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access webcam';
      setState({
        isActive: false,
        hasPermission: false,
        error: message,
      });
    }
  }, []);

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setState(prev => ({ ...prev, isActive: false }));
  }, []);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !state.isActive) return null;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, [state.isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    videoRef,
    state,
    startWebcam,
    stopWebcam,
    captureFrame,
  };
}
