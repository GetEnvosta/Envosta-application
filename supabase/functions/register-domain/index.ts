import { supabaseAdmin, supabaseForUser, SUPABASE_SERVICE_ROLE_KEY, cors, json, error, log } from "../_shared/deps.ts";
import { sendEmail, domainRegisteredEmail } from "../_shared/email.ts";

const OPENSRS_USERNAME = Deno.env.get("OPENSRS_USERNAME") ?? "";
const OPENSRS_API_KEY = Deno.env.get("OPENSRS_API_KEY") ?? "";
const OPENSRS_HOST = Deno.env.get("OPENSRS_HOST") ?? "horizon.opensrs.net";

async function md5(input: string): Promise<string> {
  const mod = await import("https://deno.land/std@0.210.0/crypto/mod.ts");
  const data = new TextEncoder().encode(input);
  const hash = await mod.crypto.subtle.digest("MD5", data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function opensrsSignature(xml: string): Promise<string> {
  const step1 = await md5(xml + OPENSRS_API_KEY);
  return md5(step1 + OPENSRS_API_KEY);
}

async function opensrsRequest(xml: string): Promise<string> {
  const signature = await opensrsSignature(xml);
  const res = await fetch(`https://${OPENSRS_HOST}:55443`, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml",
      "X-Username": OPENSRS_USERNAME,
      "X-Signature": signature,
    },
    body: xml,
  });
  if (!res.ok) throw new Error(`OpenSRS HTTP ${res.status}: ${await res.text()}`);
  return res.text();
}

function parseResponse(xml: string) {
  const getVal = (key: string): string => {
    const match = xml.match(new RegExp(`<item key="${key}">(.*?)</item>`));
    return match ? match[1].trim() : "";
  };
  return {
    isSuccess: getVal("is_success") === "1",
    responseCode: getVal("response_code"),
    responseText: getVal("response_text"),
    status: getVal("status") || undefined,
  };
}

// ─── XML builders ──────────────────────────────────────────

function buildLookupXml(domain: string): string {
  return `<?xml version='1.0' encoding="UTF-8" standalone="no" ?>
<!DOCTYPE OPS_envelope SYSTEM "ops.dtd">
<OPS_envelope>
  <header><version>0.9</version></header>
  <body>
    <data_block>
      <dt_assoc>
        <item key="protocol">XCP</item>
        <item key="object">DOMAIN</item>
        <item key="action">LOOKUP</item>
        <item key="attributes">
          <dt_assoc>
            <item key="domain">${domain}</item>
            <item key="no_cache">1</item>
          </dt_assoc>
        </item>
      </dt_assoc>
    </data_block>
  </body>
</OPS_envelope>`;
}

interface ContactInfo {
  first_name: string;
  last_name: string;
  org_name: string;
  email: string;
  phone: string;
  address1: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function contactBlock(role: string, c: ContactInfo): string {
  return `<item key="${role}">
                  <dt_assoc>
                    <item key="first_name">${xmlEscape(c.first_name)}</item>
                    <item key="last_name">${xmlEscape(c.last_name)}</item>
                    <item key="org_name">${xmlEscape(c.org_name)}</item>
                    <item key="address1">${xmlEscape(c.address1)}</item>
                    <item key="city">${xmlEscape(c.city)}</item>
                    <item key="state">${xmlEscape(c.state)}</item>
                    <item key="postal_code">${xmlEscape(c.postal_code)}</item>
                    <item key="country">${xmlEscape(c.country)}</item>
                    <item key="phone">${xmlEscape(c.phone)}</item>
                    <item key="email">${xmlEscape(c.email)}</item>
                  </dt_assoc>
                </item>`;
}

function buildRegisterXml(domain: string, years: number, contact: ContactInfo): string {
  return `<?xml version='1.0' encoding="UTF-8" standalone="no" ?>
<!DOCTYPE OPS_envelope SYSTEM "ops.dtd">
<OPS_envelope>
  <header><version>0.9</version></header>
  <body>
    <data_block>
      <dt_assoc>
        <item key="protocol">XCP</item>
        <item key="object">DOMAIN</item>
        <item key="action">SW_REGISTER</item>
        <item key="attributes">
          <dt_assoc>
            <item key="domain">${domain}</item>
            <item key="reg_type">new</item>
            <item key="period">${years}</item>
            <item key="handle">process</item>
            <item key="reg_username">env${Date.now().toString().slice(-8)}</item>
            <item key="reg_password">Env0sta${Date.now().toString().slice(-8)}</item>
            <item key="custom_tech_contact">0</item>
            <item key="custom_nameservers">1</item>
            <item key="nameserver_list">
              <dt_array>
                <item key="0"><dt_assoc><item key="name">ns1.systemdns.com</item><item key="sortorder">1</item></dt_assoc></item>
                <item key="1"><dt_assoc><item key="name">ns2.systemdns.com</item><item key="sortorder">2</item></dt_assoc></item>
                <item key="2"><dt_assoc><item key="name">ns3.systemdns.com</item><item key="sortorder">3</item></dt_assoc></item>
              </dt_array>
            </item>
            <item key="f_whois_privacy">1</item>
            <item key="auto_renew">1</item>
            <item key="contact_set">
              <dt_assoc>
                ${contactBlock("owner", contact)}
                ${contactBlock("admin", contact)}
                ${contactBlock("billing", contact)}
                ${contactBlock("tech", contact)}
              </dt_assoc>
            </item>
          </dt_assoc>
        </item>
      </dt_assoc>
    </data_block>
  </body>
</OPS_envelope>`;
}

function buildTransferXml(domain: string, years: number, authInfo: string, contact: ContactInfo): string {
  return `<?xml version='1.0' encoding="UTF-8" standalone="no" ?>
<!DOCTYPE OPS_envelope SYSTEM "ops.dtd">
<OPS_envelope>
  <header><version>0.9</version></header>
  <body>
    <data_block>
      <dt_assoc>
        <item key="protocol">XCP</item>
        <item key="object">DOMAIN</item>
        <item key="action">SW_REGISTER</item>
        <item key="attributes">
          <dt_assoc>
            <item key="domain">${domain}</item>
            <item key="reg_type">transfer</item>
            <item key="period">${years}</item>
            <item key="handle">process</item>
            <item key="reg_username">env${Date.now().toString().slice(-8)}</item>
            <item key="reg_password">Env0sta${Date.now().toString().slice(-8)}</item>
            <item key="auth_info">${authInfo}</item>
            <item key="custom_tech_contact">0</item>
            <item key="custom_nameservers">0</item>
            <item key="f_whois_privacy">1</item>
            <item key="auto_renew">1</item>
            <item key="contact_set">
              <dt_assoc>
                ${contactBlock("owner", contact)}
                ${contactBlock("admin", contact)}
                ${contactBlock("billing", contact)}
                ${contactBlock("tech", contact)}
              </dt_assoc>
            </item>
          </dt_assoc>
        </item>
      </dt_assoc>
    </data_block>
  </body>
</OPS_envelope>`;
}

// ─── Helpers ───────────────────────────────────────────────

function getContact(profile: any, fallbackEmail: string): ContactInfo {
  const nameParts = (profile?.full_name ?? "Domain Owner").split(" ");
  return {
    first_name: nameParts[0] ?? "Domain",
    last_name: nameParts.slice(1).join(" ") || "Owner",
    org_name: profile?.company_name ?? "N/A",
    email: profile?.email ?? fallbackEmail ?? "domains@envosta.com",
    phone: profile?.phone ?? "+1.0000000000",
    address1: (profile?.metadata as any)?.address ?? "N/A",
    city: (profile?.metadata as any)?.city ?? "Calgary",
    state: (profile?.metadata as any)?.state ?? "AB",
    postal_code: (profile?.metadata as any)?.postal_code ?? "T2P0A1",
    country: (profile?.metadata as any)?.country ?? "CA",
  };
}

// ─── Main handler ──────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const t0 = Date.now();

  const registrantIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("cf-connecting-ip")
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
  const registrantUa = req.headers.get("user-agent") ?? "unknown";

  try {
    const body = await req.json();
    const { action, domainName, serviceId, years, nameservers, userId: bodyUserId, siteIp, authInfo } = body;
    if (!domainName) return error("domainName is required");

    // ═══ CHECK — public, no auth ═══════════════════════════
    if (action === "check") {
      const xml = buildLookupXml(domainName);
      const responseXml = await opensrsRequest(xml);
      const parsed = parseResponse(responseXml);
      const ms = Date.now() - t0;
      console.log("OpenSRS lookup:", parsed.responseCode, parsed.responseText);
      const available = parsed.responseCode === "210";
      await log({ action: "domain.check", message: `${domainName}: ${available ? "available" : "taken"}`, ms });
      return json({ domainName, available });
    }

    // ═══ Auth required for all other actions ════════════════
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearerToken = authHeader.replace("Bearer ", "");
    const isServiceRole = bearerToken === SUPABASE_SERVICE_ROLE_KEY;

    let userId: string;
    let userEmail: string;

    const userSb = supabaseForUser(req);
    const { data: { user } } = await userSb.auth.getUser();

    if (user) {
      userId = user.id;
      userEmail = user.email ?? "domains@envosta.com";
    } else if (bodyUserId && isServiceRole) {
      // Only accept bodyUserId from trusted server-to-server calls (webhook, admin API)
      const sb2 = supabaseAdmin();
      const { data: profile } = await sb2.from("users").select("id, email").eq("id", bodyUserId).maybeSingle();
      if (!profile) return error("User not found", 404);
      userId = profile.id;
      userEmail = profile.email ?? "domains@envosta.com";
    } else {
      return error("Unauthorized", 401);
    }

    const sb = supabaseAdmin();

    // ═══ REGISTER — new domain ═════════════════════════════
    if (action === "register") {
      const parts = domainName.split(".");
      const tld = parts[parts.length - 1];

      const agreementAcceptance = {
        accepted_at: new Date().toISOString(),
        ip_address: registrantIp,
        user_agent: registrantUa,
        user_id: userId,
        user_email: userEmail,
        agreement_version: "2026-03-01",
        agreement_url: "https://envosta.com/legal/terms#domain-registration",
      };

      const { data: domain, error: domErr } = await sb.from("domains").insert({
        user_id: userId, site_id: serviceId ?? null, domain_name: domainName,
        tld, status: "pending", registrar: "opensrs",
        metadata: { agreement_acceptance: agreementAcceptance },
      }).select().single();
      if (domErr) return error(domErr.message, 500);

      const { data: profile } = await sb.from("users")
        .select("full_name, email, phone, company_name, metadata")
        .eq("id", userId).maybeSingle();

      const contact = getContact(profile, userEmail);
      const regXml = buildRegisterXml(domainName, years ?? 1, contact);
      const responseXml = await opensrsRequest(regXml);
      const parsed = parseResponse(responseXml);
      const ms = Date.now() - t0;

      console.log("OpenSRS register:", parsed.responseCode, parsed.responseText);

      if (!parsed.isSuccess) {
        await sb.from("domains").update({
          status: "failed", metadata: { agreement_acceptance: agreementAcceptance, error: parsed.responseText, code: parsed.responseCode },
        }).eq("id", domain.id);
        await log({ userId, level: "error", action: "domain.register.failed", message: `${domainName}: ${parsed.responseText}`, ms });
        return error(`Registration failed: ${parsed.responseText}`, 502);
      }

      await sb.from("domains").update({
        status: "registered",
        expires_at: new Date(Date.now() + (years ?? 1) * 365.25 * 86400000).toISOString(),
        metadata: { registration_date: new Date().toISOString(), agreement_acceptance: agreementAcceptance, responseCode: parsed.responseCode, responseText: parsed.responseText },
      }).eq("id", domain.id);

      await log({ userId, serviceId, action: "domain.register.success", message: domainName, ip: registrantIp, ua: registrantUa, ms });

      try {
        const email = domainRegisteredEmail(contact.first_name, domainName);
        await sendEmail({ to: contact.email, ...email });
      } catch { /* non-fatal */ }

      return json({ domainId: domain.id, domainName, status: "registered" });
    }

    // ═══ TRANSFER — move domain from another registrar ═════
    if (action === "transfer") {
      if (!authInfo || typeof authInfo !== "string" || authInfo.trim().length === 0) {
        return error("EPP/authorization code (authInfo) is required for transfers");
      }

      const parts = domainName.split(".");
      const tld = parts[parts.length - 1];

      const agreementAcceptance = {
        accepted_at: new Date().toISOString(),
        ip_address: registrantIp,
        user_agent: registrantUa,
        user_id: userId,
        user_email: userEmail,
        agreement_version: "2026-03-01",
        agreement_url: "https://envosta.com/legal/terms#domain-transfer",
      };

      // Create domain record as transferring
      const { data: domain, error: domErr } = await sb.from("domains").insert({
        user_id: userId, site_id: serviceId ?? null, domain_name: domainName,
        tld, status: "transferring", registrar: "opensrs",
        metadata: { agreement_acceptance: agreementAcceptance, transfer: true },
      }).select().single();
      if (domErr) return error(domErr.message, 500);

      const { data: profile } = await sb.from("users")
        .select("full_name, email, phone, company_name, metadata")
        .eq("id", userId).maybeSingle();

      const contact = getContact(profile, userEmail);
      const transferXml = buildTransferXml(domainName, years ?? 1, authInfo.trim(), contact);
      const responseXml = await opensrsRequest(transferXml);
      const parsed = parseResponse(responseXml);
      const ms = Date.now() - t0;

      console.log("OpenSRS transfer:", parsed.responseCode, parsed.responseText);

      if (!parsed.isSuccess) {
        await sb.from("domains").update({
          status: "failed",
          metadata: { agreement_acceptance: agreementAcceptance, transfer: true, error: parsed.responseText, code: parsed.responseCode },
        }).eq("id", domain.id);
        await log({ userId, level: "error", action: "domain.transfer.failed", message: `${domainName}: ${parsed.responseText}`, ms });
        return error(`Transfer failed: ${parsed.responseText}`, 502);
      }

      // Transfer initiated — OpenSRS processes async (can take up to 5-7 days)
      // Status stays "transferring" until completed
      await sb.from("domains").update({
        status: "transferring",
        metadata: {
          agreement_acceptance: agreementAcceptance,
          transfer: true,
          transfer_initiated_at: new Date().toISOString(),
          responseCode: parsed.responseCode,
          responseText: parsed.responseText,
        },
      }).eq("id", domain.id);

      await log({ userId, serviceId, action: "domain.transfer.initiated", message: domainName, ip: registrantIp, ua: registrantUa, ms });

      try {
        const email = domainRegisteredEmail(contact.first_name, domainName);
        await sendEmail({
          to: contact.email,
          subject: `Domain transfer initiated: ${domainName}`,
          html: email.html.replace("has been registered", "transfer has been initiated").replace("is now active", "will be active once the transfer completes (typically 5-7 days)"),
        });
      } catch { /* non-fatal */ }

      return json({ domainId: domain.id, domainName, status: "transferring" });
    }

    // ═══ UPDATE NAMESERVERS ════════════════════════════════
    if (action === "update-nameservers") {
      if (!nameservers || !Array.isArray(nameservers) || nameservers.length === 0) {
        return error("nameservers array is required");
      }
      if (nameservers.length > 6) return error("Maximum 6 nameservers allowed");

      const nsListItems = nameservers.map((ns: string, i: number) =>
        `<item key="${i}">${ns}</item>`
      ).join("");

      const xml = `<?xml version='1.0' encoding="UTF-8" standalone="no" ?>
<!DOCTYPE OPS_envelope SYSTEM "ops.dtd">
<OPS_envelope>
  <header><version>0.9</version></header>
  <body>
    <data_block>
      <dt_assoc>
        <item key="protocol">XCP</item>
        <item key="object">DOMAIN</item>
        <item key="action">ADVANCED_UPDATE_NAMESERVERS</item>
        <item key="attributes">
          <dt_assoc>
            <item key="domain">${domainName}</item>
            <item key="op_type">assign</item>
            <item key="assign_ns">
              <dt_array>${nsListItems}</dt_array>
            </item>
          </dt_assoc>
        </item>
      </dt_assoc>
    </data_block>
  </body>
</OPS_envelope>`;

      const responseXml = await opensrsRequest(xml);
      const parsed = parseResponse(responseXml);
      const ms = Date.now() - t0;

      console.log("OpenSRS nameserver update:", parsed.responseCode, parsed.responseText);

      if (!parsed.isSuccess) {
        await log({ userId, level: "error", action: "domain.nameservers.failed", message: `${domainName}: ${parsed.responseText}`, ms });
        return error(`Nameserver update failed: ${parsed.responseText}`, 502);
      }

      const { data: domRec } = await sb.from("domains").select("metadata").eq("user_id", userId).eq("domain_name", domainName).maybeSingle();
      await sb.from("domains")
        .update({ metadata: { ...(domRec?.metadata as any ?? {}), nameservers } })
        .eq("user_id", userId)
        .eq("domain_name", domainName);

      await log({ userId, action: "domain.nameservers.updated", message: `${domainName}: ${nameservers.join(", ")}`, ms });
      return json({ domainName, nameservers, success: true });
    }

    // ═══ SETUP DNS ═════════════════════════════════════════
    if (action === "setup-dns") {
      if (!siteIp) return error("siteIp is required");

      const records = [
        { type: "A", subdomain: "", ip_address: siteIp, ttl: 3600 },
        { type: "A", subdomain: "www", ip_address: siteIp, ttl: 3600 },
        { type: "TXT", subdomain: "", text: "v=spf1 include:_spf.wpcloud.com ~all", ttl: 3600 },
        { type: "CNAME", subdomain: "wpcloud1._domainkey", hostname: "wpcloud1._domainkey.wpcloud.com", ttl: 3600 },
        { type: "CNAME", subdomain: "wpcloud2._domainkey", hostname: "wpcloud2._domainkey.wpcloud.com", ttl: 3600 },
        { type: "TXT", subdomain: "_dmarc", text: "v=DMARC1; p=none;", ttl: 3600 },
      ];

      const recordItems = records.map((r, i) => {
        let valueItems = `<item key="type">${r.type}</item><item key="subdomain">${r.subdomain}</item><item key="ttl">${r.ttl}</item>`;
        if (r.type === "A") valueItems += `<item key="ip_address">${(r as any).ip_address}</item>`;
        if (r.type === "CNAME") valueItems += `<item key="hostname">${(r as any).hostname}</item>`;
        if (r.type === "TXT") valueItems += `<item key="text">${(r as any).text}</item>`;
        return `<item key="${i}"><dt_assoc>${valueItems}</dt_assoc></item>`;
      }).join("");

      const xml = `<?xml version='1.0' encoding="UTF-8" standalone="no" ?>
<!DOCTYPE OPS_envelope SYSTEM "ops.dtd">
<OPS_envelope>
  <header><version>0.9</version></header>
  <body>
    <data_block>
      <dt_assoc>
        <item key="protocol">XCP</item>
        <item key="object">DOMAIN</item>
        <item key="action">SET_DNS_ZONE</item>
        <item key="attributes">
          <dt_assoc>
            <item key="domain">${domainName}</item>
            <item key="records">
              <dt_array>${recordItems}</dt_array>
            </item>
          </dt_assoc>
        </item>
      </dt_assoc>
    </data_block>
  </body>
</OPS_envelope>`;

      const responseXml = await opensrsRequest(xml);
      const parsed = parseResponse(responseXml);
      const ms = Date.now() - t0;

      console.log("OpenSRS set_dns_zone:", parsed.responseCode, parsed.responseText);

      if (!parsed.isSuccess) {
        await log({ userId, level: "error", action: "domain.dns.setup.failed", message: `${domainName}: ${parsed.responseText}`, ms });
        return error(`DNS setup failed: ${parsed.responseText}`, 502);
      }

      const { data: dnsRec } = await sb.from("domains").select("metadata").eq("user_id", userId).eq("domain_name", domainName).maybeSingle();
      await sb.from("domains")
        .update({
          status: "registered",
          metadata: { ...(dnsRec?.metadata as any ?? {}), dns_records: records, dns_setup: "complete", site_ip: siteIp, dns_setup_at: new Date().toISOString() },
        })
        .eq("user_id", userId)
        .eq("domain_name", domainName);

      await log({ userId, action: "domain.dns.setup.complete", message: `${domainName} → ${siteIp} (${records.length} records)`, ms });
      return json({ domainName, siteIp, records: records.length, success: true });
    }

    // ═══ SET AUTO-RENEW ════════════════════════════════════
    if (action === "set-auto-renew") {
      const { autoRenew } = body;
      if (typeof autoRenew !== "boolean") return error("autoRenew (boolean) is required");

      const xml = `<?xml version='1.0' encoding="UTF-8" standalone="no" ?>
<!DOCTYPE OPS_envelope SYSTEM "ops.dtd">
<OPS_envelope>
  <header><version>0.9</version></header>
  <body>
    <data_block>
      <dt_assoc>
        <item key="protocol">XCP</item>
        <item key="object">domain</item>
        <item key="action">modify</item>
        <item key="domain">${domainName}</item>
        <item key="attributes">
          <dt_assoc>
            <item key="affect_domains">0</item>
            <item key="data">expire_action</item>
            <item key="auto_renew">${autoRenew ? 1 : 0}</item>
            <item key="let_expire">${autoRenew ? 0 : 1}</item>
          </dt_assoc>
        </item>
      </dt_assoc>
    </data_block>
  </body>
</OPS_envelope>`;

      const responseXml = await opensrsRequest(xml);
      const parsed = parseResponse(responseXml);
      const ms = Date.now() - t0;

      console.log("OpenSRS auto-renew toggle:", parsed.responseCode, parsed.responseText);

      if (!parsed.isSuccess) {
        await log({ userId, level: "error", action: "domain.auto_renew.failed", message: `${domainName}: ${parsed.responseText}`, ms });
        return error(`Auto-renew update failed: ${parsed.responseText}`, 502);
      }

      await sb.from("domains")
        .update({ auto_renew: autoRenew })
        .eq("user_id", userId)
        .eq("domain_name", domainName);

      await log({ userId, action: "domain.auto_renew.updated", message: `${domainName}: ${autoRenew ? "enabled" : "disabled"}`, ms });
      return json({ domainName, autoRenew, success: true });
    }

    // ═══ TOGGLE WHOIS PRIVACY ══════════════════════════════
    if (action === "set-whois-privacy") {
      const { enabled } = body;
      if (typeof enabled !== "boolean") return error("enabled (boolean) is required");

      const state = enabled ? "enable" : "disable";
      const xml = `<?xml version='1.0' encoding="UTF-8" standalone="no" ?>
<!DOCTYPE OPS_envelope SYSTEM "ops.dtd">
<OPS_envelope>
  <header><version>0.9</version></header>
  <body>
    <data_block>
      <dt_assoc>
        <item key="protocol">XCP</item>
        <item key="object">domain</item>
        <item key="action">modify</item>
        <item key="domain">${domainName}</item>
        <item key="attributes">
          <dt_assoc>
            <item key="affect_domains">0</item>
            <item key="data">whois_privacy_state</item>
            <item key="state">${state}</item>
          </dt_assoc>
        </item>
      </dt_assoc>
    </data_block>
  </body>
</OPS_envelope>`;

      const responseXml = await opensrsRequest(xml);

      const parsed = parseResponse(responseXml);
      const ms = Date.now() - t0;
      console.log("OpenSRS WHOIS privacy:", state, parsed.responseCode, parsed.responseText);

      if (!parsed.isSuccess) {
        await log({ userId, level: "error", action: "domain.whois_privacy.failed", message: `${domainName}: ${parsed.responseText}`, ms });
        return error(`WHOIS privacy update failed: ${parsed.responseText}`, 502);
      }

      const { data: wpRec } = await sb.from("domains").select("metadata").eq("user_id", userId).eq("domain_name", domainName).maybeSingle();
      await sb.from("domains")
        .update({ metadata: { ...(wpRec?.metadata as any ?? {}), whois_privacy: enabled } })
        .eq("user_id", userId)
        .eq("domain_name", domainName);

      await log({ userId, action: "domain.whois_privacy.updated", message: `${domainName}: ${state}`, ms });
      return json({ domainName, whoisPrivacy: enabled, success: true });
    }

    return error(`Unknown action: ${action}`, 400);

  } catch (e) {
    console.error("Domain error:", e);
    return error(String(e), 500);
  }
});
