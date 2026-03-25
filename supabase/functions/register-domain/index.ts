import { supabaseAdmin, supabaseForUser, cors, json, error, log } from "../_shared/deps.ts";
import { sendEmail, domainRegisteredEmail } from "../_shared/email.ts";

const OPENSRS_USERNAME = Deno.env.get("OPENSRS_USERNAME") ?? "";
const OPENSRS_API_KEY = Deno.env.get("OPENSRS_API_KEY") ?? "";
const OPENSRS_HOST = Deno.env.get("OPENSRS_HOST") ?? "horizon.opensrs.net";

async function md5(input: string): Promise<string> {
  // Deno's crypto.subtle doesn't support MD5, so we use the Deno std library
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

function buildRegisterXml(domain: string, years: number, contact: ContactInfo): string {
  const c = (role: string) => `<item key="${role}">
                  <dt_assoc>
                    <item key="first_name">${contact.first_name}</item>
                    <item key="last_name">${contact.last_name}</item>
                    <item key="org_name">${contact.org_name}</item>
                    <item key="address1">${contact.address1}</item>
                    <item key="city">${contact.city}</item>
                    <item key="state">${contact.state}</item>
                    <item key="postal_code">${contact.postal_code}</item>
                    <item key="country">${contact.country}</item>
                    <item key="phone">${contact.phone}</item>
                    <item key="email">${contact.email}</item>
                  </dt_assoc>
                </item>`;

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
                <item key="0"><dt_assoc><item key="name">ns1.opensrs.net</item><item key="sortorder">1</item></dt_assoc></item>
                <item key="1"><dt_assoc><item key="name">ns2.opensrs.net</item><item key="sortorder">2</item></dt_assoc></item>
              </dt_array>
            </item>
            <item key="f_whois_privacy">1</item>
            <item key="auto_renew">1</item>
            <item key="contact_set">
              <dt_assoc>
                ${c("owner")}
                ${c("admin")}
                ${c("billing")}
                ${c("tech")}
              </dt_assoc>
            </item>
          </dt_assoc>
        </item>
      </dt_assoc>
    </data_block>
  </body>
</OPS_envelope>`;
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const t0 = Date.now();

  // Capture registrant IP and user agent for agreement acceptance proof
  const registrantIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("cf-connecting-ip")
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
  const registrantUa = req.headers.get("user-agent") ?? "unknown";

  try {
    const body = await req.json();
    const { action, domainName, serviceId, years, nameservers, userId: bodyUserId, siteIp } = body;
    if (!domainName) return error("domainName is required");

    // CHECK availability — no auth required (public domain search)
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

    // All other actions require auth — either a user session or service role with userId in body
    let userId: string;
    let userEmail: string;

    const userSb = supabaseForUser(req);
    const { data: { user } } = await userSb.auth.getUser();

    if (user) {
      userId = user.id;
      userEmail = user.email ?? "domains@envosta.com";
    } else if (bodyUserId) {
      // Service role call from webhook — look up user
      const sb2 = supabaseAdmin();
      const { data: profile } = await sb2.from("users").select("id, email").eq("id", bodyUserId).maybeSingle();
      if (!profile) return error("User not found", 404);
      userId = profile.id;
      userEmail = profile.email ?? "domains@envosta.com";
    } else {
      return error("Unauthorized", 401);
    }

    const sb = supabaseAdmin();

    // REGISTER
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
      user_id: userId, service_id: serviceId ?? null, domain_name: domainName,
      tld, status: "pending_dns", registrar: "opensrs",
      metadata: { agreement_acceptance: agreementAcceptance },
    }).select().single();
    if (domErr) return error(domErr.message, 500);

    // Get user profile for domain contact info
    const { data: profile } = await sb.from("users")
      .select("full_name, email, phone, company_name, metadata")
      .eq("id", userId).maybeSingle();

    const nameParts = (profile?.full_name ?? "Domain Owner").split(" ");
    const contact: ContactInfo = {
      first_name: nameParts[0] ?? "Domain",
      last_name: nameParts.slice(1).join(" ") || "Owner",
      org_name: profile?.company_name ?? "N/A",
      email: profile?.email ?? userEmail ?? "domains@envosta.com",
      phone: profile?.phone ?? "+1.0000000000",
      address1: (profile?.metadata as any)?.address ?? "N/A",
      city: (profile?.metadata as any)?.city ?? "Calgary",
      state: (profile?.metadata as any)?.state ?? "AB",
      postal_code: (profile?.metadata as any)?.postal_code ?? "T2P0A1",
      country: (profile?.metadata as any)?.country ?? "CA",
    };

    const regXml = buildRegisterXml(domainName, years ?? 1, contact);
    const responseXml = await opensrsRequest(regXml);
    const parsed = parseResponse(responseXml);
    const ms = Date.now() - t0;

    console.log("OpenSRS register raw:", responseXml);
    console.log("OpenSRS register parsed:", parsed.responseCode, parsed.responseText);

    if (!parsed.isSuccess) {
      await sb.from("domains").update({
        status: "failed", metadata: { agreement_acceptance: agreementAcceptance, error: parsed.responseText, code: parsed.responseCode },
      }).eq("id", domain.id);
      await log({ userId: userId, level: "error", action: "domain.register.failed", message: `${domainName}: ${parsed.responseText}`, ms });
      return error(`Registration failed: ${parsed.responseText}`, 502);
    }

    await sb.from("domains").update({
      status: "registered",
      registration_date: new Date().toISOString(),
      expiry_date: new Date(Date.now() + (years ?? 1) * 365.25 * 86400000).toISOString(),
      metadata: {
        agreement_acceptance: agreementAcceptance,
        responseCode: parsed.responseCode,
        responseText: parsed.responseText,
      },
    }).eq("id", domain.id);

    await log({ userId: userId, serviceId, action: "domain.register.success", message: domainName, ip: registrantIp, ua: registrantUa, ms });

    // Send domain registered email
    try {
      const email = domainRegisteredEmail(contact.first_name, domainName);
      await sendEmail({ to: contact.email, ...email });
    } catch { /* non-fatal */ }

    return json({ domainId: domain.id, domainName, status: "registered" });

    // UPDATE NAMESERVERS
    if (action === "update-nameservers") {
      if (!nameservers || !Array.isArray(nameservers) || nameservers.length === 0) {
        return error("nameservers array is required");
      }
      if (nameservers.length > 6) return error("Maximum 6 nameservers allowed");

      // Build nameserver update XML
      const nsItems = nameservers.map((ns: string, i: number) =>
        `<item key="name">${ns}</item><item key="sortorder">${i + 1}</item>`
      ).join("");

      const nsListItems = nameservers.map((_: string, i: number) =>
        `<item key="${i}"><dt_assoc><item key="name">${nameservers[i]}</item><item key="sortorder">${i + 1}</item></dt_assoc></item>`
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
      console.log("OpenSRS raw:", responseXml.substring(0, 500));

      if (!parsed.isSuccess) {
        await log({ userId: userId, level: "error", action: "domain.nameservers.failed", message: `${domainName}: ${parsed.responseText}`, ms });
        return error(`Nameserver update failed: ${parsed.responseText}`, 502);
      }

      // Update nameservers in our database
      await sb.from("domains")
        .update({ nameservers: nameservers })
        .eq("user_id", userId)
        .eq("domain_name", domainName);

      await log({ userId: userId, action: "domain.nameservers.updated", message: `${domainName}: ${nameservers.join(", ")}`, ms });
      return json({ domainName, nameservers, success: true });
    }

    // SETUP DNS — auto-configure wp.cloud DNS records after provisioning
    if (action === "setup-dns") {
      const { siteIp } = await req.json().catch(() => ({}));
      if (!siteIp) return error("siteIp is required");

      // OpenSRS DNS zone records for wp.cloud hosting
      const records = [
        // A records — point root and www to wp.cloud site IP
        { type: "A", subdomain: "", ip_address: siteIp, ttl: 3600 },
        { type: "A", subdomain: "www", ip_address: siteIp, ttl: 3600 },
        // SPF — authorize wp.cloud to send email on behalf of this domain
        { type: "TXT", subdomain: "", text: "v=spf1 include:_spf.wpcloud.com ~all", ttl: 3600 },
        // DKIM — wp.cloud email signing
        { type: "CNAME", subdomain: "wpcloud1._domainkey", hostname: "wpcloud1._domainkey.wpcloud.com", ttl: 3600 },
        { type: "CNAME", subdomain: "wpcloud2._domainkey", hostname: "wpcloud2._domainkey.wpcloud.com", ttl: 3600 },
        // DMARC — basic policy
        { type: "TXT", subdomain: "_dmarc", text: "v=DMARC1; p=none;", ttl: 3600 },
      ];

      // Build OpenSRS set_dns_zone XML
      const recordItems = records.map((r, i) => {
        let valueItems = `<item key="type">${r.type}</item><item key="subdomain">${r.subdomain}</item><item key="ttl">${r.ttl}</item>`;
        if (r.type === "A") valueItems += `<item key="ip_address">${r.ip_address}</item>`;
        if (r.type === "CNAME") valueItems += `<item key="hostname">${r.hostname}</item>`;
        if (r.type === "TXT") valueItems += `<item key="text">${r.text}</item>`;
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
        await log({ userId: userId, level: "error", action: "domain.dns.setup.failed", message: `${domainName}: ${parsed.responseText}`, ms });
        return error(`DNS setup failed: ${parsed.responseText}`, 502);
      }

      // Update domain status
      await sb.from("domains")
        .update({
          status: "registered",
          dns_records: records,
          metadata: { dns_setup: "complete", site_ip: siteIp, dns_setup_at: new Date().toISOString() },
        })
        .eq("user_id", userId)
        .eq("domain_name", domainName);

      await log({ userId: userId, action: "domain.dns.setup.complete", message: `${domainName} → ${siteIp} (${records.length} records)`, ms });
      return json({ domainName, siteIp, records: records.length, success: true });
    }

    // TOGGLE AUTO-RENEW at OpenSRS
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
        <item key="object">DOMAIN</item>
        <item key="action">MODIFY</item>
        <item key="attributes">
          <dt_assoc>
            <item key="domain">${domainName}</item>
            <item key="data">
              <dt_assoc>
                <item key="auto_renew">${autoRenew ? 1 : 0}</item>
              </dt_assoc>
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

      console.log("OpenSRS auto-renew toggle:", parsed.responseCode, parsed.responseText);

      if (!parsed.isSuccess) {
        await log({ userId, level: "error", action: "domain.auto_renew.failed", message: `${domainName}: ${parsed.responseText}`, ms });
        return error(`Auto-renew update failed: ${parsed.responseText}`, 502);
      }

      // Update in database
      await sb.from("domains")
        .update({ auto_renew: autoRenew })
        .eq("user_id", userId)
        .eq("domain_name", domainName);

      await log({ userId, action: "domain.auto_renew.updated", message: `${domainName}: ${autoRenew ? "enabled" : "disabled"}`, ms });
      return json({ domainName, autoRenew, success: true });
    }

    return error(`Unknown action: ${action}`, 400);

  } catch (e) {
    console.error("Domain error:", e);
    return error(String(e), 500);
  }
});
