/**
 * Jetpack Start partner API — provision a Jetpack plan/product on a site
 * under Envosta's Jetpack hosting-partner account (partner id 29307).
 *
 * Flow (https://jetpack.com/for/hosts/jetpack-start-api/):
 *   1. OAuth client_credentials → POST public-api.wordpress.com/oauth2/token
 *      (client_id=JETPACK_PARTNER_ID, client_secret=JETPACK_PARTNER_SECRET,
 *       grant_type=client_credentials, scope=jetpack-partner) → access_token
 *   2. POST public-api.wordpress.com/rest/v1.3/jpphp/provision (Bearer) with
 *      { siteurl, local_user, plan, force_register:1 }
 *
 * Best-effort + non-fatal: a failure means "not provisioned yet" — Jetpack
 * opens a 14-day pending activation that auto-attaches once the site's
 * Jetpack finishes connecting.
 *
 * Plan slugs are supplied by the caller (stored per hosting plan in
 * products.metadata.jetpack_plan_slug). The exact slugs must be confirmed
 * against the live partner account — the public docs list only legacy slugs.
 * Confident: `jetpack_complete`, `jetpack_security_t1` (10GB). The 1GB Backup
 * slug is non-standard — confirm with Automattic before setting it.
 *
 * Requires env: JETPACK_PARTNER_ID, JETPACK_PARTNER_SECRET (server runtime).
 */
const WPCOM_BASE = 'https://public-api.wordpress.com';

export interface JetpackProvisionResult {
  ok: boolean;
  error?: string;
  raw?: unknown;
}

async function getPartnerToken(): Promise<{ token?: string; error?: string }> {
  const id = process.env.JETPACK_PARTNER_ID;
  const secret = process.env.JETPACK_PARTNER_SECRET;
  if (!id || !secret) {
    return { error: 'JETPACK_PARTNER_ID / JETPACK_PARTNER_SECRET not configured' };
  }
  try {
    const res = await fetch(`${WPCOM_BASE}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: id,
        client_secret: secret,
        grant_type: 'client_credentials',
        scope: 'jetpack-partner',
      }),
    });
    const data = await res.json().catch(() => ({}));
    const token = (data as any)?.access_token as string | undefined;
    if (!res.ok || !token) {
      return { error: `Jetpack partner auth failed (HTTP ${res.status}): ${(data as any)?.error_description ?? (data as any)?.error ?? 'no token'}` };
    }
    return { token };
  } catch (e) {
    return { error: `Jetpack partner auth error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function jetpackPartnerProvision(params: {
  siteUrl: string;
  localUser: string;
  plan: string;
  wpcomUserId?: string | number;
}): Promise<JetpackProvisionResult> {
  const { token, error } = await getPartnerToken();
  if (!token) return { ok: false, error };
  try {
    const body = new URLSearchParams({
      siteurl: params.siteUrl,
      local_user: params.localUser,
      plan: params.plan,
      force_register: '1',
    });
    if (params.wpcomUserId != null) body.set('wpcom_user_id', String(params.wpcomUserId));
    const res = await fetch(`${WPCOM_BASE}/rest/v1.3/jpphp/provision`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: `jpphp/provision failed (HTTP ${res.status}): ${(data as any)?.message ?? (data as any)?.error ?? 'unknown'}`, raw: data };
    }
    return { ok: true, raw: data };
  } catch (e) {
    return { ok: false, error: `jpphp/provision error: ${e instanceof Error ? e.message : String(e)}` };
  }
}
