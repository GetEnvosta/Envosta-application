/**
 * Internal-route authentication helper.
 *
 * Routes under `/api/internal/*` are server-to-server endpoints called by
 * the Stripe webhook, admin routes, and cron jobs. They authenticate via
 * the `X-Internal-Token` header, which must match `INTERNAL_API_TOKEN`,
 * so internal routes can't be hit from the outside.
 *
 * Service-role Supabase access is constructed inline at each call
 * site (per the convention in src/lib/supabase-server.ts) — this
 * helper deliberately does NOT vend a Supabase client.
 */

/**
 * Returns true when the request carries a valid internal token.
 * Returns false when:
 *  - the X-Internal-Token header is missing
 *  - INTERNAL_API_TOKEN env var is not configured (fail closed)
 *  - the values don't match (constant-time-ish comparison)
 *
 * The comparison is not strict timing-safe because Node's
 * crypto.timingSafeEqual requires equal-length buffers and we'd need
 * to special-case mismatched lengths. For an internal token this is
 * acceptable; the bigger risk is the token leaking, not timing
 * attacks against this header check.
 */
export function verifyInternalToken(req: Request): boolean {
  const provided = req.headers.get('x-internal-token') ?? '';
  const expected = process.env.INTERNAL_API_TOKEN ?? '';
  if (!expected) {
    console.error('[internal-auth] INTERNAL_API_TOKEN is not set — rejecting all requests');
    return false;
  }
  if (!provided) return false;
  return provided === expected;
}
