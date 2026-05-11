/**
 * Browser-side Supabase client. Used inside `'use client'` components
 * and route handlers that need a session-aware client running in the
 * browser. Reads URL + publishable (anon) key from NEXT_PUBLIC_* env
 * vars (which are inlined at build time so they're safe to ship to the
 * client).
 *
 * Supabase has two naming schemes for the public key — the legacy
 * `NEXT_PUBLIC_SUPABASE_ANON_KEY` and the new
 * `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. We prefer the new name and
 * fall back to the legacy one so env rotations can happen without a
 * redeploy.
 *
 * For server-side reads/writes use `@/lib/supabase-server`. For
 * privileged operations (auth.admin, RLS-bypass writes) use the
 * service-role client constructed inline in API routes.
 */
import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_PUBLISHABLE_KEY =
  (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}
