/**
 * Supabase Browser Client — used for client-side auth operations.
 * Uses @supabase/ssr createBrowserClient so cookies are set correctly
 * for middleware and SSR to read.
 *
 * Import this ONLY in 'use client' components for auth.
 * For data operations (CRUD) continue to use lib/supabase/client.ts.
 */
import { createBrowserClient } from '@supabase/ssr';

export function createAuthClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton for use in hooks/components
let _authClient: ReturnType<typeof createBrowserClient> | null = null;

export function getAuthClient() {
  if (!_authClient) {
    _authClient = createAuthClient();
  }
  return _authClient;
}
