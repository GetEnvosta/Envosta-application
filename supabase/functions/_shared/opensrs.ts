/**
 * Shared OpenSRS XML API utilities.
 *
 * SET_DNS_ZONE reference: https://domains.opensrs.guide/docs/set_dns_zone-
 * Records must be a dt_assoc keyed by record type (A, AAAA, CNAME, MX, TXT, SRV),
 * each containing a dt_array of individual records with type-specific fields.
 *
 * SET_DNS_ZONE REPLACES the entire zone — there is no partial update.
 * To add a single record, GET_DNS_ZONE first, merge, then SET_DNS_ZONE.
 */

const OPENSRS_USERNAME = Deno.env.get("OPENSRS_USERNAME") ?? "";
const OPENSRS_API_KEY = Deno.env.get("OPENSRS_API_KEY") ?? "";
const OPENSRS_HOST = Deno.env.get("OPENSRS_HOST") ?? "horizon.opensrs.net";
const OPENSRS_PROXY_URL = Deno.env.get("OPENSRS_PROXY_URL") ?? ""; // Optional: route through static IP proxy

// ─── Crypto ───────────────────────────────────────────────

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

// ─── HTTP ─────────────────────────────────────────────────

export async function opensrsRequest(xml: string): Promise<string> {
  const signature = await opensrsSignature(xml);

  // If an OpenSRS proxy is configured, route through it (for IP whitelisting)
  if (OPENSRS_PROXY_URL) {
    const PROXY_SECRET = Deno.env.get("OPENSRS_PROXY_SECRET") ?? "";
    const res = await fetch(OPENSRS_PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
        "X-Username": OPENSRS_USERNAME,
        "X-Signature": signature,
        "X-Proxy-Secret": PROXY_SECRET,
        "X-Target-Host": `https://${OPENSRS_HOST}:55443`,
      },
      body: xml,
    });
    if (!res.ok) throw new Error(`OpenSRS proxy HTTP ${res.status}: ${await res.text()}`);
    return res.text();
  }

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

export function parseResponse(xml: string) {
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

// ─── DNS record types ─────────────────────────────────────

export interface DnsRecord {
  type: "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "SRV";
  subdomain: string;
  ip_address?: string;     // A
  ipv6_address?: string;   // AAAA
  hostname?: string;       // CNAME, MX, SRV
  text?: string;           // TXT
  priority?: number;       // MX, SRV
  weight?: number;         // SRV
  port?: number;           // SRV
}

/**
 * Build the correct SET_DNS_ZONE XML for OpenSRS.
 *
 * Per the docs, records must be a dt_assoc grouped by type:
 *   <item key="records"><dt_assoc>
 *     <item key="A"><dt_array>
 *       <item key="0"><dt_assoc><item key="subdomain">...</item><item key="ip_address">...</item></dt_assoc></item>
 *     </dt_array></item>
 *     ...
 *   </dt_assoc></item>
 */
export function buildSetDnsZoneXml(domain: string, records: DnsRecord[]): string {
  // Group records by type
  const grouped: Record<string, DnsRecord[]> = {};
  for (const r of records) {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push(r);
  }

  // Build XML for each type group
  const typeItems = Object.entries(grouped).map(([type, recs]) => {
    const recItems = recs.map((r, i) => {
      let fields = `<item key="subdomain">${xmlEscape(r.subdomain)}</item>`;

      switch (type) {
        case "A":
          fields += `<item key="ip_address">${xmlEscape(r.ip_address ?? "")}</item>`;
          break;
        case "AAAA":
          fields += `<item key="ipv6_address">${xmlEscape(r.ipv6_address ?? "")}</item>`;
          break;
        case "CNAME":
          fields += `<item key="hostname">${xmlEscape(r.hostname ?? "")}</item>`;
          break;
        case "MX":
          fields += `<item key="hostname">${xmlEscape(r.hostname ?? "")}</item>`;
          fields += `<item key="priority">${r.priority ?? 10}</item>`;
          break;
        case "TXT":
          fields += `<item key="text">${xmlEscape(r.text ?? "")}</item>`;
          break;
        case "SRV":
          fields += `<item key="hostname">${xmlEscape(r.hostname ?? "")}</item>`;
          fields += `<item key="priority">${r.priority ?? 10}</item>`;
          fields += `<item key="weight">${r.weight ?? 1}</item>`;
          fields += `<item key="port">${r.port ?? 443}</item>`;
          break;
      }

      return `<item key="${i}"><dt_assoc>${fields}</dt_assoc></item>`;
    }).join("");

    return `<item key="${type}"><dt_array>${recItems}</dt_array></item>`;
  }).join("");

  return `<?xml version='1.0' encoding="UTF-8" standalone="no" ?>
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
            <item key="domain">${xmlEscape(domain)}</item>
            <item key="records">
              <dt_assoc>${typeItems}</dt_assoc>
            </item>
          </dt_assoc>
        </item>
      </dt_assoc>
    </data_block>
  </body>
</OPS_envelope>`;
}

/**
 * Build GET_DNS_ZONE XML to retrieve all current records.
 */
export function buildGetDnsZoneXml(domain: string): string {
  return `<?xml version='1.0' encoding="UTF-8" standalone="no" ?>
<!DOCTYPE OPS_envelope SYSTEM "ops.dtd">
<OPS_envelope>
  <header><version>0.9</version></header>
  <body>
    <data_block>
      <dt_assoc>
        <item key="protocol">XCP</item>
        <item key="object">DOMAIN</item>
        <item key="action">GET_DNS_ZONE</item>
        <item key="attributes">
          <dt_assoc>
            <item key="domain">${xmlEscape(domain)}</item>
          </dt_assoc>
        </item>
      </dt_assoc>
    </data_block>
  </body>
</OPS_envelope>`;
}

/**
 * Build the standard 6-record set for a WordPress site hosted on wp.cloud.
 */
export function buildWpCloudDnsRecords(siteIp: string): DnsRecord[] {
  return [
    { type: "A", subdomain: "", ip_address: siteIp },
    { type: "A", subdomain: "www", ip_address: siteIp },
    { type: "TXT", subdomain: "", text: "v=spf1 include:_spf.wpcloud.com ~all" },
    { type: "CNAME", subdomain: "wpcloud1._domainkey", hostname: "wpcloud1._domainkey.wpcloud.com" },
    { type: "CNAME", subdomain: "wpcloud2._domainkey", hostname: "wpcloud2._domainkey.wpcloud.com" },
    { type: "TXT", subdomain: "_dmarc", text: "v=DMARC1; p=none;" },
  ];
}

/**
 * Ensure a DNS zone exists, then set records.
 * CREATE_DNS_ZONE is required before SET_DNS_ZONE can be used.
 * If the zone already exists, CREATE returns an error which we ignore.
 */
export async function setDnsZone(domain: string, records: DnsRecord[]): Promise<{
  isSuccess: boolean;
  responseCode: string;
  responseText: string;
}> {
  // Step 1: Ensure DNS zone exists (idempotent — ignore "already exists" errors)
  const createXml = `<?xml version='1.0' encoding="UTF-8" standalone="no" ?>
<!DOCTYPE OPS_envelope SYSTEM "ops.dtd">
<OPS_envelope>
  <header><version>0.9</version></header>
  <body>
    <data_block>
      <dt_assoc>
        <item key="protocol">XCP</item>
        <item key="object">DOMAIN</item>
        <item key="action">CREATE_DNS_ZONE</item>
        <item key="attributes">
          <dt_assoc>
            <item key="domain">${xmlEscape(domain)}</item>
          </dt_assoc>
        </item>
      </dt_assoc>
    </data_block>
  </body>
</OPS_envelope>`;
  try {
    const createRes = await opensrsRequest(createXml);
    const createParsed = parseResponse(createRes);
    console.log("CREATE_DNS_ZONE:", domain, createParsed.responseCode, createParsed.responseText);
  } catch (e) {
    console.log("CREATE_DNS_ZONE non-fatal:", e);
  }

  // Step 2: Set the records
  const xml = buildSetDnsZoneXml(domain, records);
  const responseXml = await opensrsRequest(xml);
  return parseResponse(responseXml);
}

// ─── Nameserver host object management ───────────────────
// Custom/branded nameservers (e.g. ns1.envosta.com) must be registered
// as host objects at the registry before they can be assigned to domains.
// Ref: https://domains.opensrs.guide/docs/create_nameserver

/**
 * Create a nameserver host object (glue record) at the registry.
 * Required for branded nameservers that are subdomains of your own domain.
 */
export async function createNameserver(
  parentDomain: string,
  nameserver: string,
  ipAddress: string,
): Promise<{ isSuccess: boolean; responseCode: string; responseText: string }> {
  const xml = `<?xml version='1.0' encoding="UTF-8" standalone="no" ?>
<!DOCTYPE OPS_envelope SYSTEM "ops.dtd">
<OPS_envelope>
  <header><version>0.9</version></header>
  <body>
    <data_block>
      <dt_assoc>
        <item key="protocol">XCP</item>
        <item key="action">create</item>
        <item key="object">nameserver</item>
        <item key="domain">${xmlEscape(parentDomain)}</item>
        <item key="attributes">
          <dt_assoc>
            <item key="name">${xmlEscape(nameserver)}</item>
            <item key="ipaddress">${xmlEscape(ipAddress)}</item>
          </dt_assoc>
        </item>
      </dt_assoc>
    </data_block>
  </body>
</OPS_envelope>`;
  const responseXml = await opensrsRequest(xml);
  return parseResponse(responseXml);
}

/**
 * Delete a nameserver host object from the registry.
 */
export async function deleteNameserver(
  parentDomain: string,
  nameserver: string,
): Promise<{ isSuccess: boolean; responseCode: string; responseText: string }> {
  const xml = `<?xml version='1.0' encoding="UTF-8" standalone="no" ?>
<!DOCTYPE OPS_envelope SYSTEM "ops.dtd">
<OPS_envelope>
  <header><version>0.9</version></header>
  <body>
    <data_block>
      <dt_assoc>
        <item key="protocol">XCP</item>
        <item key="action">delete</item>
        <item key="object">nameserver</item>
        <item key="domain">${xmlEscape(parentDomain)}</item>
        <item key="attributes">
          <dt_assoc>
            <item key="name">${xmlEscape(nameserver)}</item>
          </dt_assoc>
        </item>
      </dt_assoc>
    </data_block>
  </body>
</OPS_envelope>`;
  const responseXml = await opensrsRequest(xml);
  return parseResponse(responseXml);
}

// ─── External nameserver registry ────────────────────────
// External NS (e.g. Cloudflare) must be registered at the TLD registry
// before they can be assigned to a domain via ADVANCED_UPDATE_NAMESERVERS.
// Ref: https://domains.opensrs.guide/docs/registry_add_ns

/**
 * Register an external nameserver with the TLD registries.
 * This is idempotent — if already registered, the call succeeds or returns a non-fatal error.
 */
export async function registryAddNs(nameserver: string): Promise<{
  isSuccess: boolean;
  responseCode: string;
  responseText: string;
}> {
  // Extract TLD from the nameserver's parent domain
  const parts = nameserver.split(".");
  const tld = "." + parts[parts.length - 1];

  const xml = `<?xml version='1.0' encoding="UTF-8" standalone="no" ?>
<!DOCTYPE OPS_envelope SYSTEM "ops.dtd">
<OPS_envelope>
  <header><version>0.9</version></header>
  <body>
    <data_block>
      <dt_assoc>
        <item key="protocol">XCP</item>
        <item key="action">registry_add_ns</item>
        <item key="object">nameserver</item>
        <item key="attributes">
          <dt_assoc>
            <item key="fqdn">${xmlEscape(nameserver)}</item>
            <item key="tld">${xmlEscape(tld)}</item>
            <item key="all">1</item>
          </dt_assoc>
        </item>
      </dt_assoc>
    </data_block>
  </body>
</OPS_envelope>`;
  const responseXml = await opensrsRequest(xml);
  return parseResponse(responseXml);
}

// ─── Domain lock & transfer management ───────────────────
// Domains are locked by default (clientUpdateProhibited + clientTransferProhibited).
// Must unlock before updating nameservers, then re-lock afterward.
// Ref: https://domains.opensrs.guide/docs/modify-domain

/**
 * Unlock or re-lock a domain at the registry level.
 * lock_state 0 = unlock (removes clientUpdateProhibited + clientTransferProhibited)
 * lock_state 1 = lock (adds both back)
 */
export async function setDomainLock(domain: string, lock: boolean): Promise<{
  isSuccess: boolean;
  responseCode: string;
  responseText: string;
}> {
  const xml = `<?xml version='1.0' encoding="UTF-8" standalone="no" ?>
<!DOCTYPE OPS_envelope SYSTEM "ops.dtd">
<OPS_envelope>
  <header><version>0.9</version></header>
  <body>
    <data_block>
      <dt_assoc>
        <item key="protocol">XCP</item>
        <item key="action">modify</item>
        <item key="object">domain</item>
        <item key="attributes">
          <dt_assoc>
            <item key="affect_domains">0</item>
            <item key="data">status</item>
            <item key="domain">${xmlEscape(domain)}</item>
            <item key="lock_state">${lock ? 1 : 0}</item>
          </dt_assoc>
        </item>
      </dt_assoc>
    </data_block>
  </body>
</OPS_envelope>`;
  const responseXml = await opensrsRequest(xml);
  return parseResponse(responseXml);
}

/**
 * Get the current lock status of a domain.
 * Ref: https://domains.opensrs.guide/docs/get-domain (type=status)
 */
export async function getDomainLockStatus(domain: string): Promise<{
  isSuccess: boolean;
  lockState: boolean;
  responseText: string;
}> {
  const xml = `<?xml version='1.0' encoding="UTF-8" standalone="no" ?>
<!DOCTYPE OPS_envelope SYSTEM "ops.dtd">
<OPS_envelope>
  <header><version>0.9</version></header>
  <body>
    <data_block>
      <dt_assoc>
        <item key="protocol">XCP</item>
        <item key="action">get</item>
        <item key="object">domain</item>
        <item key="domain">${xmlEscape(domain)}</item>
        <item key="attributes">
          <dt_assoc>
            <item key="type">status</item>
          </dt_assoc>
        </item>
      </dt_assoc>
    </data_block>
  </body>
</OPS_envelope>`;
  const responseXml = await opensrsRequest(xml);
  const parsed = parseResponse(responseXml);
  // lock_state is in the attributes of the response
  const lockMatch = responseXml.match(/<item key="lock_state">(.*?)<\/item>/);
  return {
    isSuccess: parsed.isSuccess,
    lockState: lockMatch ? lockMatch[1].trim() === "1" : true, // default locked
    responseText: parsed.responseText,
  };
}

/**
 * Get the EPP auth code for a domain (for transfer out).
 * Returns the code directly in the response.
 * Ref: https://domains.opensrs.guide/docs/get-domain (type=domain_auth_info)
 */
export async function getDomainAuthCode(domain: string): Promise<{
  isSuccess: boolean;
  authCode: string;
  responseText: string;
}> {
  const xml = `<?xml version='1.0' encoding="UTF-8" standalone="no" ?>
<!DOCTYPE OPS_envelope SYSTEM "ops.dtd">
<OPS_envelope>
  <header><version>0.9</version></header>
  <body>
    <data_block>
      <dt_assoc>
        <item key="protocol">XCP</item>
        <item key="action">get</item>
        <item key="object">domain</item>
        <item key="domain">${xmlEscape(domain)}</item>
        <item key="attributes">
          <dt_assoc>
            <item key="type">domain_auth_info</item>
          </dt_assoc>
        </item>
      </dt_assoc>
    </data_block>
  </body>
</OPS_envelope>`;
  const responseXml = await opensrsRequest(xml);
  const parsed = parseResponse(responseXml);
  const authMatch = responseXml.match(/<item key="domain_auth_info">(.*?)<\/item>/);
  return {
    isSuccess: parsed.isSuccess,
    authCode: authMatch ? authMatch[1].trim() : "",
    responseText: parsed.responseText,
  };
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
