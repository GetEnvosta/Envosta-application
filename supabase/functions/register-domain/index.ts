import { supabaseAdmin, supabaseForUser, cors, json, error, log } from "../_shared/deps.ts";

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

function buildRegisterXml(domain: string, years: number, email: string): string {
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
            <item key="contact_set">
              <dt_assoc>
                <item key="owner">
                  <dt_assoc>
                    <item key="first_name">Domain</item>
                    <item key="last_name">Owner</item>
                    <item key="org_name">Envosta</item>
                    <item key="address1">123 Main St</item>
                    <item key="city">Calgary</item>
                    <item key="state">AB</item>
                    <item key="postal_code">T2P0A1</item>
                    <item key="country">CA</item>
                    <item key="phone">+1.4035551234</item>
                    <item key="email">${email}</item>
                  </dt_assoc>
                </item>
                <item key="admin">
                  <dt_assoc>
                    <item key="first_name">Domain</item>
                    <item key="last_name">Owner</item>
                    <item key="org_name">Envosta</item>
                    <item key="address1">123 Main St</item>
                    <item key="city">Calgary</item>
                    <item key="state">AB</item>
                    <item key="postal_code">T2P0A1</item>
                    <item key="country">CA</item>
                    <item key="phone">+1.4035551234</item>
                    <item key="email">${email}</item>
                  </dt_assoc>
                </item>
                <item key="billing">
                  <dt_assoc>
                    <item key="first_name">Domain</item>
                    <item key="last_name">Owner</item>
                    <item key="org_name">Envosta</item>
                    <item key="address1">123 Main St</item>
                    <item key="city">Calgary</item>
                    <item key="state">AB</item>
                    <item key="postal_code">T2P0A1</item>
                    <item key="country">CA</item>
                    <item key="phone">+1.4035551234</item>
                    <item key="email">${email}</item>
                  </dt_assoc>
                </item>
                <item key="tech">
                  <dt_assoc>
                    <item key="first_name">Domain</item>
                    <item key="last_name">Owner</item>
                    <item key="org_name">Envosta</item>
                    <item key="address1">123 Main St</item>
                    <item key="city">Calgary</item>
                    <item key="state">AB</item>
                    <item key="postal_code">T2P0A1</item>
                    <item key="country">CA</item>
                    <item key="phone">+1.4035551234</item>
                    <item key="email">${email}</item>
                  </dt_assoc>
                </item>
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
    const { action, domainName, serviceId, years, nameservers } = await req.json();
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

    // All other actions require auth
    const userSb = supabaseForUser(req);
    const { data: { user }, error: authErr } = await userSb.auth.getUser();
    if (authErr || !user) return error("Unauthorized", 401);

    const sb = supabaseAdmin();

    // REGISTER
    const parts = domainName.split(".");
    const tld = parts[parts.length - 1];

    const agreementAcceptance = {
      accepted_at: new Date().toISOString(),
      ip_address: registrantIp,
      user_agent: registrantUa,
      user_id: user.id,
      user_email: user.email,
      agreement_version: "2026-03-01",
      agreement_url: "https://envosta.com/legal/terms#domain-registration",
    };

    const { data: domain, error: domErr } = await sb.from("domains").insert({
      user_id: user.id, service_id: serviceId ?? null, domain_name: domainName,
      tld, status: "pending_dns", registrar: "opensrs",
      metadata: { agreement_acceptance: agreementAcceptance },
    }).select().single();
    if (domErr) return error(domErr.message, 500);

    const regXml = buildRegisterXml(domainName, years ?? 1, user.email ?? "domains@envosta.com");
    const responseXml = await opensrsRequest(regXml);
    const parsed = parseResponse(responseXml);
    const ms = Date.now() - t0;

    console.log("OpenSRS register raw:", responseXml);
    console.log("OpenSRS register parsed:", parsed.responseCode, parsed.responseText);

    if (!parsed.isSuccess) {
      await sb.from("domains").update({
        status: "failed", metadata: { agreement_acceptance: agreementAcceptance, error: parsed.responseText, code: parsed.responseCode },
      }).eq("id", domain.id);
      await log({ userId: user.id, level: "error", action: "domain.register.failed", message: `${domainName}: ${parsed.responseText}`, ms });
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

    await log({ userId: user.id, serviceId, action: "domain.register.success", message: domainName, ip: registrantIp, ua: registrantUa, ms });
    return json({ domainId: domain.id, domainName, status: "registered" });
    }

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
        await log({ userId: user.id, level: "error", action: "domain.nameservers.failed", message: `${domainName}: ${parsed.responseText}`, ms });
        return error(`Nameserver update failed: ${parsed.responseText}`, 502);
      }

      // Update nameservers in our database
      await sb.from("domains")
        .update({ nameservers: nameservers })
        .eq("user_id", user.id)
        .eq("domain_name", domainName);

      await log({ userId: user.id, action: "domain.nameservers.updated", message: `${domainName}: ${nameservers.join(", ")}`, ms });
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
        await log({ userId: user.id, level: "error", action: "domain.dns.setup.failed", message: `${domainName}: ${parsed.responseText}`, ms });
        return error(`DNS setup failed: ${parsed.responseText}`, 502);
      }

      // Update domain status
      await sb.from("domains")
        .update({
          status: "registered",
          dns_records: records,
          metadata: { dns_setup: "complete", site_ip: siteIp, dns_setup_at: new Date().toISOString() },
        })
        .eq("user_id", user.id)
        .eq("domain_name", domainName);

      await log({ userId: user.id, action: "domain.dns.setup.complete", message: `${domainName} → ${siteIp} (${records.length} records)`, ms });
      return json({ domainName, siteIp, records: records.length, success: true });
    }

    return error(`Unknown action: ${action}`, 400);

  } catch (e) {
    console.error("Domain error:", e);
    return error(String(e), 500);
  }
});
