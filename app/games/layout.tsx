'use client';

import { useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import VisualEngagementTracker from '@/components/attention/VisualEngagementTracker';
import type { VisualEngagementHandle } from '@/components/attention/VisualEngagementTracker';

/**
 * Games Layout — wraps all 5 game routes with the shared VisualEngagementTracker.
 *
 * The tracker ref is stored on the window object (window.__vetRef) so that
 * individual game components can call:
 *   window.__vetRef?.beginMeasurement(sessionStartMs)
 *   window.__vetRef?.submitTrialBoundary(boundary)
 *   window.__vetRef?.finalise()
 *
 * IMPORTANT: We use a useEffect to sync the ref to window AFTER mount.
 * During render, trackerRef.current is always null because forwardRef handles
 * are only populated after the child component mounts. Assigning during render
 * causes every game to receive null when it reads window.__vetRef.
 */

// Extend window for the tracker ref (type-safe)
declare global {
  interface Window {
    __vetRef: VisualEngagementHandle | null;
  }
}

export default function GamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const trackerRef = useRef<VisualEngagementHandle>(null);

  // ✅ Sync ref to window AFTER mount (not during render).
  // trackerRef.current is null during the initial render pass —
  // useEffect runs after the DOM is committed and the ref is populated.
  useEffect(() => {
    window.__vetRef = trackerRef.current;
    return () => {
      window.__vetRef = null;
    };
  }); // no deps array → runs after every render so it stays fresh

  // Extract game type from pathname (e.g., /games/maze → maze)
  const gameType = useMemo(() => {
    const parts = pathname.split('/');
    return parts[parts.length - 1] || 'unknown';
  }, [pathname]);

  return (
    <div className="relative min-h-screen">
      {children}

      {/*
        Visual Engagement Tracker — floats in corner during games.
        The imperative handle is passed via ref so game components can:
        1. Call beginMeasurement() when startSession() fires
        2. Call submitTrialBoundary() at each trial boundary
        3. Call finalise() before endSession() fires
      */}
      <VisualEngagementTracker
        ref={trackerRef}
        gameType={gameType}
        className="z-50"
      />
    </div>
  );
}
