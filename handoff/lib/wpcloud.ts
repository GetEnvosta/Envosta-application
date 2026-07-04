// lib/wpcloud.ts — wp.cloud partner API client
//
// HONESTY NOTE FOR CLAUDE CODE: wp.cloud's site-management API is documented in
// the PARTNER docs Koltyn has access to (wp.cloud dashboard -> API docs). The
// structure, auth pattern, logging, and dry-run behavior below are final; the
// ENDPOINT PATHS marked VERIFY must be confirmed against those partner docs
// before flipping PROVISIONING_DRY_RUN=false. Do not guess paths in production.
//
// Env: WPCLOUD_API_BASE, WPCLOUD_API_TOKEN, WPCLOUD_NAMESERVERS (csv),
//      PROVISIONING_DRY_RUN

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only
);

const BASE = process.env.WPCLOUD_API_BASE ?? ""; // e.g. from partner docs
const dry = () => process.env.PROVISIONING_DRY_RUN !== "false";

async function call(path: string, method: "GET" | "POST" | "PUT" | "DELETE", body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.WPCLOUD_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

async function logEvent(siteId: string | null, action: string, request: unknown, response: unknown, success: boolean, isDry: boolean) {
  await supabase.from("wpcloud_events").insert({
    site_id: siteId, action, request, response, success, dry_run: isDry,
  });
}

export function wpcloudNameservers(): string[] {
  const csv = process.env.WPCLOUD_NAMESERVERS ?? "";
  return csv.split(",").map(s => s.trim()).filter(Boolean);
}

/** Provision a new site container for a client. */
export async function createSite(opts: { siteRowId: string; clientId: string; primaryDomain: string }) {
  if (dry()) {
    await logEvent(opts.siteRowId, "create_site", { domain: opts.primaryDomain, dry: true }, { simulated: true }, true, true);
    await supabase.from("sites").update({ status: "provisioned", primary_domain: opts.primaryDomain }).eq("id", opts.siteRowId);
    return { ok: true, dryRun: true as const };
  }
  // VERIFY endpoint + payload shape against wp.cloud partner docs:
  const r = await call(`/sites`, "POST", { domain: opts.primaryDomain });
  await logEvent(opts.siteRowId, "create_site", { domain: opts.primaryDomain }, r.json, r.ok, false);
  if (!r.ok) throw new Error(`wp.cloud create_site failed (${r.status})`);
  await supabase.from("sites").update({
    status: "provisioned",
    wpcloud_site_id: String((r.json as any)?.id ?? (r.json as any)?.site_id ?? ""),
    primary_domain: opts.primaryDomain,
    raw: r.json,
  }).eq("id", opts.siteRowId);
  return { ok: true, dryRun: false as const };
}

/** Map/confirm the primary domain on the site. */
export async function mapDomain(siteRowId: string, wpcloudSiteId: string, domain: string) {
  if (dry()) {
    await logEvent(siteRowId, "map_domain", { domain, dry: true }, { simulated: true }, true, true);
    return { ok: true, dryRun: true as const };
  }
  // VERIFY endpoint:
  const r = await call(`/sites/${wpcloudSiteId}/domains`, "POST", { domain, primary: true });
  await logEvent(siteRowId, "map_domain", { domain }, r.json, r.ok, false);
  if (!r.ok) throw new Error(`wp.cloud map_domain failed (${r.status})`);
  return { ok: true, dryRun: false as const };
}

/** Confirm SSL issuance (wp.cloud handles issuance natively; this polls status). */
export async function confirmSsl(siteRowId: string, wpcloudSiteId: string) {
  if (dry()) {
    await logEvent(siteRowId, "confirm_ssl", { dry: true }, { simulated: true }, true, true);
    await supabase.from("sites").update({ ssl_active: true }).eq("id", siteRowId);
    return { ok: true, dryRun: true as const };
  }
  // VERIFY endpoint:
  const r = await call(`/sites/${wpcloudSiteId}`, "GET");
  const ssl = Boolean((r.json as any)?.ssl_active ?? (r.json as any)?.ssl?.active);
  await logEvent(siteRowId, "confirm_ssl", {}, { ssl }, r.ok, false);
  await supabase.from("sites").update({ ssl_active: ssl, raw: r.json }).eq("id", siteRowId);
  return { ok: ssl, dryRun: false as const };
}
