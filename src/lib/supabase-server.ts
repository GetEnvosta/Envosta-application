/**
 * Server-side Supabase client. Used by RSCs, route handlers, and
 * services that need to read/write as the currently-authed user.
 *
 * Cookies are bridged through next/headers so the client picks up the
 * session set by Supabase auth. setAll silently no-ops when called
 * from a Server Component (cookies are read-only there) — that's
 * expected; Supabase's auth helper retries the set in a Route Handler
 * context where it works.
 *
 * The publishable key is read from `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
 *
 * For privileged operations that need to bypass RLS or call
 * auth.admin.*, construct a service-role client inline:
 *
 *   import { createClient } from '@supabase/supabase-js';
 *   const sb = createClient(
 *     process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *     process.env.SUPABASE_SECRET_KEY!,
 *     { auth: { persistSession: false } },
 *   );
 *
 * Don't add a getAdmin() helper here — keeping the service-role usage
 * loud and inline makes audits easier.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch { /* Server Component — read-only */ }
        },
      },
    }
  );
}
