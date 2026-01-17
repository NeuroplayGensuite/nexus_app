'use client';

import MediaCapture from '@/components/MediaCapture';
import { useSessionStore } from '@/stores/session-store';

export default function GamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const addEvent = useSessionStore((state) => state.addEvent);

  const handleWebcamReady = () => {
    console.log('[GamesLayout] Webcam ready for biometric capture');
    addEvent({ type: 'webcam_enabled', data: { timestamp: Date.now() } });
  };

  const handleAudioReady = () => {
    console.log('[GamesLayout] Audio ready for voice analysis');
    addEvent({ type: 'audio_enabled', data: { timestamp: Date.now() } });
  };

  return (
    <div className="relative min-h-screen">
      {children}
      
      {/* Media capture widget - floats in corner during games */}
      <MediaCapture
        autoStart={false}
        showPreview={true}
        onWebcamReady={handleWebcamReady}
        onAudioReady={handleAudioReady}
        className="z-50"
      />
    </div>
  );
}
