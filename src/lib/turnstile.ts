/**
 * Cloudflare Turnstile server-side verification (charter §4: Turnstile on
 * every public form, validated server-side — never trusted from the client).
 *
 * Graceful before configuration: when TURNSTILE_SECRET_KEY is unset the
 * check passes (rate limiting still applies) so forms keep working in dev
 * and on deploys that haven't added the keys yet.
 */
export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
    });
    const data = await res.json().catch(() => ({}));
    return data?.success === true;
  } catch {
    return false;
  }
}
