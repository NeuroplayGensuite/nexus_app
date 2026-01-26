'use client';

import MediaCapture from '@/components/MediaCapture';
import { useSessionStore } from '@/stores/session-store';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

export default function GamesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const addEvent = useSessionStore((state) => state.addEvent);
    const pathname = usePathname();

    // Extract game type from pathname (e.g., /games/maze → maze)
    const gameType = useMemo(() => {
        const parts = pathname.split('/');
        return parts[parts.length - 1] || 'unknown';
    }, [pathname]);

    const handleWebcamReady = () => {
        console.log(`[GamesLayout] Webcam ready for ${gameType}`);
        addEvent({ type: 'webcam_enabled', data: { timestamp: Date.now(), game: gameType } });
    };

    const handleAudioReady = () => {
        console.log(`[GamesLayout] Audio ready for ${gameType}`);
        addEvent({ type: 'audio_enabled', data: { timestamp: Date.now(), game: gameType } });
    };

    return (
        <div className="relative min-h-screen">
            {children}

            {/* Media capture widget - floats in corner during games */}
            <MediaCapture
                gameType={gameType}
                autoStart={false}
                showPreview={true}
                onWebcamReady={handleWebcamReady}
                onAudioReady={handleAudioReady}
                className="z-50"
            />
        </div>
    );
}
