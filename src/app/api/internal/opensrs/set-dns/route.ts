/**
 * POST /api/internal/opensrs/set-dns
 *
 * Internal route that writes a DNS zone for an Envosta-registered
 * domain. Wraps `createOpenSrsClient().setDnsZone()` which replaces
 * the entire zone (OpenSRS does not support partial updates).
 *
 * Side effects:
 *  - Calls OpenSRS SET_DNS_ZONE (preceded by CREATE_DNS_ZONE if first
 *    use — the client handles that internally).
 *  - Replaces all rows in the `dns_records` table for the domain to
 *    reflect the new zone.
 *  - Records the change to `audit_log` with before/after snapshots.
 *
 * Auth: X-Internal-Token header must match INTERNAL_API_TOKEN env var.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyInternalToken } from '@/lib/internal-auth';
import {
  createOpenSrsClient,
  OpenSrsError,
  type DnsRecord,
} from '@/lib/integrations/opensrs';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface SetDnsBody {
  domainName: string;
  /**
   * DNS records in either the OpenSRS client shape (subdomain + typed
   * fields) or the frontend shape (name + value + optional priority).
   * The route normalizes both into the client shape before sending.
   */
  records?: unknown[];
  /**
   * Shorthand for `setup-dns`: when set, the route builds the standard
   * wp.cloud 6-record zone for `siteIp` and uses it as `records`.
   */
  siteIp?: string;
  actorId?: string;
}

const VALID_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV'] as const;
type DnsType = (typeof VALID_TYPES)[number];

/**
 * Standard 6-record DNS zone for a WordPress site hosted on wp.cloud.
 * Mirrors `buildWpCloudDnsRecords()` in supabase/functions/_shared so
 * setup-dns callers don't need to assemble the record set themselves.
 */
function buildWpCloudDnsRecords(siteIp: string): DnsRecord[] {
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
 * Normalize a record from either the OpenSRS client shape
 * ({type, subdomain, ip_address|hostname|text|...}) or the frontend
 * shape ({type, name, value, priority?}) into the client shape.
 */
function normalizeRecord(r: unknown): DnsRecord | null {
  if (!r || typeof r !== 'object') return null;
  const rec = r as Record<string, unknown>;
  if (typeof rec.type !== 'string' || !VALID_TYPES.includes(rec.type as DnsType)) return null;
  const type = rec.type as DnsType;

  // Subdomain: prefer `subdomain` (client shape), else `name` ("@" means apex).
  let subdomain: string;
  if (typeof rec.subdomain === 'string') {
    subdomain = rec.subdomain;
  } else if (typeof rec.name === 'string') {
    subdomain = rec.name === '@' ? '' : rec.name;
  } else {
    return null;
  }

  const out: DnsRecord = { type, subdomain };
  const value = typeof rec.value === 'string' ? rec.value : undefined;
  switch (type) {
    case 'A':
      out.ip_address = (rec.ip_address as string | undefined) ?? value ?? '';
      break;
    case 'AAAA':
      out.ipv6_address = (rec.ipv6_address as string | undefined) ?? value ?? '';
      break;
    case 'CNAME':
      out.hostname = (rec.hostname as string | undefined) ?? value ?? '';
      break;
    case 'MX':
      out.hostname = (rec.hostname as string | undefined) ?? value ?? '';
      out.priority = typeof rec.priority === 'number' ? rec.priority : 10;
      break;
    case 'TXT':
      out.text = (rec.text as string | undefined) ?? value ?? '';
      break;
    case 'SRV':
      out.hostname = (rec.hostname as string | undefined) ?? value ?? '';
      out.priority = typeof rec.priority === 'number' ? rec.priority : 10;
      out.weight = typeof rec.weight === 'number' ? rec.weight : 1;
      out.port = typeof rec.port === 'number' ? rec.port : 443;
      break;
  }
  if (typeof rec.ttl === 'number') out.ttl = rec.ttl;
  return out;
}

/**
 * Map a DnsRecord (from the OpenSRS client surface) onto the
 * dns_records.value column. Each record type stores its primary value
 * in a different field.
 */
function recordValue(r: DnsRecord): string {
  switch (r.type) {
    case 'A':
      return r.ip_address ?? '';
    case 'AAAA':
      return r.ipv6_address ?? '';
    case 'CNAME':
    case 'MX':
    case 'SRV':
      return r.hostname ?? '';
    case 'TXT':
      return r.text ?? '';
    default:
      return '';
  }
}

export async function POST(req: Request) {
  if (!verifyInternalToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: SetDnsBody;
  try {
    body = (await req.json()) as SetDnsBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.domainName) {
    return NextResponse.json({ error: 'domainName is required' }, { status: 400 });
  }

  // Resolve records: explicit `records[]` (in either shape) takes
  // precedence, otherwise the `siteIp` shorthand builds the wp.cloud
  // default zone. At least one must be provided.
  let records: DnsRecord[];
  if (Array.isArray(body.records)) {
    const normalized: DnsRecord[] = [];
    for (const r of body.records) {
      const norm = normalizeRecord(r);
      if (!norm) {
        return NextResponse.json(
          {
            error:
              'Invalid record entry — each record needs a valid `type` (A|AAAA|CNAME|MX|TXT|SRV) and a `subdomain` or `name`.',
          },
          { status: 400 },
        );
      }
      normalized.push(norm);
    }
    records = normalized;
  } else if (typeof body.siteIp === 'string' && body.siteIp.length > 0) {
    records = buildWpCloudDnsRecords(body.siteIp);
  } else {
    return NextResponse.json(
      { error: 'Either records[] or siteIp must be provided' },
      { status: 400 },
    );
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: domain, error: fetchErr } = await sb
    .from('domains')
    .select('id, user_id, status, metadata')
    .eq('domain_name', body.domainName)
    .maybeSingle();

  if (fetchErr || !domain) {
    return NextResponse.json({ error: 'Domain row not found' }, { status: 404 });
  }

  const { data: existingRecords } = await sb
    .from('dns_records')
    .select('id, record_type, name, value, ttl, priority')
    .eq('domain_id', domain.id);

  const client = createOpenSrsClient();

  try {
    await client.setDnsZone(body.domainName, records);

    const nowIso = new Date().toISOString();

    // Replace dns_records rows wholesale: delete then insert. OpenSRS
    // replaces the zone wholesale so our mirror should match.
    await sb.from('dns_records').delete().eq('domain_id', domain.id);
    if (records.length > 0) {
      const insertRows = records.map((r) => ({
        domain_id: domain.id,
        record_type: r.type,
        // Use "@" for apex per dns_records convention; empty subdomain
        // means apex in OpenSRS terms.
        name: r.subdomain === '' ? '@' : r.subdomain,
        value: recordValue(r),
        ttl: r.ttl ?? 3600,
        priority: r.priority ?? null,
      }));
      await sb.from('dns_records').insert(insertRows);
    }

    // Reflect the change in domains.metadata so legacy callers that
    // read from the JSONB still see the new zone.
    await sb
      .from('domains')
      .update({
        metadata: {
          ...((domain.metadata as Record<string, unknown> | null) ?? {}),
          dns_records: records,
          dns_setup: 'complete',
          dns_setup_at: nowIso,
        },
      })
      .eq('id', domain.id);

    await recordAudit({
      actorType: 'system',
      actorId: body.actorId ?? domain.user_id,
      action: 'opensrs.dns.set',
      resourceType: 'domain',
      resourceId: domain.id,
      before: { records: existingRecords ?? [] },
      after: { records },
      metadata: { source: 'internal-route', record_count: records.length },
    });

    return NextResponse.json({
      ok: true,
      domainId: domain.id,
      domainName: body.domainName,
      recordCount: records.length,
    });
  } catch (e) {
    const isOpenSrsErr = e instanceof OpenSrsError;
    const message = e instanceof Error ? e.message : String(e);

    await recordAudit({
      actorType: 'system',
      actorId: body.actorId ?? domain.user_id,
      action: 'opensrs.dns.set_failed',
      resourceType: 'domain',
      resourceId: domain.id,
      before: { records: existingRecords ?? [] },
      after: null,
      metadata: {
        error: message,
        response_code: isOpenSrsErr ? e.responseCode : undefined,
      },
    });

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
