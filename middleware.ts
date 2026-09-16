/**
 * NeuroGen Suite — Next.js Middleware
 *
 * Runs on every request BEFORE the page renders.
 * Enforces authentication on protected routes server-side.
 *
 * Protected routes:  / (dashboard), /profile, /report, /games/*
 * Public routes:     /login
 */
import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase/server-client';

// Routes that require an authenticated session
const PROTECTED_PATHS = ['/', '/profile', '/report', '/games'];

// Routes that authenticated users should be redirected away from
const AUTH_PATHS = ['/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always pass through Next.js internals and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Build a response we can attach refreshed cookies to
  const response = NextResponse.next({ request });
  const supabase = createMiddlewareClient(request, response);

  // Refresh session — this extends the cookie if it's valid
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
  const isAuthPage = AUTH_PATHS.includes(pathname);

  // Unauthenticated user trying to access a protected page → /login
  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user trying to access /login → /
  if (isAuthPage && user) {
    const dashboardUrl = new URL('/', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Return the response with any refreshed auth cookies set
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
