/**
 * Jetpack Start API — partner attribution / auto-provisioning.
 *
 * wp.cloud installs Jetpack on every provisioned site as a managed plugin.
 * This module ties each client site to Envosta's Jetpack partner account
 * so we get attribution, partner-level Jetpack features, and unified billing.
 *
 * Flow:
 *   1. Exchange partner_id + partner_secret for a short-lived OAuth access token
 *      at https://public-api.wordpress.com/oauth2/token
 *   2. Call POST /rest/v1.3/jpphp/provision with the site URL + local user
 *
 * If the site isn't yet connected to Jetpack (common on a freshly-provisioned
 * wp.cloud site), Jetpack creates a "Pending Activation" that auto-attaches
 * the moment the site connects. Valid for 14 days.
 *
 * Docs:
 *   https://jetpack.com/for/hosts/jetpack-start-api/
 *   https://github.com/Automattic/host-partner-documentation/blob/master/jetpack/jetpack-start-endpoints/authentication.md
 *   https://github.com/Automattic/host-partner-documentation/blob/master/jetpack/jetpack-start-endpoints/plan-provisioning.md
 */

export const JETPACK_PARTNER_ID = Deno.env.get("JETPACK_PARTNER_ID") ?? "";
export const JETPACK_PARTNER_SECRET = Deno.env.get("JETPACK_PARTNER_SECRET") ?? "";
export const JETPACK_DEFAULT_PLAN = Deno.env.get("JETPACK_DEFAULT_PLAN") ?? "free";

const WPCOM_OAUTH_URL = "https://public-api.wordpress.com/oauth2/token";
const WPCOM_PROVISION_URL = "https://public-api.wordpress.com/rest/v1.3/jpphp/provision";

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

/**
 * Exchange partner credentials for an OAuth access token.
 * Per Jetpack docs the token is long-lived and can be cached, but given
 * provisioning is infrequent we just fetch a fresh token each call.
 */
async function getJetpackPartnerToken(): Promise<string | null> {
  if (!JETPACK_PARTNER_ID || !JETPACK_PARTNER_SECRET) {
    console.warn("Jetpack partner credentials missing — skipping partner attribution");
    return null;
  }

  const form = new FormData();
  form.append("client_id", JETPACK_PARTNER_ID);
  form.append("client_secret", JETPACK_PARTNER_SECRET);
  form.append("grant_type", "client_credentials");
  form.append("scope", "jetpack-partner");

  const res = await fetch(WPCOM_OAUTH_URL, {
    method: "POST",
    headers: { "cache-control": "no-cache" },
    body: form,
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("Jetpack OAuth failed:", res.status, text);
    return null;
  }

  try {
    const json = JSON.parse(text);
    return json.access_token ?? null;
  } catch {
    console.error("Jetpack OAuth returned non-JSON:", text);
    return null;
  }
}

/**
 * Provision the partner attribution on a newly-created site.
 *
 * @param siteUrl  HTTPS URL of the WordPress site (e.g. https://acme.envosta.com)
 * @param localUser  WP username, ID, or email of an existing user on the site
 * @param plan  Optional plan slug (free, personal, premium, professional, jetpack-backup-*, etc.)
 */
export async function jetpackPartnerProvision(
  siteUrl: string,
  localUser: string,
  plan: string = JETPACK_DEFAULT_PLAN,
): Promise<JetpackProvisionResult> {
  if (!siteUrl || !localUser) {
    return { ok: false, status: 0, error_code: "missing_args", error_message: "siteUrl and localUser are required" };
  }

  const token = await getJetpackPartnerToken();
  if (!token) {
    return { ok: false, status: 0, error_code: "no_token", error_message: "Could not obtain Jetpack partner token" };
  }

  const form = new FormData();
  form.append("siteurl", siteUrl);
  form.append("local_user", localUser);
  if (plan) form.append("plan", plan);
  // Force register in case the site previously had stale Jetpack tokens
  form.append("force_register", "1");

  const res = await fetch(WPCOM_PROVISION_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "cache-control": "no-cache",
    },
    body: form,
  });

  const text = await res.text();
  let parsed: any = null;
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }

  console.log("Jetpack provision response:", res.status, text);

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
