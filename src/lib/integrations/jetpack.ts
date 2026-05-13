/**
 * Jetpack Start API — partner attribution helper (Vercel runtime).
 *
 * Mirrors supabase/functions/_shared/jetpack.ts so internal Next.js
 * provisioning routes can register partner attribution on freshly
 * created wp.cloud sites without depending on Deno imports.
 *
 * Flow:
 *   1. Exchange partner_id + partner_secret for an OAuth access token
 *      at https://public-api.wordpress.com/oauth2/token
 *   2. POST /rest/v1.3/jpphp/provision with the site URL + local user
 *
 * If the site isn't yet connected to Jetpack (typical immediately
 * after provisioning), Jetpack creates a "Pending Activation" that
 * auto-attaches when the site connects. Valid for 14 days.
 */

const WPCOM_OAUTH_URL = 'https://public-api.wordpress.com/oauth2/token';
const WPCOM_PROVISION_URL = 'https://public-api.wordpress.com/rest/v1.3/jpphp/provision';

export interface JetpackProvisionResult {
  ok: boolean;
  status: number;
  success?: boolean;
  auth_required?: boolean;
  next_url?: string;
  error_code?: string;
  error_message?: string;
  raw?: unknown;
}

async function getPartnerToken(partnerId: string, partnerSecret: string): Promise<string | null> {
  const form = new FormData();
  form.append('client_id', partnerId);
  form.append('client_secret', partnerSecret);
  form.append('grant_type', 'client_credentials');
  form.append('scope', 'jetpack-partner');

  const res = await fetch(WPCOM_OAUTH_URL, {
    method: 'POST',
    headers: { 'cache-control': 'no-cache' },
    body: form,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error('[jetpack] OAuth failed:', res.status, text);
    return null;
  }
  try {
    const json = JSON.parse(text);
    return json.access_token ?? null;
  } catch {
    console.error('[jetpack] OAuth returned non-JSON:', text);
    return null;
  }
}

/**
 * Provision the partner attribution on a newly-created site.
 *
 * @param siteUrl  HTTPS URL of the WordPress site
 * @param localUser  WP username/email/ID of an existing user on the site
 * @param plan  Optional plan slug; defaults to env JETPACK_DEFAULT_PLAN or 'free'
 */
export async function jetpackPartnerProvision(
  siteUrl: string,
  localUser: string,
  plan?: string,
): Promise<JetpackProvisionResult> {
  const partnerId = process.env.JETPACK_PARTNER_ID ?? '';
  const partnerSecret = process.env.JETPACK_PARTNER_SECRET ?? '';
  const defaultPlan = process.env.JETPACK_DEFAULT_PLAN ?? 'free';

  if (!siteUrl || !localUser) {
    return { ok: false, status: 0, error_code: 'missing_args', error_message: 'siteUrl and localUser are required' };
  }
  if (!partnerId || !partnerSecret) {
    return { ok: false, status: 0, error_code: 'no_partner_creds', error_message: 'JETPACK_PARTNER_ID/SECRET not set' };
  }

  const token = await getPartnerToken(partnerId, partnerSecret);
  if (!token) {
    return { ok: false, status: 0, error_code: 'no_token', error_message: 'Could not obtain Jetpack partner token' };
  }

  const form = new FormData();
  form.append('siteurl', siteUrl);
  form.append('local_user', localUser);
  form.append('plan', plan ?? defaultPlan);
  form.append('force_register', '1');

  const res = await fetch(WPCOM_PROVISION_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'cache-control': 'no-cache' },
    body: form,
  });
  const text = await res.text();
  let parsed: any = null;
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }

  return {
    ok: res.ok && parsed?.success !== false,
    status: res.status,
    success: parsed?.success,
    auth_required: parsed?.auth_required,
    next_url: parsed?.next_url,
    error_code: parsed?.error_code,
    error_message: parsed?.error_message,
    raw: parsed,
  };
}
