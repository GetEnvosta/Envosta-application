// lib/opensrs.ts — OpenSRS (Tucows) XML API client
// Docs: https://domains.opensrs.guide/docs (Domains & SSL API guide)
// Auth: X-Username + X-Signature where signature = md5(md5(xml + key) + key)
// Env: OPENSRS_USERNAME, OPENSRS_API_KEY, OPENSRS_ENV ('test' | 'live'),
//      PROVISIONING_DRY_RUN ('true' blocks all live mutations)
// IP allowlisting: your server IPs must be whitelisted in the OpenSRS RCP.

import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";

const HOSTS = {
  test: "https://horizon.opensrs.net:55443",
  live: "https://rr-n1-tor.opensrs.net:55443",
} as const;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only module; never ship client-side
);

const md5 = (s: string) => createHash("md5").update(s).digest("hex");

export type Registrant = {
  first_name: string; last_name: string; org_name: string;
  address1: string; city: string; state: string; country: string;
  postal_code: string; phone: string; email: string;
};

function envOrThrow(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function dryRun(): boolean {
  return process.env.PROVISIONING_DRY_RUN !== "false";
}

// --- XML envelope builders ---------------------------------------------------
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function item(key: string, val: string) {
  return `<item key="${key}">${esc(val)}</item>`;
}
function assoc(items: string) {
  return `<dt_assoc>${items}</dt_assoc>`;
}
function envelope(action: string, object: string, attributes: string) {
  return `<?xml version='1.0' encoding='UTF-8' standalone='no'?>
<!DOCTYPE OPS_envelope SYSTEM 'ops.dtd'>
<OPS_envelope><header><version>0.9</version></header><body><data_block>
${assoc(
  item("protocol", "XCP") +
  item("action", action) +
  item("object", object) +
  `<item key="attributes">${attributes}</item>`
)}
</data_block></body></OPS_envelope>`;
}

async function send(action: string, object: string, attributes: string) {
  const username = envOrThrow("OPENSRS_USERNAME");
  const key = envOrThrow("OPENSRS_API_KEY");
  const env = (process.env.OPENSRS_ENV === "live" ? "live" : "test") as keyof typeof HOSTS;
  const xml = envelope(action, object, attributes);
  const signature = md5(md5(xml + key) + key);

  const res = await fetch(HOSTS[env], {
    method: "POST",
    headers: {
      "Content-Type": "text/xml",
      "X-Username": username,
      "X-Signature": signature,
    },
    body: xml,
  });
  const text = await res.text();
  const success = /<item key="is_success">1<\/item>/.test(text);
  return { success, status: res.status, body: text };
}

async function logEvent(params: {
  domainId?: string; action: string; request: unknown; response: unknown;
  success: boolean; dry: boolean;
}) {
  await supabase.from("opensrs_events").insert({
    domain_id: params.domainId ?? null,
    action: params.action,
    request: params.request,   // NEVER include credentials/signature here
    response: params.response,
    success: params.success,
    dry_run: params.dry,
  });
}

// --- Public API ----------------------------------------------------------------

/** Check availability. Safe in all modes (read-only). */
export async function lookupDomain(domain: string) {
  const attrs = assoc(item("domain", domain));
  const r = await send("LOOKUP", "DOMAIN", attrs);
  const available = /<item key="status">available<\/item>/.test(r.body);
  await logEvent({ action: "lookup", request: { domain }, response: { status: r.status, available }, success: r.success, dry: false });
  return { available, raw: r.body };
}

/**
 * Register a domain IN THE CLIENT'S NAME (client owns, Envosta operates).
 * Nameservers point to wp.cloud. Honors PROVISIONING_DRY_RUN.
 */
export async function registerDomain(opts: {
  domainId: string;            // domains.id row already created as 'pending'
  domain: string;
  period?: number;             // years, default 1
  registrant: Registrant;      // client legal details — client is the owner
  nameservers: string[];       // wp.cloud NS from partner docs
}) {
  const dry = dryRun();
  const contact = assoc(
    item("first_name", opts.registrant.first_name) +
    item("last_name", opts.registrant.last_name) +
    item("org_name", opts.registrant.org_name) +
    item("address1", opts.registrant.address1) +
    item("city", opts.registrant.city) +
    item("state", opts.registrant.state) +
    item("country", opts.registrant.country) +
    item("postal_code", opts.registrant.postal_code) +
    item("phone", opts.registrant.phone) +
    item("email", opts.registrant.email)
  );
  const nsList =
    `<dt_array>` +
    opts.nameservers.map((ns, i) => `<item key="${i}">${assoc(item("name", ns) + item("sortorder", String(i + 1)))}</item>`).join("") +
    `</dt_array>`;
  const attrs = assoc(
    item("domain", opts.domain) +
    item("period", String(opts.period ?? 1)) +
    item("reg_type", "new") +
    item("handle", "process") +
    item("custom_nameservers", "1") +
    `<item key="nameserver_list">${nsList}</item>` +
    `<item key="contact_set">${assoc(
      `<item key="owner">${contact}</item>` +
      `<item key="admin">${contact}</item>` +
      `<item key="billing">${contact}</item>` +
      `<item key="tech">${contact}</item>`
    )}</item>`
  );

  if (dry) {
    await logEvent({ domainId: opts.domainId, action: "sw_register", request: { domain: opts.domain, dry: true }, response: { simulated: true }, success: true, dry: true });
    return { ok: true, dryRun: true as const };
  }

  const r = await send("SW_REGISTER", "DOMAIN", attrs);
  await logEvent({ domainId: opts.domainId, action: "sw_register", request: { domain: opts.domain }, response: { status: r.status, success: r.success }, success: r.success, dry: false });

  await supabase.from("domains").update({
    status: r.success ? "registered" : "failed",
    nameservers: opts.nameservers,
    raw: { last_response_snippet: r.body.slice(0, 2000) },
  }).eq("id", opts.domainId);

  if (!r.success) throw new Error(`OpenSRS SW_REGISTER failed for ${opts.domain}`);
  return { ok: true, dryRun: false as const };
}

/** Update nameservers on an existing domain (e.g., cutover to wp.cloud). */
export async function setNameservers(domainId: string, domain: string, nameservers: string[]) {
  const dry = dryRun();
  const attrs = assoc(
    item("domain", domain) +
    item("op_type", "assign") +
    `<item key="assign_ns"><dt_array>${nameservers.map((ns, i) => `<item key="${i}">${esc(ns)}</item>`).join("")}</dt_array></item>`
  );
  if (dry) {
    await logEvent({ domainId, action: "advanced_update_nameservers", request: { domain, nameservers, dry: true }, response: { simulated: true }, success: true, dry: true });
    return { ok: true, dryRun: true as const };
  }
  const r = await send("advanced_update_nameservers", "NAMESERVER", attrs);
  await logEvent({ domainId, action: "advanced_update_nameservers", request: { domain, nameservers }, response: { status: r.status }, success: r.success, dry: false });
  if (r.success) {
    await supabase.from("domains").update({ status: "dns_configured", nameservers }).eq("id", domainId);
  }
  return { ok: r.success, dryRun: false as const };
}
