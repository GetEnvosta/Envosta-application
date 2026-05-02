/**
 * Browser-side Supabase client. Used inside `'use client'` components
 * and route handlers that need a session-aware client running in the
 * browser. Reads URL + anon key from NEXT_PUBLIC_* env vars (which are
 * inlined at build time so they're safe to ship to the client).
 *
 * For server-side reads/writes use `@/lib/supabase-server`. For
 * privileged operations (auth.admin, RLS-bypass writes) use the
 * service-role client constructed inline in API routes.
 */
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
