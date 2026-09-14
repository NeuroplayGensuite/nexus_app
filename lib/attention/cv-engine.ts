/**
 * CV Engine — Core face detection + observation loop
 *
 * Responsibilities:
 *  - Load face-api.js models from /public/models/
 *  - Open webcam stream (reusing existing if already active)
 *  - Sample frames at ~8 Hz (configurable via CV_THRESHOLDS.SAMPLE_INTERVAL_MS)
 *  - Produce CVObservation objects timestamped relative to a provided sessionStart
 *  - Maintain a looking-away state machine
 *  - Expose callbacks: onObservation, onLookingAway
 *  - Properly clean up stream and animation frames on destroy()
 *
 * This module is framework-agnostic (no React). The React component
 * VisualEngagementTracker.tsx orchestrates it.
 */

import type * as faceapiType from '@vladmandic/face-api';
let faceapi: typeof faceapiType;
import {
  CVObservation,
  LookingAwayEvent,
  LookingAwayState,
  CV_THRESHOLDS,
} from './engagement-types';

export interface CVEngineCallbacks {
  onObservation: (obs: CVObservation) => void;
  onLookingAwayStart: (timestampMs: number) => void;
  onLookingAwayEnd: (event: LookingAwayEvent) => void;
  onError: (err: string) => void;
}

export interface CVEngineStatus {
  modelsLoaded: boolean;
  streamActive: boolean;
  cameraAvailable: boolean;
  unavailableReason: string | null;
}

// ---------------------------------------------------------------------------
// Head orientation estimation from 68-point landmarks
// ---------------------------------------------------------------------------
function estimateHeadOrientation(
  landmarks: faceapiType.FaceLandmarks68,
): CVObservation['headOrientation'] {
  try {
    const positions = landmarks.positions;

    // Nose tip (30), left eye outer (36), right eye outer (45)
    // chin (8), forehead approximated by midpoint of eyes
    const noseTip = positions[30];
    const leftEyeOuter = positions[36];
    const rightEyeOuter = positions[45];
    const chin = positions[8];

    // Horizontal midpoint between eyes
    const eyeMidX = (leftEyeOuter.x + rightEyeOuter.x) / 2;
    const eyeMidY = (leftEyeOuter.y + rightEyeOuter.y) / 2;

    // Face width for normalisation
    const faceWidth = Math.abs(rightEyeOuter.x - leftEyeOuter.x);
    if (faceWidth < 10) return 'unknown';

    // Horizontal offset: nose vs eye-midpoint
    const horizOffset = (noseTip.x - eyeMidX) / faceWidth;

    // Vertical offset: chin vs eye-midpoint (for up/down)
    const faceHeight = Math.abs(chin.y - eyeMidY);
    const vertOffset = faceHeight > 10
      ? (noseTip.y - eyeMidY) / faceHeight
      : 0;

    // Classify
    if (Math.abs(horizOffset) > 0.22) {
      return horizOffset > 0 ? 'right' : 'left';
    }
    if (vertOffset < 0.15) return 'up';
    if (vertOffset > 0.75) return 'down';

    return 'center';
  } catch {
    return 'unknown';
  }
}

// ---------------------------------------------------------------------------
// CVEngine class
// ---------------------------------------------------------------------------
export class CVEngine {
  private videoEl: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private sampleTimer: ReturnType<typeof setInterval> | null = null;
  private callbacks: CVEngineCallbacks;
  private sessionStartMs = 0;

  // Looking-away state machine
  private lookingAwayState: LookingAwayState = 'TRACKING';
  private possiblyAwayStartMs = 0;
  private lookingAwayStartMs = 0;

  // Status
  private _status: CVEngineStatus = {
    modelsLoaded: false,
    streamActive: false,
    cameraAvailable: false,
    unavailableReason: null,
  };

  constructor(callbacks: CVEngineCallbacks) {
    this.callbacks = callbacks;
  }

  get status(): Readonly<CVEngineStatus> {
    return { ...this._status };
  }

  // ---------------------------------------------------------------------------
  // Load face-api.js models
  // ---------------------------------------------------------------------------
  async loadModels(): Promise<void> {
    if (this._status.modelsLoaded) return;

    try {
      if (!faceapi) {
        faceapi = await import('@vladmandic/face-api');
      }
      // Models are served from /public/models/
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models');
      this._status.modelsLoaded = true;
    } catch (err) {
      const msg = `Failed to load face-api models: ${String(err)}`;
      this.callbacks.onError(msg);
      throw new Error(msg);
    }
  }

  // ---------------------------------------------------------------------------
  // Open webcam stream and attach to a video element
  // ---------------------------------------------------------------------------
  async startCamera(videoEl: HTMLVideoElement): Promise<boolean> {
    this.videoEl = videoEl;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: CV_THRESHOLDS.CAMERA_WIDTH },
          height: { ideal: CV_THRESHOLDS.CAMERA_HEIGHT },
          facingMode: 'user',
        },
        audio: false,
      });

      this.stream = stream;
      videoEl.srcObject = stream;

      await new Promise<void>((resolve, reject) => {
        videoEl.onloadedmetadata = () => {
          videoEl.play().then(resolve).catch(reject);
        };
        videoEl.onerror = reject;
      });

      this._status.streamActive = true;
      this._status.cameraAvailable = true;
      this._status.unavailableReason = null;

      // Start idle sampling for UI feedback
      this.startSamplingLoop();
      
      return true;
    } catch (err: unknown) {
      const errObj = err as { name?: string };
      let reason = 'Camera unavailable';
      if (errObj.name === 'NotAllowedError') reason = 'Camera permission denied';
      else if (errObj.name === 'NotFoundError') reason = 'No camera found on this device';
      else if (errObj.name === 'NotReadableError') reason = 'Camera in use by another application';

      this._status.cameraAvailable = false;
      this._status.unavailableReason = reason;
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Begin the CV measurement window.
  // MUST be called at the exact same logical moment as game start.
  // ---------------------------------------------------------------------------
  beginMeasurement(sessionStartMs: number): void {
    if (!this._status.streamActive || !this._status.modelsLoaded) return;

    this.sessionStartMs = sessionStartMs;
    this.lookingAwayState = 'TRACKING';
    
    // Ensure loop is running (it should already be from startCamera)
    this.startSamplingLoop();
  }

  // ---------------------------------------------------------------------------
  // Stop CV measurement (but keep camera stream alive for potential reuse)
  // ---------------------------------------------------------------------------
  stopMeasurement(): void {
    // If we were looking away when game ended, close the event
    if (this.lookingAwayState === 'LOOKING_AWAY') {
      const now = performance.now() - this.sessionStartMs;
      this.callbacks.onLookingAwayEnd({
        startMs: this.lookingAwayStartMs,
        endMs: now,
        durationMs: now - this.lookingAwayStartMs,
      });
    }
    this.lookingAwayState = 'TRACKING';
    // We intentionally keep the sampling loop running here so the live UI 
    // works even after the game finishes (e.g. if we go back to the menu).
  }

  private startSamplingLoop(): void {
    if (this.sampleTimer) clearInterval(this.sampleTimer);
    this.sampleTimer = setInterval(() => {
      this.sample();
    }, CV_THRESHOLDS.SAMPLE_INTERVAL_MS);
  }

  // ---------------------------------------------------------------------------
  // Full cleanup: stop measurement + release camera stream
  // ---------------------------------------------------------------------------
  destroy(): void {
    this.stopMeasurement();
    if (this.sampleTimer) {
      clearInterval(this.sampleTimer);
      this.sampleTimer = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }

    if (this.videoEl) {
      this.videoEl.srcObject = null;
      this.videoEl = null;
    }

    this._status.streamActive = false;
    this._status.cameraAvailable = false;
  }

  // ---------------------------------------------------------------------------
  // Single frame sample — called by the interval
  // ---------------------------------------------------------------------------
  private async sample(): Promise<void> {
    if (!this.videoEl || !this._status.streamActive) return;
    if (this.videoEl.readyState < 2) return; // not enough data yet

    const timestampMs = performance.now() - this.sessionStartMs;

    try {
      if (!faceapi) {
        faceapi = await import('@vladmandic/face-api');
      }
      const detection = await faceapi
        .detectSingleFace(this.videoEl, new faceapi.TinyFaceDetectorOptions({
          inputSize: 160,  // fastest input size for TinyFaceDetector
          scoreThreshold: CV_THRESHOLDS.MIN_TRACKING_CONFIDENCE,
        }))
        .withFaceLandmarks(true); // true = tiny landmark model

      let obs: CVObservation;

      if (detection) {
        const orientation = estimateHeadOrientation(detection.landmarks);
        obs = {
          timestamp: timestampMs,
          faceDetected: true,
          headOrientation: orientation,
          trackingConfidence: detection.detection.score,
        };
      } else {
        obs = {
          timestamp: timestampMs,
          faceDetected: false,
          headOrientation: 'unknown',
          trackingConfidence: 0,
        };
      }

      this.callbacks.onObservation(obs);
      this.updateLookingAwayStateMachine(obs);
    } catch {
      // Sampling errors are non-fatal — skip this frame silently
    }
  }

  // ---------------------------------------------------------------------------
  // Looking-away state machine
  // ---------------------------------------------------------------------------
  private updateLookingAwayStateMachine(obs: CVObservation): void {
    const nowMs = obs.timestamp;

    const isEngaged =
      obs.faceDetected &&
      obs.trackingConfidence >= CV_THRESHOLDS.MIN_TRACKING_CONFIDENCE &&
      (obs.headOrientation === 'center' || obs.headOrientation === 'unknown');
    // 'unknown' orientation with high confidence = face detected but can't
    // estimate orientation — treat as engaged to avoid false positives.

    switch (this.lookingAwayState) {
      case 'TRACKING':
        if (!isEngaged) {
          this.lookingAwayState = 'POSSIBLY_AWAY';
          this.possiblyAwayStartMs = nowMs;
        }
        break;

      case 'POSSIBLY_AWAY':
        if (isEngaged) {
          // Brief disruption — return to TRACKING
          this.lookingAwayState = 'TRACKING';
        } else if (nowMs - this.possiblyAwayStartMs >= CV_THRESHOLDS.LOOKING_AWAY_ONSET_MS) {
          // Sustained — it's a real looking-away event
          this.lookingAwayState = 'LOOKING_AWAY';
          this.lookingAwayStartMs = this.possiblyAwayStartMs;
          this.callbacks.onLookingAwayStart(this.lookingAwayStartMs);
        }
        break;

      case 'LOOKING_AWAY':
        if (isEngaged) {
          const event: LookingAwayEvent = {
            startMs: this.lookingAwayStartMs,
            endMs: nowMs,
            durationMs: nowMs - this.lookingAwayStartMs,
          };
          this.lookingAwayState = 'TRACKING';
          this.callbacks.onLookingAwayEnd(event);
        }
        break;
    }
  }
}
