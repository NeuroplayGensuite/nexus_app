'use client';

/**
 * VisualEngagementTracker
 *
 * Reusable React component used by ALL five assessment games.
 * Drop-in replacement for MediaCapture.tsx.
 *
 * Lifecycle:
 *   1. Renders consent UI (privacy notice)
 *   2. User clicks "Enable Camera" → loads models, opens stream
 *   3. Parent calls tracker.beginMeasurement(sessionStartMs) when game starts
 *   4. Runs CV loop until tracker.stopMeasurement() / tracker.destroy()
 *   5. Parent calls tracker.finalise() → produces SessionVisualEngagement
 *
 * Exposes an imperative handle (ref) so the games layout can call:
 *   trackerRef.current?.beginMeasurement(sessionStartMs)
 *   trackerRef.current?.submitTrialBoundary(boundary)
 *   trackerRef.current?.finalise() → SessionVisualEngagement | null
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { CVEngine } from '@/lib/attention/cv-engine';
import { EngagementAligner } from '@/lib/attention/engagement-aligner';
import { aggregateSessionEngagement } from '@/lib/attention/engagement-metrics';
import type {
  CVObservation,
  LookingAwayEvent,
  SessionVisualEngagement,
  TrialBoundary,
  TrialVisualEngagement,
  TrackingQuality,
} from '@/lib/attention/engagement-types';

// ---------------------------------------------------------------------------
// Public imperative handle type (used by games layout / game components)
// ---------------------------------------------------------------------------
export interface VisualEngagementHandle {
  /**
   * Call this at the EXACT same moment the game session begins.
   * sessionStartMs should be performance.now() at game start.
   */
  beginMeasurement(sessionStartMs: number): void;

  /**
   * Submit a completed trial boundary for CV alignment.
   * Returns the trial's visual engagement metrics immediately.
   */
  submitTrialBoundary(boundary: TrialBoundary): TrialVisualEngagement | null;

  /**
   * Stop measurement and compute final SessionVisualEngagement.
   * Call this just before endSession().
   */
  finalise(): SessionVisualEngagement;

  /** Whether the camera is currently available and tracking */
  readonly isMeasuring: boolean;
  readonly cameraAvailable: boolean;
}

// ---------------------------------------------------------------------------
// UI state machine
// ---------------------------------------------------------------------------
type TrackerUIState =
  | 'consent'           // Pre-permission: showing privacy notice
  | 'loading'           // Loading models / requesting camera
  | 'ready'             // Camera on, models loaded, waiting for game start
  | 'measuring'         // Game running, CV active
  | 'unavailable'       // Camera denied or no device
  | 'minimized';        // User minimized the widget

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface VisualEngagementTrackerProps {
  gameType: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const VisualEngagementTracker = forwardRef<
  VisualEngagementHandle,
  VisualEngagementTrackerProps
>(function VisualEngagementTracker({ gameType, className = '' }, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const engineRef = useRef<CVEngine | null>(null);
  const alignerRef = useRef<EngagementAligner>(new EngagementAligner());

  const [uiState, setUiState] = useState<TrackerUIState>('consent');
  // Mirror uiState in a ref so the imperative handle closure never reads stale state
  const uiStateRef = useRef<TrackerUIState>('consent');
  const setUiStateSynced = (next: TrackerUIState) => {
    uiStateRef.current = next;
    setUiState(next);
  };

  const [faceDetected, setFaceDetected] = useState(false);
  const [headOrientation, setHeadOrientation] = useState<CVObservation['headOrientation']>('unknown');
  const [trackingQuality, setTrackingQuality] = useState<TrackingQuality>('UNAVAILABLE');
  const [engagementPercent, setEngagementPercent] = useState<number | null>(null);
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null);
  const unavailableReasonRef = useRef<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // For finalise()
  const measurementStartRef = useRef<number>(0);
  const measurementEndRef = useRef<number>(0);
  const isMeasuringRef = useRef(false);

  // Rolling window for live engagement display
  const recentObsRef = useRef<CVObservation[]>([]);

  // ---------------------------------------------------------------------------
  // Create CVEngine on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const engine = new CVEngine({
      onObservation: handleObservation,
      onLookingAwayStart: (_ts) => {
        // State machine handled internally by engine; we track events via onLookingAwayEnd
      },
      onLookingAwayEnd: handleLookingAwayEnd,
      onError: (err) => setErrorMsg(err),
    });

    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Callbacks (stable references via useCallback)
  // ---------------------------------------------------------------------------
  const handleObservation = useCallback((obs: CVObservation) => {
    if (isMeasuringRef.current) {
      alignerRef.current.addObservation(obs);
    }

    // Update live UI state
    setFaceDetected(obs.faceDetected);
    setHeadOrientation(obs.headOrientation);

    // Rolling window: last 2 seconds of observations (~16 obs)
    recentObsRef.current = [...recentObsRef.current.slice(-15), obs];
    const recent = recentObsRef.current;
    const engaged = recent.filter(
      o => o.faceDetected && (o.headOrientation === 'center' || o.headOrientation === 'unknown')
    ).length;
    setEngagementPercent(Math.round((engaged / recent.length) * 100));

    // Derive live quality
    const validCount = recent.filter(o => o.faceDetected && o.trackingConfidence >= 0.5).length;
    const ratio = validCount / recent.length;
    setTrackingQuality(ratio >= 0.7 ? 'GOOD' : ratio >= 0.4 ? 'FAIR' : 'POOR');
  }, []);

  const handleLookingAwayEnd = useCallback((event: LookingAwayEvent) => {
    alignerRef.current.addLookingAwayEvent(event);
  }, []);

  // ---------------------------------------------------------------------------
  // Initialise camera + models
  // ---------------------------------------------------------------------------
  const handleEnableCamera = useCallback(async () => {
    setUiStateSynced('loading');
    setErrorMsg(null);

    const engine = engineRef.current;
    if (!engine) return;

    try {
      // Load models first
      await engine.loadModels();

      // Then open camera
      if (!videoRef.current) {
        setUiStateSynced('unavailable');
        const reason = 'Video element not ready';
        unavailableReasonRef.current = reason;
        setUnavailableReason(reason);
        return;
      }

      const success = await engine.startCamera(videoRef.current);

      if (success) {
        setUiStateSynced('ready');
      } else {
        const reason = engine.status.unavailableReason;
        unavailableReasonRef.current = reason;
        setUnavailableReason(reason);
        setUiStateSynced('unavailable');
      }
    } catch (err) {
      setErrorMsg(String(err));
      setUiStateSynced('unavailable');
    }
  }, []);

  const handleContinueWithoutCamera = useCallback(() => {
    const reason = 'User chose to continue without camera';
    unavailableReasonRef.current = reason;
    setUnavailableReason(reason);
    setUiStateSynced('unavailable');
  }, []);

  // ---------------------------------------------------------------------------
  // Imperative handle exposed to parent
  // ---------------------------------------------------------------------------
  useImperativeHandle(ref, () => ({
    beginMeasurement(sessionStartMs: number) {
      const engine = engineRef.current;
      const state = uiStateRef.current;
      // Block only if camera is completely unavailable or not yet consented.
      // Allow starting from 'ready', 'loading', or even 'measuring' (restart).
      if (!engine || state === 'unavailable' || state === 'consent') return;

      measurementStartRef.current = sessionStartMs;
      isMeasuringRef.current = true;
      alignerRef.current.reset();
      engine.beginMeasurement(sessionStartMs);
      uiStateRef.current = 'measuring';
      setUiState('measuring');
    },

    submitTrialBoundary(boundary: TrialBoundary): TrialVisualEngagement | null {
      if (!isMeasuringRef.current) return null;
      return alignerRef.current.submitTrialBoundary(boundary);
    },

    finalise(): SessionVisualEngagement {
      const engine = engineRef.current;
      measurementEndRef.current = performance.now();

      engine?.stopMeasurement();
      isMeasuringRef.current = false;

      const duration =
        measurementEndRef.current - (measurementStartRef.current || measurementEndRef.current);

      const cameraAvail = engine?.status.cameraAvailable ?? false;
      const reason = engine?.status.unavailableReason ?? unavailableReasonRef.current;

      return aggregateSessionEngagement(
        cameraAvail,
        reason,
        duration,
        alignerRef.current.getAllObservations(),
        alignerRef.current.getAllLookingAwayEvents(),
        alignerRef.current.getCompletedTrials(),
      );
    },

    get isMeasuring() { return isMeasuringRef.current; },
    get cameraAvailable() { return engineRef.current?.status.cameraAvailable ?? false; },
  }), []); // stable — all reads go through refs, no stale closures

  // ---------------------------------------------------------------------------
  // Sync setUiState changes that come from the minimized button, etc.
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const faceStatusEl = (
    <span className={`text-xs flex items-center gap-1 ${faceDetected ? 'text-green-400' : 'text-red-400'}`}>
      {faceDetected ? '✓' : '✕'} Face {faceDetected ? 'detected' : 'not detected'}
    </span>
  );

  const qualityColor =
    trackingQuality === 'GOOD' ? 'text-green-400' :
    trackingQuality === 'FAIR' ? 'text-yellow-400' :
    trackingQuality === 'POOR' ? 'text-red-400' : 'text-gray-500';

  // ---------------------------------------------------------------------------
  // Stable DOM Structure
  // React unmounting a <video> loses the srcObject. We keep one persistent
  // video element and just toggle visibility and adjacent UI.
  // ---------------------------------------------------------------------------
  return (
    <div className={`fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 ${className}`}>
      
      {/* Minimized Button */}
      {uiState === 'minimized' && (
        <button
          onClick={() => setUiState('measuring')}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800/90 backdrop-blur border border-slate-600 rounded-full shadow-lg hover:bg-slate-700 transition"
        >
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-white">👁️ Tracking</span>
          {engagementPercent !== null && (
            <span className="text-xs text-green-400">{engagementPercent}%</span>
          )}
        </button>
      )}

      {/* Main Tracker Card */}
      <div 
        className={`bg-slate-800/97 backdrop-blur rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 origin-bottom-right ${
          uiState === 'minimized' 
            ? 'w-0 h-0 opacity-0 border-0 pointer-events-none' 
            : 'border border-slate-600'
        } ${
          uiState === 'consent' ? 'w-72' :
          uiState === 'loading' ? 'w-64' :
          'w-56'
        }`}
      >
        {/* 1. STABLE VIDEO CONTAINER */}
        <div className={`relative bg-black ${uiState === 'ready' || uiState === 'measuring' ? 'block' : 'hidden'}`}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full aspect-video object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          {uiState === 'measuring' && (
            <div className="absolute top-1 left-1 flex items-center gap-1 px-1.5 py-0.5 bg-black/70 rounded">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-400 font-bold">TRACKING</span>
            </div>
          )}
          {uiState === 'ready' && (
            <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-slate-800/80 rounded text-xs text-white">
              📷 Ready
            </div>
          )}
          {(uiState === 'ready' || uiState === 'measuring') && (
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 rounded text-xs text-gray-400">
              {gameType}
            </div>
          )}
        </div>

        {/* 2. DYNAMIC CONTENT BODY */}
        {uiState === 'consent' && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">👁️</span>
              <h3 className="text-sm font-bold text-white">Visual Engagement Tracking</h3>
            </div>
            <p className="text-xs text-gray-300 mb-3 leading-relaxed">
              Your camera will be used to measure <strong>visual engagement</strong> during this activity.
              Video is processed <strong>locally</strong> on your device and is <strong>never stored or uploaded</strong>.
            </p>
            <div className="bg-blue-900/30 border border-blue-700/40 rounded-lg px-3 py-2 mb-3">
              <p className="text-xs text-blue-300">
                🔒 Privacy: Only derived metrics (face detected ratio, engagement %) are saved — no video frames, no identity.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleEnableCamera}
                className="w-full py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition"
              >
                📷 Enable Camera
              </button>
              <button
                onClick={handleContinueWithoutCamera}
                className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 text-xs rounded-lg transition"
              >
                Continue Without Camera
              </button>
            </div>
          </div>
        )}

        {uiState === 'loading' && (
          <div className="p-4 text-center">
            <div className="text-3xl mb-2 animate-pulse">📷</div>
            <p className="text-xs text-gray-300">Loading visual tracking…</p>
            <p className="text-xs text-gray-500 mt-1">Initialising camera & models</p>
          </div>
        )}

        {uiState === 'unavailable' && (
          <div className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-gray-500 text-sm">👁️</span>
              <span className="text-xs text-gray-500 font-bold">Visual Tracking</span>
            </div>
            <p className="text-xs text-gray-500">Not available</p>
            {unavailableReason && (
              <p className="text-xs text-gray-600 mt-0.5">{unavailableReason}</p>
            )}
            {errorMsg && (
              <p className="text-xs text-amber-500 mt-1">⚠️ {errorMsg}</p>
            )}
          </div>
        )}

        {(uiState === 'ready' || uiState === 'measuring') && (
          <div className="p-3 space-y-1.5">
            {faceStatusEl}
            
            {uiState === 'ready' ? (
              <>
                <p className="text-xs text-gray-400">Waiting for game to start…</p>
                <p className="text-xs text-gray-600">🔒 Video not stored</p>
              </>
            ) : (
              <>
                {engagementPercent !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Engagement</span>
                    <span className="text-xs font-bold text-white">{engagementPercent}%</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Quality</span>
                  <span className={`text-xs font-bold ${qualityColor}`}>{trackingQuality}</span>
                </div>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => setUiState('minimized')}
                    className="flex-1 py-1 bg-slate-700 hover:bg-slate-600 text-gray-400 text-xs rounded transition"
                  >
                    Minimize
                  </button>
                </div>
                <p className="text-xs text-gray-600 text-center">🔒 Video not stored</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default VisualEngagementTracker;
