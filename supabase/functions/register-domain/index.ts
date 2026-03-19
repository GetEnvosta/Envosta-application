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
            <item key="custom_nameservers">0</item>
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

  try {
    const userSb = supabaseForUser(req);
    const { data: { user }, error: authErr } = await userSb.auth.getUser();
    if (authErr || !user) return error("Unauthorized", 401);

    const { action, domainName, serviceId, years } = await req.json();
    if (!domainName) return error("domainName is required");

    const sb = supabaseAdmin();

    // CHECK availability
    if (action === "check") {
      const xml = buildLookupXml(domainName);
      const responseXml = await opensrsRequest(xml);
      const parsed = parseResponse(responseXml);
      const ms = Date.now() - t0;

      console.log("OpenSRS lookup:", parsed.responseCode, parsed.responseText);

      const available = parsed.responseCode === "210";
      await log({ userId: user.id, action: "domain.check", message: `${domainName}: ${available ? "available" : "taken"}`, ms });
      return json({ domainName, available });
    }

    // REGISTER
    const parts = domainName.split(".");
    const tld = parts[parts.length - 1];

    const { data: domain, error: domErr } = await sb.from("domains").insert({
      user_id: user.id, service_id: serviceId ?? null, domain_name: domainName,
      tld, status: "pending_dns", registrar: "opensrs",
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
        status: "failed", metadata: { error: parsed.responseText, code: parsed.responseCode },
      }).eq("id", domain.id);
      await log({ userId: user.id, level: "error", action: "domain.register.failed", message: `${domainName}: ${parsed.responseText}`, ms });
      return error(`Registration failed: ${parsed.responseText}`, 502);
    }

    await sb.from("domains").update({
      status: "registered",
      registration_date: new Date().toISOString(),
      expiry_date: new Date(Date.now() + (years ?? 1) * 365.25 * 86400000).toISOString(),
      metadata: { responseCode: parsed.responseCode, responseText: parsed.responseText },
    }).eq("id", domain.id);

    await log({ userId: user.id, serviceId, action: "domain.register.success", message: domainName, ms });
    return json({ domainId: domain.id, domainName, status: "registered" });

  } catch (e) {
    console.error("Domain error:", e);
    return error(String(e), 500);
  }
});
