/**
 * NeuroGen Suite — ML Predict API Route (Next.js Server-Side Proxy)
 *
 * This route proxies prediction requests from the browser to the FastAPI
 * Python inference service. Keeping the Python service URL server-side
 * ensures it is never exposed to the browser.
 *
 * POST /api/ml-predict
 * Body: MLFeaturePayload (from lib/ml/feature-mapper.ts)
 */

import { NextRequest, NextResponse } from 'next/server';

// Python FastAPI inference service URL — server-side only
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

const ALLOWED_CONDITIONS = new Set([
  'dyslexia',
  'dysgraphia',
  'dyscalculia',
  'dyspraxia',
  'nvld',
]);

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { condition, features } = body as {
    condition?: string;
    features?: Record<string, unknown>;
  };

  // Validate condition
  if (!condition || typeof condition !== 'string') {
    return NextResponse.json(
      { error: 'Missing required field: condition' },
      { status: 400 }
    );
  }
  if (!ALLOWED_CONDITIONS.has(condition)) {
    return NextResponse.json(
      {
        error: `Unknown condition '${condition}'. Must be one of: ${[...ALLOWED_CONDITIONS].join(', ')}`,
      },
      { status: 400 }
    );
  }

  // Validate features object
  if (!features || typeof features !== 'object') {
    return NextResponse.json(
      { error: 'Missing required field: features' },
      { status: 400 }
    );
  }

  // Forward to FastAPI service
  try {
    const response = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ condition, features }),
      // 15-second timeout — inference is fast but service startup may be slow
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ml-predict] FastAPI error:', response.status, errorText);
      return NextResponse.json(
        {
          error: 'ML service returned an error',
          mlAvailable: false,
          detail: errorText,
        },
        { status: 502 }
      );
    }

    const result = await response.json();
    return NextResponse.json({ ...result, mlAvailable: true });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout = message.includes('timeout') || message.includes('TimeoutError');
    const isConnectionRefused =
      message.includes('ECONNREFUSED') || message.includes('fetch failed');

    console.warn('[ml-predict] FastAPI service unavailable:', message);

    return NextResponse.json(
      {
        mlAvailable: false,
        error: isTimeout
          ? 'ML service timeout'
          : isConnectionRefused
          ? 'ML service not running — start with: cd ml/api && uvicorn main:app --port 8000'
          : `ML service error: ${message}`,
      },
      { status: 503 }
    );
  }
}

// Health check — useful for debugging whether FastAPI is reachable
export async function GET() {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({ mlServiceReachable: true, ...data });
    }
    return NextResponse.json({ mlServiceReachable: false, error: 'FastAPI returned error' });
  } catch {
    return NextResponse.json({
      mlServiceReachable: false,
      error: 'FastAPI service not reachable. Start with: cd ml/api && uvicorn main:app --port 8000',
    });
  }
}
