import { NextRequest, NextResponse } from 'next/server';
import { GameSession, ChildProfile } from '@/types';

// In-memory storage for demo (replace with Supabase in production)
const sessions: Map<string, GameSession[]> = new Map();
const children: Map<string, ChildProfile> = new Map();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'saveSession': {
        const session = data as GameSession;
        const childId = session.id.split('-')[0]; // Extract child ID from session ID
        
        const existing = sessions.get(childId) || [];
        existing.push(session);
        sessions.set(childId, existing);
        
        return NextResponse.json({ success: true, sessionId: session.id });
      }

      case 'getSessions': {
        const { childId } = data;
        const childSessions = sessions.get(childId) || [];
        return NextResponse.json({ sessions: childSessions });
      }

      case 'saveChild': {
        const child = data as ChildProfile;
        children.set(child.id, child);
        return NextResponse.json({ success: true, childId: child.id });
      }

      case 'getChild': {
        const { childId } = data;
        const child = children.get(childId);
        return NextResponse.json({ child: child || null });
      }

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Session API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Session API',
    endpoints: {
      POST: {
        saveSession: 'Save a game session',
        getSessions: 'Get sessions for a child',
        saveChild: 'Save child profile',
        getChild: 'Get child profile',
      },
    },
  });
}
