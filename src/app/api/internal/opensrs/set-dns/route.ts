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
  records: DnsRecord[];
  actorId?: string;
}

const VALID_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV'] as const;

function validateRecords(records: unknown): records is DnsRecord[] {
  if (!Array.isArray(records)) return false;
  for (const r of records) {
    if (!r || typeof r !== 'object') return false;
    const rec = r as Record<string, unknown>;
    if (typeof rec.type !== 'string' || !VALID_TYPES.includes(rec.type as DnsRecord['type'])) {
      return false;
    }
    if (typeof rec.subdomain !== 'string') return false;
  }
  return true;
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

  if (!body.domainName || !validateRecords(body.records)) {
    return NextResponse.json(
      {
        error:
          'domainName and a valid records[] array are required (type in A|AAAA|CNAME|MX|TXT|SRV)',
      },
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
    await client.setDnsZone(body.domainName, body.records);

    const nowIso = new Date().toISOString();

    // Replace dns_records rows wholesale: delete then insert. OpenSRS
    // replaces the zone wholesale so our mirror should match.
    await sb.from('dns_records').delete().eq('domain_id', domain.id);
    if (body.records.length > 0) {
      const insertRows = body.records.map((r) => ({
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
          dns_records: body.records,
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
      after: { records: body.records },
      metadata: { source: 'internal-route', record_count: body.records.length },
    });

    return NextResponse.json({
      ok: true,
      domainId: domain.id,
      domainName: body.domainName,
      recordCount: body.records.length,
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
