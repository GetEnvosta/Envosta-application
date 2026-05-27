/**
 * DNS update workflow (Vercel Workflows SDK).
 *
 * Wraps `/api/internal/opensrs/set-dns` in a single durable step so
 * future callers (DNS UI, provision-site follow-up, etc.) can fire-and-
 * forget DNS pushes with built-in retry. The internal route already
 * handles the OpenSRS SET_DNS_ZONE call, opensrs_dns_records mirror replacement,
 * domains.metadata stamping, and audit_log writes.
 *
 * Currently dormant — DNS UI calls the internal route directly. Made
 * available for future use; no callers yet.
 *
 * Idempotency: OpenSRS SET_DNS_ZONE replaces the whole zone, so a retry
 * with identical records is a no-op. The internal route is safe to
 * re-invoke.
 */
import { FatalError } from 'workflow';
import { createClient } from '@supabase/supabase-js';
import { recordAudit } from '@/lib/audit';

export interface UpdateDnsRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'SRV';
  name: string;
  value: string;
  ttl?: number;
  priority?: number;
}

export interface UpdateDnsInput {
  domainId: string;
  records: UpdateDnsRecord[];
  actorId?: string;
}

// ───────────────────────────────────────────────────────────────────
// STEP 1 — lookup domain row + push to internal set-dns route.
// ───────────────────────────────────────────────────────────────────
async function pushDnsZone(input: UpdateDnsInput) {
  'use step';

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: domain, error } = await sb
    .from('domains')
    .select('id, domain_name')
    .eq('id', input.domainId)
    .maybeSingle();

  if (error) {
    throw new Error(`domains lookup failed: ${error.message}`);
  }
  if (!domain) {
    throw new FatalError(`domain ${input.domainId} not found`);
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://envosta.com';
  const url = `${base}/api/internal/opensrs/set-dns`;
  const token = process.env.INTERNAL_API_TOKEN;
  if (!token) {
    throw new FatalError('INTERNAL_API_TOKEN env var not set');
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Token': token,
    },
    body: JSON.stringify({
      domainName: domain.domain_name,
      records: input.records,
      actorId: input.actorId,
    }),
  });

  if (res.status >= 400 && res.status < 500) {
    const body = await res.text();
    throw new FatalError(
      `set-dns rejected domainId=${input.domainId} status=${res.status}: ${body}`,
    );
  }
  if (!res.ok) {
    throw new Error(`set-dns upstream error status=${res.status}`);
  }

  return (await res.json()) as { ok?: boolean; recordCount?: number };
}

// ───────────────────────────────────────────────────────────────────
// STEP 2 — audit completion checkpoint.
// ───────────────────────────────────────────────────────────────────
async function recordDnsUpdated(input: UpdateDnsInput, recordCount: number | null) {
  'use step';

  await recordAudit({
    actorType: 'workflow',
    actorId: input.actorId,
    action: 'workflow.update_dns.completed',
    resourceType: 'domain',
    resourceId: input.domainId,
    metadata: {
      record_count: recordCount,
    },
  });
}

// ───────────────────────────────────────────────────────────────────
// Workflow orchestrator.
// ───────────────────────────────────────────────────────────────────
export async function updateDns(input: UpdateDnsInput) {
  'use workflow';

  const result = await pushDnsZone(input);
  await recordDnsUpdated(input, result.recordCount ?? null);

  return {
    domainId: input.domainId,
    recordCount: result.recordCount ?? input.records.length,
    status: 'updated' as const,
  };
}
