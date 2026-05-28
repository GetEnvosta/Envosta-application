/**
 * OpenSRS XML-over-HTTPS API client.
 *
 * Called from Vercel API routes. Vercel's static IPs (184.72.2.216,
 * 54.241.78.174) are whitelisted in the OpenSRS Reseller Control
 * Panel so direct HTTPS calls work without any proxy layer.
 *
 * Auth: every request body is XML signed with
 *   sig = md5(md5(xml + apiKey) + apiKey)
 * delivered via the `X-Signature` header along with `X-Username`.
 * Node's built-in `crypto` is used for MD5.
 *
 * Endpoint: `https://${OPENSRS_HOST}:55443`. Defaults to
 * `horizon.opensrs.net` (sandbox); production resellers should set
 * `OPENSRS_HOST=rr-n1-tor.opensrs.net`.
 *
 * Every request is wrapped in `withApiCallLogging` so the `api_calls`
 * table gets a row with timing, status, and the parsed response.
 * Non-success responses (is_success != "1") throw `OpenSrsError`.
 */
import { createHash } from 'crypto';
import { withApiCallLogging } from '../api-call-logger';

const DEFAULT_OPENSRS_HOST = 'horizon.opensrs.net';

// ─── Public types ────────────────────────────────────────────

export interface OpenSrsContacts {
  owner: OpenSrsContact;
  admin?: OpenSrsContact;
  billing?: OpenSrsContact;
  tech?: OpenSrsContact;
}

export interface OpenSrsContact {
  first_name: string;
  last_name: string;
  org_name?: string;
  email: string;
  phone: string;
  address1: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface OpenSrsDomainInfo {
  domain: string;
  status?: string;
  expiredate?: string;
  auto_renew?: boolean;
  lock_state?: boolean;
  nameservers?: string[];
  raw?: unknown;
}

/**
 * Full domain detail merged from an OpenSRS `get` type=all_info call
 * and a `get` type=status call. This is what the reconcile-opensrs
 * cron consumes to populate the opensrs_domains + opensrs_contacts
 * mirrors.
 *
 * Note: `domain_auth_info` (the EPP transfer code) is deliberately
 * NEVER requested or surfaced — it's a transfer secret.
 */
export interface OpenSrsDomainDetail {
  domain: string;
  /** OpenSRS lifecycle status (e.g. registered / expired). */
  status?: string;
  expiredate?: string;
  auto_renew?: boolean;
  let_expire?: boolean;
  /** Registrar lock — true when transfers are blocked. */
  lock_state?: boolean;
  /** WHOIS-privacy state string (e.g. enabled / disabled). */
  whois_privacy_state?: string;
  transfer_away_in_progress?: boolean;
  sponsoring_rsp?: boolean;
  /** Registry-side dates (distinct from OpenSRS expiredate). */
  registry_createdate?: string;
  registry_expiredate?: string;
  registry_updateddate?: string;
  registry_transferreddate?: string;
  gdpr_consent_status?: string;
  nameservers?: string[];
  /** All four contact roles, where present in the all_info payload. */
  contact_set?: OpenSrsContacts;
  /** Raw text of both upstream responses for debugging / full mirror. */
  raw?: { all_info?: string; status?: string };
}

export interface DnsRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'SRV';
  subdomain: string;
  ip_address?: string;
  ipv6_address?: string;
  hostname?: string;
  text?: string;
  priority?: number;
  weight?: number;
  port?: number;
  ttl?: number;
}

/**
 * Build the standard wp.cloud DNS zone for a site (A apex, A www,
 * SPF, two CNAMEs for DKIM, and a DMARC TXT).
 */
export function buildWpCloudDnsRecords(siteIp: string): DnsRecord[] {
  return [
    { type: 'A', subdomain: '', ip_address: siteIp },
    { type: 'A', subdomain: 'www', ip_address: siteIp },
    { type: 'TXT', subdomain: '', text: 'v=spf1 include:_spf.wpcloud.com ~all' },
    { type: 'CNAME', subdomain: 'wpcloud1._domainkey', hostname: 'wpcloud1._domainkey.wpcloud.com' },
    { type: 'CNAME', subdomain: 'wpcloud2._domainkey', hostname: 'wpcloud2._domainkey.wpcloud.com' },
    { type: 'TXT', subdomain: '_dmarc', text: 'v=DMARC1; p=none;' },
  ];
}

/**
 * Error thrown when OpenSRS returns a non-success response, or when
 * the HTTP layer fails. Carries the parsed response (if any),
 * OpenSRS response code, and the action that was attempted.
 */
export class OpenSrsError extends Error {
  public readonly status: number;
  public readonly body: unknown;
  public readonly action: string;
  public readonly responseCode?: string;

  constructor(
    message: string,
    status: number,
    body: unknown,
    action: string,
    responseCode?: string,
  ) {
    super(message);
    this.name = 'OpenSrsError';
    this.status = status;
    this.body = body;
    this.action = action;
    this.responseCode = responseCode;
  }
}

// ─── Client surface ─────────────────────────────────────────

export interface OpenSrsClient {
  /**
   * Register a new domain (action `SW_REGISTER`, reg_type=new).
   */
  registerDomain(params: {
    domain: string;
    years: number;
    contacts: OpenSrsContacts;
  }): Promise<{ order_id: string; status: string }>;

  /**
   * Renew an existing domain (action `SW_REGISTER`, reg_type=renew).
   * (OpenSRS uses SW_REGISTER for both new and renewal flows.)
   */
  renewDomain(params: { domain: string; years: number }): Promise<{ order_id: string }>;

  /**
   * Fetch all_info for a domain (action `GET`, type=all_info). Returns
   * the parsed domain info plus the raw response body for callers
   * that need fields we haven't surfaced yet.
   */
  getDomainInfo(domain: string): Promise<OpenSrsDomainInfo>;

  /**
   * Fetch the full domain detail used by the reconcile cron. Issues
   * TWO OpenSRS `get` calls and merges them:
   *   - type=all_info → expiredate, registry dates, auto_renew,
   *     nameserver_list, contact_set (all 4 roles), gdpr_consent
   *   - type=status   → lock_state, transfer_away_in_progress,
   *     whois_privacy_state, sponsoring_rsp
   *
   * The status call is best-effort: if it fails the result still
   * carries everything from all_info. EPP auth code (domain_auth_info)
   * is never requested.
   */
  getDomainAllInfo(domain: string): Promise<OpenSrsDomainDetail>;

  /**
   * Replace the entire DNS zone (action `SET_DNS_ZONE`). OpenSRS
   * replaces the zone wholesale — to add a single record, GET then
   * SET the merged set.
   */
  setDnsZone(domain: string, records: DnsRecord[]): Promise<void>;

  /**
   * Read the current DNS zone (action `GET_DNS_ZONE`). Returns an
   * empty record set if the zone doesn't exist.
   */
  getDnsZone(domain: string): Promise<{ records: DnsRecord[] }>;

  /**
   * Toggle the registrar lock (action `MODIFY`, data=status,
   * lock_state=0|1).
   */
  setRegistrarLock(domain: string, locked: boolean): Promise<void>;

  /**
   * Toggle auto-renew (action `MODIFY`, data=expire_action,
   * let_expire=0|1 → auto_renew=1|0).
   */
  setAutoRenew(domain: string, enabled: boolean): Promise<void>;

  /**
   * Check whether a domain is available (action `LOOKUP`). Returns
   * `available: true` when OpenSRS responds with code 210. Price is
   * returned when available — OpenSRS doesn't always populate it.
   */
  checkAvailability(domain: string): Promise<{ available: boolean; price?: number }>;
}

// ─── Internals: signing, transport, XML helpers ─────────────

interface OpenSrsEnv {
  host: string;
  username: string;
  apiKey: string;
}

function readEnv(): OpenSrsEnv {
  // SECURITY: in production, OPENSRS_HOST MUST be set explicitly. The
  // default is the SANDBOX endpoint (horizon.opensrs.net) — falling back
  // to it in production would route every domain registration into
  // OpenSRS's test environment, customers would think their domain is
  // registered when it isn't. Fail-closed instead.
  let host = process.env.OPENSRS_HOST;
  if (!host) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'OPENSRS_HOST is required in production. Set it to your OpenSRS live endpoint (e.g. rr-n1-tor.opensrs.net). Refusing to fall back to the sandbox.',
      );
    }
    host = DEFAULT_OPENSRS_HOST;
  }
  const username = process.env.OPENSRS_USERNAME ?? '';
  const apiKey = process.env.OPENSRS_API_KEY ?? '';
  if (!username || !apiKey) {
    console.warn('[opensrs] OPENSRS_USERNAME or OPENSRS_API_KEY is not set');
  }
  return { host, username, apiKey };
}

function md5Hex(input: string): string {
  return createHash('md5').update(input).digest('hex');
}

function signXml(xml: string, apiKey: string): string {
  return md5Hex(md5Hex(xml + apiKey) + apiKey);
}

function xmlEscape(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getXmlValue(xml: string, key: string): string {
  const re = new RegExp(`<item key="${key}">([\\s\\S]*?)</item>`);
  const m = xml.match(re);
  return m ? m[1].trim() : '';
}

function parseStandardResponse(xml: string): {
  isSuccess: boolean;
  responseCode: string;
  responseText: string;
} {
  return {
    isSuccess: getXmlValue(xml, 'is_success') === '1',
    responseCode: getXmlValue(xml, 'response_code'),
    responseText: getXmlValue(xml, 'response_text'),
  };
}

/**
 * Send a signed XML envelope to OpenSRS. Returns the raw response
 * text — callers parse it according to the action.
 */
async function sendOpenSrs(
  env: OpenSrsEnv,
  xml: string,
  action: string,
): Promise<{ status: number; body: string }> {
  const url = `https://${env.host}:55443`;
  const signature = signXml(xml, env.apiKey);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml',
      'X-Username': env.username,
      'X-Signature': signature,
    },
    body: xml,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new OpenSrsError(
      `OpenSRS ${action} HTTP ${res.status}`,
      res.status,
      text,
      action,
    );
  }
  return { status: res.status, body: text };
}

// ─── XML builders (per-action) ──────────────────────────────

function buildContactBlock(role: string, c: OpenSrsContact): string {
  return `<item key="${role}"><dt_assoc>
    <item key="first_name">${xmlEscape(c.first_name)}</item>
    <item key="last_name">${xmlEscape(c.last_name)}</item>
    <item key="org_name">${xmlEscape(c.org_name ?? 'N/A')}</item>
    <item key="address1">${xmlEscape(c.address1)}</item>
    <item key="city">${xmlEscape(c.city)}</item>
    <item key="state">${xmlEscape(c.state)}</item>
    <item key="postal_code">${xmlEscape(c.postal_code)}</item>
    <item key="country">${xmlEscape(c.country)}</item>
    <item key="phone">${xmlEscape(c.phone)}</item>
    <item key="email">${xmlEscape(c.email)}</item>
  </dt_assoc></item>`;
}

function envelope(actionXml: string): string {
  return `<?xml version='1.0' encoding="UTF-8" standalone="no" ?>
<!DOCTYPE OPS_envelope SYSTEM "ops.dtd">
<OPS_envelope>
  <header><version>0.9</version></header>
  <body>
    <data_block>
      <dt_assoc>${actionXml}</dt_assoc>
    </data_block>
  </body>
</OPS_envelope>`;
}

function buildLookupXml(domain: string): string {
  return envelope(`
    <item key="protocol">XCP</item>
    <item key="object">DOMAIN</item>
    <item key="action">LOOKUP</item>
    <item key="attributes"><dt_assoc>
      <item key="domain">${xmlEscape(domain)}</item>
      <item key="no_cache">1</item>
    </dt_assoc></item>
  `);
}

function buildRegisterXml(domain: string, years: number, contacts: OpenSrsContacts): string {
  const admin = contacts.admin ?? contacts.owner;
  const billing = contacts.billing ?? contacts.owner;
  const tech = contacts.tech ?? contacts.owner;
  return envelope(`
    <item key="protocol">XCP</item>
    <item key="object">DOMAIN</item>
    <item key="action">SW_REGISTER</item>
    <item key="attributes"><dt_assoc>
      <item key="domain">${xmlEscape(domain)}</item>
      <item key="reg_type">new</item>
      <item key="period">${years}</item>
      <item key="handle">process</item>
      <item key="custom_tech_contact">0</item>
      <item key="custom_nameservers">1</item>
      <item key="nameserver_list"><dt_array>
        <item key="0"><dt_assoc><item key="name">ns1.systemdns.com</item><item key="sortorder">1</item></dt_assoc></item>
        <item key="1"><dt_assoc><item key="name">ns2.systemdns.com</item><item key="sortorder">2</item></dt_assoc></item>
        <item key="2"><dt_assoc><item key="name">ns3.systemdns.com</item><item key="sortorder">3</item></dt_assoc></item>
      </dt_array></item>
      <item key="f_whois_privacy">1</item>
      <item key="auto_renew">1</item>
      <item key="contact_set"><dt_assoc>
        ${buildContactBlock('owner', contacts.owner)}
        ${buildContactBlock('admin', admin)}
        ${buildContactBlock('billing', billing)}
        ${buildContactBlock('tech', tech)}
      </dt_assoc></item>
    </dt_assoc></item>
  `);
}

function buildRenewXml(domain: string, years: number): string {
  return envelope(`
    <item key="protocol">XCP</item>
    <item key="object">DOMAIN</item>
    <item key="action">SW_REGISTER</item>
    <item key="attributes"><dt_assoc>
      <item key="domain">${xmlEscape(domain)}</item>
      <item key="reg_type">renewal</item>
      <item key="period">${years}</item>
      <item key="handle">process</item>
      <item key="auto_renew">1</item>
    </dt_assoc></item>
  `);
}

function buildGetAllInfoXml(domain: string): string {
  return envelope(`
    <item key="protocol">XCP</item>
    <item key="action">get</item>
    <item key="object">domain</item>
    <item key="domain">${xmlEscape(domain)}</item>
    <item key="attributes"><dt_assoc>
      <item key="type">all_info</item>
    </dt_assoc></item>
  `);
}

function buildGetStatusXml(domain: string): string {
  // type=status returns lock_state, transfer-away progress and the
  // WHOIS-privacy state — fields the all_info payload doesn't carry.
  return envelope(`
    <item key="protocol">XCP</item>
    <item key="action">get</item>
    <item key="object">domain</item>
    <item key="domain">${xmlEscape(domain)}</item>
    <item key="attributes"><dt_assoc>
      <item key="type">status</item>
    </dt_assoc></item>
  `);
}

function buildCreateDnsZoneXml(domain: string): string {
  return envelope(`
    <item key="protocol">XCP</item>
    <item key="object">DOMAIN</item>
    <item key="action">CREATE_DNS_ZONE</item>
    <item key="attributes"><dt_assoc>
      <item key="domain">${xmlEscape(domain)}</item>
    </dt_assoc></item>
  `);
}

function buildSetDnsZoneXml(domain: string, records: DnsRecord[]): string {
  const grouped: Record<string, DnsRecord[]> = {};
  for (const r of records) {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push(r);
  }
  const typeItems = Object.entries(grouped)
    .map(([type, recs]) => {
      const recItems = recs
        .map((r, i) => {
          let fields = `<item key="subdomain">${xmlEscape(r.subdomain)}</item>`;
          switch (type) {
            case 'A':
              fields += `<item key="ip_address">${xmlEscape(r.ip_address ?? '')}</item>`;
              break;
            case 'AAAA':
              fields += `<item key="ipv6_address">${xmlEscape(r.ipv6_address ?? '')}</item>`;
              break;
            case 'CNAME':
              fields += `<item key="hostname">${xmlEscape(r.hostname ?? '')}</item>`;
              break;
            case 'MX':
              fields += `<item key="hostname">${xmlEscape(r.hostname ?? '')}</item>`;
              fields += `<item key="priority">${r.priority ?? 10}</item>`;
              break;
            case 'TXT':
              fields += `<item key="text">${xmlEscape(r.text ?? '')}</item>`;
              break;
            case 'SRV':
              fields += `<item key="hostname">${xmlEscape(r.hostname ?? '')}</item>`;
              fields += `<item key="priority">${r.priority ?? 10}</item>`;
              fields += `<item key="weight">${r.weight ?? 1}</item>`;
              fields += `<item key="port">${r.port ?? 443}</item>`;
              break;
          }
          return `<item key="${i}"><dt_assoc>${fields}</dt_assoc></item>`;
        })
        .join('');
      return `<item key="${type}"><dt_array>${recItems}</dt_array></item>`;
    })
    .join('');

  return envelope(`
    <item key="protocol">XCP</item>
    <item key="object">DOMAIN</item>
    <item key="action">SET_DNS_ZONE</item>
    <item key="attributes"><dt_assoc>
      <item key="domain">${xmlEscape(domain)}</item>
      <item key="records"><dt_assoc>${typeItems}</dt_assoc></item>
    </dt_assoc></item>
  `);
}

function buildGetDnsZoneXml(domain: string): string {
  return envelope(`
    <item key="protocol">XCP</item>
    <item key="object">DOMAIN</item>
    <item key="action">GET_DNS_ZONE</item>
    <item key="attributes"><dt_assoc>
      <item key="domain">${xmlEscape(domain)}</item>
    </dt_assoc></item>
  `);
}

function buildSetLockXml(domain: string, locked: boolean): string {
  return envelope(`
    <item key="protocol">XCP</item>
    <item key="action">modify</item>
    <item key="object">domain</item>
    <item key="attributes"><dt_assoc>
      <item key="affect_domains">0</item>
      <item key="data">status</item>
      <item key="domain">${xmlEscape(domain)}</item>
      <item key="lock_state">${locked ? 1 : 0}</item>
    </dt_assoc></item>
  `);
}

function buildSetAutoRenewXml(domain: string, enabled: boolean): string {
  // expire_action: let_expire=0 means auto-renew, =1 means let expire.
  return envelope(`
    <item key="protocol">XCP</item>
    <item key="action">modify</item>
    <item key="object">domain</item>
    <item key="attributes"><dt_assoc>
      <item key="affect_domains">0</item>
      <item key="data">expire_action</item>
      <item key="domain_list"><dt_array>
        <item key="0">${xmlEscape(domain)}</item>
      </dt_array></item>
      <item key="auto_renew">${enabled ? 1 : 0}</item>
      <item key="let_expire">${enabled ? 0 : 1}</item>
    </dt_assoc></item>
  `);
}

// ─── Response parsers ───────────────────────────────────────

function parseDomainInfoFromXml(domain: string, xml: string): OpenSrsDomainInfo {
  const expire = getXmlValue(xml, 'expiredate');
  const lock = getXmlValue(xml, 'lock_state');
  const autoRenew = getXmlValue(xml, 'auto_renew');
  const status = getXmlValue(xml, 'status');
  // nameservers come back inside a dt_array — collect host values.
  const nameservers: string[] = [];
  const nsBlock = xml.match(/<item key="nameserver_list">([\s\S]*?)<\/item>/);
  if (nsBlock) {
    const hostMatches = nsBlock[1].matchAll(/<item key="name">(.*?)<\/item>/g);
    for (const m of hostMatches) {
      const name = m[1].trim();
      if (name) nameservers.push(name);
    }
  }
  return {
    domain,
    status: status || undefined,
    expiredate: expire || undefined,
    auto_renew: autoRenew === '1' ? true : autoRenew === '0' ? false : undefined,
    lock_state: lock === '1' ? true : lock === '0' ? false : undefined,
    nameservers: nameservers.length ? nameservers : undefined,
    raw: xml,
  };
}

/**
 * Pull a single contact-role block out of an all_info contact_set.
 * Returns null when the role block isn't present.
 */
function parseContactBlock(xml: string, role: string): OpenSrsContact | null {
  // The contact_set is keyed by role; isolate that role's dt_assoc.
  const re = new RegExp(`<item key="${role}">\\s*<dt_assoc>([\\s\\S]*?)</dt_assoc>\\s*</item>`);
  const m = xml.match(re);
  if (!m) return null;
  const block = m[1];
  const get = (k: string) => getXmlValue(block, k);
  const first = get('first_name');
  const last = get('last_name');
  const email = get('email');
  // Skip a block with nothing usable in it.
  if (!first && !last && !email && !get('phone')) return null;
  return {
    first_name: first,
    last_name: last,
    org_name: get('org_name') || undefined,
    email,
    phone: get('phone'),
    address1: get('address1'),
    city: get('city'),
    state: get('state'),
    postal_code: get('postal_code'),
    country: get('country'),
  };
}

/**
 * Parse the contact_set out of an all_info response into the four
 * role buckets. owner is always present for a registered domain;
 * admin/tech/billing may be absent (registries vary).
 */
function parseContactSet(xml: string): OpenSrsContacts | undefined {
  const setBlock = xml.match(/<item key="contact_set">([\s\S]*?)<\/dt_assoc>\s*<\/item>/);
  const search = setBlock?.[1] ?? xml;
  const owner = parseContactBlock(search, 'owner');
  const admin = parseContactBlock(search, 'admin');
  const tech = parseContactBlock(search, 'tech');
  const billing = parseContactBlock(search, 'billing');
  if (!owner && !admin && !tech && !billing) return undefined;
  // owner is the canonical fallback if the registry didn't echo it.
  const fallback = owner ?? admin ?? tech ?? billing!;
  return {
    owner: owner ?? fallback,
    admin: admin ?? undefined,
    tech: tech ?? undefined,
    billing: billing ?? undefined,
  };
}

/**
 * Parse the merged all_info + status responses into an
 * OpenSrsDomainDetail. `statusXml` may be empty when the status call
 * failed — in that case lock/transfer/whois fields stay undefined.
 */
function parseDomainDetailFromXml(
  domain: string,
  allInfoXml: string,
  statusXml: string,
): OpenSrsDomainDetail {
  const autoRenew = getXmlValue(allInfoXml, 'auto_renew');
  const letExpire = getXmlValue(allInfoXml, 'let_expire');

  // nameservers come back inside a dt_array under nameserver_list.
  const nameservers: string[] = [];
  const nsBlock = allInfoXml.match(/<item key="nameserver_list">([\s\S]*?)<\/item>\s*<\/dt_array>\s*<\/item>/) ??
    allInfoXml.match(/<item key="nameserver_list">([\s\S]*?)<\/item>/);
  if (nsBlock) {
    const hostMatches = nsBlock[1].matchAll(/<item key="name">(.*?)<\/item>/g);
    for (const m of hostMatches) {
      const name = m[1].trim();
      if (name) nameservers.push(name);
    }
  }

  // status XML carries lock_state, transfer-away and whois privacy.
  const lock = getXmlValue(statusXml, 'lock_state');
  const transferAway = getXmlValue(statusXml, 'transfer_away_in_progress') ||
    getXmlValue(statusXml, 'transferaway_in_progress');
  const whois = getXmlValue(statusXml, 'whois_privacy_state') ||
    getXmlValue(allInfoXml, 'whois_privacy_state');
  const sponsoring = getXmlValue(statusXml, 'sponsoring_rsp');

  const truthy = (v: string): boolean | undefined =>
    v === '1' || v.toLowerCase() === 'true' || v.toLowerCase() === 'enabled'
      ? true
      : v === '0' || v.toLowerCase() === 'false' || v.toLowerCase() === 'disabled'
        ? false
        : undefined;

  return {
    domain,
    status: getXmlValue(allInfoXml, 'status') || getXmlValue(statusXml, 'status') || undefined,
    expiredate: getXmlValue(allInfoXml, 'expiredate') || undefined,
    auto_renew: autoRenew === '1' ? true : autoRenew === '0' ? false : undefined,
    let_expire: letExpire === '1' ? true : letExpire === '0' ? false : undefined,
    lock_state: lock === '1' ? true : lock === '0' ? false : undefined,
    whois_privacy_state: whois || undefined,
    transfer_away_in_progress: transferAway ? truthy(transferAway) : undefined,
    sponsoring_rsp: sponsoring ? truthy(sponsoring) : undefined,
    registry_createdate: getXmlValue(allInfoXml, 'registry_createdate') || undefined,
    registry_expiredate: getXmlValue(allInfoXml, 'registry_expiredate') || undefined,
    registry_updateddate: getXmlValue(allInfoXml, 'registry_updateddate') || undefined,
    registry_transferreddate: getXmlValue(allInfoXml, 'registry_transferreddate') || undefined,
    gdpr_consent_status:
      getXmlValue(allInfoXml, 'gdpr_consent_status') ||
      getXmlValue(allInfoXml, 'tld_data_consent') ||
      undefined,
    nameservers: nameservers.length ? nameservers : undefined,
    contact_set: parseContactSet(allInfoXml),
    raw: { all_info: allInfoXml, status: statusXml || undefined },
  };
}

function parseDnsRecordsFromXml(xml: string): DnsRecord[] {
  // OpenSRS GET_DNS_ZONE returns records grouped by type under
  // <item key="records"><dt_assoc>...</dt_assoc></item>. We extract
  // each type-bucket then iterate its dt_array.
  const records: DnsRecord[] = [];
  const recordsBlock = xml.match(/<item key="records">([\s\S]*?)<\/item>\s*<\/dt_assoc>\s*<\/item>/);
  const search = recordsBlock?.[1] ?? xml;
  const typeRe = /<item key="(A|AAAA|CNAME|MX|TXT|SRV)"><dt_array>([\s\S]*?)<\/dt_array><\/item>/g;
  let typeMatch: RegExpExecArray | null;
  while ((typeMatch = typeRe.exec(search)) !== null) {
    const type = typeMatch[1] as DnsRecord['type'];
    const entries = typeMatch[2];
    const entryRe = /<dt_assoc>([\s\S]*?)<\/dt_assoc>/g;
    let entryMatch: RegExpExecArray | null;
    while ((entryMatch = entryRe.exec(entries)) !== null) {
      const block = entryMatch[1];
      const subdomain = getXmlValue(block, 'subdomain');
      const rec: DnsRecord = { type, subdomain };
      const ip = getXmlValue(block, 'ip_address');
      if (ip) rec.ip_address = ip;
      const ipv6 = getXmlValue(block, 'ipv6_address');
      if (ipv6) rec.ipv6_address = ipv6;
      const hostname = getXmlValue(block, 'hostname');
      if (hostname) rec.hostname = hostname;
      const text = getXmlValue(block, 'text');
      if (text) rec.text = text;
      const priority = getXmlValue(block, 'priority');
      if (priority) rec.priority = parseInt(priority, 10);
      const weight = getXmlValue(block, 'weight');
      if (weight) rec.weight = parseInt(weight, 10);
      const port = getXmlValue(block, 'port');
      if (port) rec.port = parseInt(port, 10);
      records.push(rec);
    }
  }
  return records;
}

// ─── Factory ────────────────────────────────────────────────

/**
 * Construct an OpenSRS client bound to current env vars. Env is read
 * at call time (not module load) so per-request overrides work.
 */
export function createOpenSrsClient(): OpenSrsClient {
  const env = readEnv();

  /**
   * Submit XML and assert is_success=1. Throws OpenSrsError otherwise.
   * Returns the raw response text so callers can extract action-specific
   * fields.
   */
  async function call(action: string, xml: string): Promise<string> {
    const path = `/opensrs/${action}`; // synthetic path for api_calls logging
    const responseBody = await withApiCallLogging<string>(
      { provider: 'opensrs', method: 'POST', path, requestPayload: { xml } },
      async () => {
        const { status, body } = await sendOpenSrs(env, xml, action);
        return { status, body };
      },
    );
    const parsed = parseStandardResponse(responseBody);
    if (!parsed.isSuccess) {
      throw new OpenSrsError(
        `OpenSRS ${action} failed: ${parsed.responseText}`,
        200,
        responseBody,
        action,
        parsed.responseCode,
      );
    }
    return responseBody;
  }

  return {
    async registerDomain({ domain, years, contacts }) {
      const xml = buildRegisterXml(domain, years, contacts);
      const responseXml = await call('register_domain', xml);
      const parsed = parseStandardResponse(responseXml);
      const orderId = getXmlValue(responseXml, 'id') || getXmlValue(responseXml, 'order_id');
      return {
        order_id: orderId,
        status: parsed.responseText || 'registered',
      };
    },

    async renewDomain({ domain, years }) {
      const xml = buildRenewXml(domain, years);
      const responseXml = await call('renew_domain', xml);
      const orderId = getXmlValue(responseXml, 'order_id') || getXmlValue(responseXml, 'id');
      return { order_id: orderId };
    },

    async getDomainInfo(domain) {
      const xml = buildGetAllInfoXml(domain);
      const responseXml = await call('get_domain_info', xml);
      return parseDomainInfoFromXml(domain, responseXml);
    },

    async getDomainAllInfo(domain) {
      // 1. all_info — the authoritative fetch (dates, contacts, NS).
      const allInfoXml = await call('get_domain_all_info', buildGetAllInfoXml(domain));
      // 2. status — best-effort: lock_state / transfer-away / whois.
      //    A failure here must not blank the all_info result.
      let statusXml = '';
      try {
        statusXml = await call('get_domain_status', buildGetStatusXml(domain));
      } catch (e) {
        console.warn('[opensrs] get type=status non-fatal:', e);
      }
      return parseDomainDetailFromXml(domain, allInfoXml, statusXml);
    },

    async setDnsZone(domain, records) {
      // OpenSRS requires CREATE_DNS_ZONE before SET_DNS_ZONE on first
      // use. CREATE is non-fatal if the zone already exists.
      try {
        const createXml = buildCreateDnsZoneXml(domain);
        const createResponse = await withApiCallLogging<string>(
          {
            provider: 'opensrs',
            method: 'POST',
            path: '/opensrs/create_dns_zone',
            requestPayload: { xml: createXml },
          },
          async () => {
            const { status, body } = await sendOpenSrs(env, createXml, 'create_dns_zone');
            return { status, body };
          },
        );
        // Intentionally ignore the response code — "zone already
        // exists" is the common case and not an error for our flow.
        void createResponse;
      } catch (e) {
        // Network failures here are still raised by sendOpenSrs as
        // OpenSrsError; tolerate XML-level "already exists" errors
        // by ignoring them in the SET step below.
        console.warn('[opensrs] CREATE_DNS_ZONE non-fatal:', e);
      }

      const xml = buildSetDnsZoneXml(domain, records);
      await call('set_dns_zone', xml);
    },

    async getDnsZone(domain) {
      const xml = buildGetDnsZoneXml(domain);
      try {
        const responseXml = await call('get_dns_zone', xml);
        return { records: parseDnsRecordsFromXml(responseXml) };
      } catch (e) {
        // If the zone doesn't exist yet, return an empty record set
        // rather than propagating — callers can SET to create it.
        if (e instanceof OpenSrsError && e.responseCode === '465') {
          return { records: [] };
        }
        throw e;
      }
    },

    async setRegistrarLock(domain, locked) {
      const xml = buildSetLockXml(domain, locked);
      await call('set_registrar_lock', xml);
    },

    async setAutoRenew(domain, enabled) {
      const xml = buildSetAutoRenewXml(domain, enabled);
      await call('set_auto_renew', xml);
    },

    async checkAvailability(domain) {
      const xml = buildLookupXml(domain);
      const path = '/opensrs/check_availability';
      const responseBody = await withApiCallLogging<string>(
        { provider: 'opensrs', method: 'POST', path, requestPayload: { xml } },
        async () => {
          const { status, body } = await sendOpenSrs(env, xml, 'check_availability');
          return { status, body };
        },
      );
      const parsed = parseStandardResponse(responseBody);
      // Code 210 = available, 211 = taken. We treat anything else as
      // an upstream error so callers see it.
      if (parsed.responseCode === '210') {
        const priceStr = getXmlValue(responseBody, 'price');
        const price = priceStr ? Number(priceStr) : undefined;
        return { available: true, price: Number.isFinite(price) ? price : undefined };
      }
      if (parsed.responseCode === '211') {
        return { available: false };
      }
      throw new OpenSrsError(
        `OpenSRS LOOKUP unexpected code ${parsed.responseCode}: ${parsed.responseText}`,
        200,
        responseBody,
        'check_availability',
        parsed.responseCode,
      );
    },
  };
}
