/**
 * GET /api/cron/reconcile-opensrs
 *
 * Phase 6 — daily OpenSRS mirror reconciliation (runs 04:00 UTC).
 *
 * A READ-ONLY sweep that keeps the `opensrs_domains` + `opensrs_contacts`
 * + `opensrs_dns_records` mirror tables fresh and surfaces drift. It
 * NEVER mutates upstream OpenSRS state — it only writes local mirror
 * tables (`opensrs_domains`, `opensrs_contacts`, `opensrs_dns_records`,
 * `sync_drift`, `sync_runs`).
 *
 * For every registered `domains` row:
 *   1. getDomainAllInfo() — merged all_info + status fetch (dates,
 *      auto_renew, lock_state, nameservers, contact_set, whois privacy).
 *   2. Upsert `opensrs_domains` with the fresh data.
 *   3. Upsert the (up to) 4 `opensrs_contacts` rows, keyed on
 *      (domain_id, contact_type).
 *   4. getDnsZone() — fetch upstream DNS records and reconcile against
 *      `opensrs_dns_records` (mark synced/extra_in_upstream/missing_in_upstream).
 * Each domain is wrapped individually — one failing domain never aborts
 * the run.
 *
 * Drift detection writes a `sync_drift` row when:
 *   - expiring_soon   — `expires_at` is within 30 days. This is the
 *     signal the renewal system + alerter consume.
 *   - status_mismatch — our local `domains.status` disagrees with what
 *     OpenSRS reports.
 *   - transfer_away   — `transfer_away_in_progress` is true (the domain
 *     is leaving — important to surface to ops).
 *   - dns_zone_drift  — upstream DNS zone has records we don't or is
 *     missing records we do. SET_DNS_ZONE replaces wholesale so a stale
 *     mirror = data-loss bug.
 *
 * The EPP auth code (domain_auth_info) is never fetched here.
 *
 * Auth: Vercel cron sends `Authorization: Bearer ${CRON_SECRET}`.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  createOpenSrsClient,
  type DnsRecord,
  type OpenSrsContact,
  type OpenSrsContacts,
} from '@/lib/integrations/opensrs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const EXPIRY_WARN_DAYS = 30;

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}

/** Parse an OpenSRS date string into an ISO timestamp, or null. */
function toIso(v: string | undefined | null): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Extract the canonical value for a DnsRecord — each record type
 * stores its primary value in a different field. Mirrors the helper
 * in /api/internal/opensrs/set-dns/route.ts.
 */
function dnsRecordValue(r: DnsRecord): string {
  switch (r.type) {
    case 'A':     return r.ip_address ?? '';
    case 'AAAA':  return r.ipv6_address ?? '';
    case 'CNAME':
    case 'MX':
    case 'SRV':   return r.hostname ?? '';
    case 'TXT':   return r.text ?? '';
    default:      return '';
  }
}

/**
 * Canonical key for matching a local opensrs_dns_records row against an upstream
 * DnsRecord — type|name|value|priority. Apex normalizes to "@" both ways.
 */
function canonLocal(r: {
  record_type: string; name: string; value: string; priority: number | null;
}): string {
  return `${r.record_type}|${r.name === '' ? '@' : r.name}|${r.value}|${r.priority ?? ''}`;
}
function canonUpstream(r: DnsRecord): string {
  const name = r.subdomain === '' ? '@' : r.subdomain;
  return `${r.type}|${name}|${dnsRecordValue(r)}|${r.priority ?? ''}`;
}

/** Map an OpenSRS domain status to our domains.status enum. */
function mapUpstreamToLocalStatus(upstream: string | null | undefined): string | null {
  if (!upstream) return null;
  const s = upstream.toLowerCase();
  if (['registered', 'active', 'ok'].includes(s)) return 'registered';
  if (['expired'].includes(s)) return 'expired';
  if (['transferring', 'pending_transfer', 'transfer_pending'].includes(s)) return 'transferring';
  if (['deleted', 'redemption'].includes(s)) return 'deleted';
  return null; // unknown — don't claim a mismatch we can't reason about
}

export async function GET(req: Request) {
  // ── Auth ──
  const authHeader = req.headers.get('authorization');
  // Fail-closed: reject when CRON_SECRET is unset (was fail-open before).
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = sb();
  const opensrs = createOpenSrsClient();

  // ── Open a sync_runs row ──
  const { data: runRow } = await supabase
    .from('sync_runs')
    .insert({ provider: 'opensrs', resource_type: 'domains', status: 'running' })
    .select('id')
    .single();
  const runId = runRow?.id as string | undefined;

  let scanned = 0;
  let driftCount = 0;

  try {
    // Iterate registered domains in OUR table.
    const { data: domains, error: domainsErr } = await supabase
      .from('domains')
      .select('id, domain_name, status')
      .eq('status', 'registered');

    if (domainsErr) throw new Error(`domains query failed: ${domainsErr.message}`);

    const nowMs = Date.now();

    for (const dom of domains ?? []) {
      const domainName = dom.domain_name as string;
      scanned += 1;

      // Per-domain try/catch — one bad domain never aborts the sweep.
      try {
        const detail = await opensrs.getDomainAllInfo(domainName);
        const nowIso = new Date().toISOString();

        const expiresAt = toIso(detail.expiredate);
        const registryExpiresAt = toIso(detail.registry_expiredate);

        // ── Upsert opensrs_domains ──
        const { data: mirrorRow } = await supabase
          .from('opensrs_domains')
          .upsert(
            {
              upstream_id: domainName,
              domain_id: dom.id,
              upstream_status: detail.status ?? null,
              lock_state: detail.lock_state ?? null,
              whois_privacy: detail.whois_privacy_state ?? null,
              auto_renew: detail.auto_renew ?? null,
              let_expire: detail.let_expire ?? null,
              expires_at: expiresAt,
              registry_created_at: toIso(detail.registry_createdate),
              registry_expires_at: registryExpiresAt,
              registry_updated_at: toIso(detail.registry_updateddate),
              registry_transferred_at: toIso(detail.registry_transferreddate),
              transfer_away_in_progress: detail.transfer_away_in_progress ?? null,
              sponsoring_rsp: detail.sponsoring_rsp ?? null,
              nameservers: detail.nameservers ?? null,
              gdpr_consent_status: detail.gdpr_consent_status ?? null,
              upstream_payload: { getDomainAllInfo: detail.raw ?? {} },
              last_synced_at: nowIso,
              updated_at: nowIso,
            },
            { onConflict: 'upstream_id' },
          )
          .select('id')
          .single();
        const opensrsDomainId = mirrorRow?.id as string | undefined;

        // ── Upsert the contact rows, keyed (domain_id, contact_type) ──
        const set = detail.contact_set as OpenSrsContacts | undefined;
        if (set) {
          const roles: Array<{ type: string; c: OpenSrsContact | undefined }> = [
            { type: 'owner', c: set.owner },
            { type: 'admin', c: set.admin },
            { type: 'tech', c: set.tech },
            { type: 'billing', c: set.billing },
          ];
          for (const { type, c } of roles) {
            if (!c) continue;
            await supabase.from('opensrs_contacts').upsert(
              {
                domain_id: dom.id,
                opensrs_domain_id: opensrsDomainId ?? null,
                contact_type: type,
                first_name: c.first_name ?? null,
                last_name: c.last_name ?? null,
                org_name: c.org_name ?? null,
                address1: c.address1 ?? null,
                city: c.city ?? null,
                state: c.state ?? null,
                postal_code: c.postal_code ?? null,
                country: c.country ?? null,
                phone: c.phone ?? null,
                email: c.email ?? null,
                gdpr_consent_status: detail.gdpr_consent_status ?? null,
                upstream_payload: c as unknown as Record<string, unknown>,
                last_synced_at: nowIso,
                updated_at: nowIso,
              },
              { onConflict: 'domain_id,contact_type' },
            );
          }
        }

        // ── DNS zone reconciliation ──
        // OpenSRS owns the truth; SET_DNS_ZONE replaces wholesale, so
        // stale local rows = data-loss bug. Compare every domain.
        try {
          const { records: upstreamRecs } = await opensrs.getDnsZone(domainName);

          const { data: localRecs } = await supabase
            .from('opensrs_dns_records')
            .select('id, record_type, name, value, ttl, priority, source, upstream_status')
            .eq('domain_id', dom.id);

          const localByKey = new Map<string, NonNullable<typeof localRecs>[number]>();
          for (const lr of (localRecs ?? [])) {
            localByKey.set(canonLocal(lr as any), lr);
          }
          const upstreamByKey = new Map<string, DnsRecord>();
          for (const ur of upstreamRecs) {
            upstreamByKey.set(canonUpstream(ur), ur);
          }

          let dnsExtra = 0;
          let dnsMissing = 0;

          // Walk upstream: matches stamp synced; missing-local INSERT
          // with source='upstream' so the row is visible to ops.
          for (const [key, ur] of upstreamByKey) {
            const local = localByKey.get(key);
            if (local) {
              await supabase.from('opensrs_dns_records')
                .update({
                  upstream_status: 'synced',
                  last_synced_at: nowIso,
                  upstream_payload: ur as unknown as Record<string, unknown>,
                  updated_at: nowIso,
                })
                .eq('id', local.id);
            } else {
              await supabase.from('opensrs_dns_records').insert({
                domain_id: dom.id,
                record_type: ur.type,
                name: ur.subdomain === '' ? '@' : ur.subdomain,
                value: dnsRecordValue(ur),
                ttl: ur.ttl ?? 3600,
                priority: ur.priority ?? null,
                source: 'upstream',
                upstream_status: 'extra_in_upstream',
                last_synced_at: nowIso,
                upstream_payload: ur as unknown as Record<string, unknown>,
              });
              dnsExtra += 1;
            }
          }

          // Walk local: anything not in upstream is "missing_in_upstream"
          // — the record exists in our DB but OpenSRS doesn't have it.
          for (const [key, local] of localByKey) {
            if (!upstreamByKey.has(key)) {
              await supabase.from('opensrs_dns_records')
                .update({
                  upstream_status: 'missing_in_upstream',
                  last_synced_at: nowIso,
                  updated_at: nowIso,
                })
                .eq('id', local.id);
              dnsMissing += 1;
            }
          }

          if (dnsExtra > 0 || dnsMissing > 0) {
            await supabase.from('sync_drift').insert({
              sync_run_id: runId ?? null,
              provider: 'opensrs',
              resource_type: 'dns_zone',
              resource_id: domainName,
              drift_type: 'dns_zone_drift',
              details: {
                domain_id: dom.id,
                extra_in_upstream: dnsExtra,
                missing_in_upstream: dnsMissing,
                upstream_count: upstreamRecs.length,
                local_count: localRecs?.length ?? 0,
              },
            });
            driftCount += 1;
          }
        } catch (dnsErr) {
          // DNS reconciliation failure shouldn't abort domain-level
          // reconcile — log and continue.
          console.error(`[reconcile-opensrs] DNS zone for ${domainName} failed:`, dnsErr);
        }

        // ── Drift detection ──
        // (a) expiring_soon — within the renewal warning window.
        if (expiresAt) {
          const daysLeft = (new Date(expiresAt).getTime() - nowMs) / 86_400_000;
          if (daysLeft <= EXPIRY_WARN_DAYS) {
            await supabase.from('sync_drift').insert({
              sync_run_id: runId ?? null,
              provider: 'opensrs',
              resource_type: 'domain',
              resource_id: domainName,
              drift_type: 'expiring_soon',
              details: {
                domain_id: dom.id,
                expires_at: expiresAt,
                days_remaining: Math.round(daysLeft),
                auto_renew: detail.auto_renew ?? null,
              },
            });
            driftCount += 1;
          }
        }

        // (b) status_mismatch — local domains.status vs OpenSRS.
        const localExpected = mapUpstreamToLocalStatus(detail.status);
        if (
          localExpected != null &&
          dom.status != null &&
          dom.status !== localExpected
        ) {
          await supabase.from('sync_drift').insert({
            sync_run_id: runId ?? null,
            provider: 'opensrs',
            resource_type: 'domain',
            resource_id: domainName,
            drift_type: 'status_mismatch',
            details: {
              domain_id: dom.id,
              upstream_status: detail.status,
              local_domain_status: dom.status,
              expected_local_status: localExpected,
            },
          });
          driftCount += 1;
        }

        // (c) transfer_away — the domain is leaving our registrar.
        if (detail.transfer_away_in_progress === true) {
          await supabase.from('sync_drift').insert({
            sync_run_id: runId ?? null,
            provider: 'opensrs',
            resource_type: 'domain',
            resource_id: domainName,
            drift_type: 'transfer_away',
            details: {
              domain_id: dom.id,
              upstream_status: detail.status,
            },
          });
          driftCount += 1;
        }
      } catch (e) {
        // Per-domain failure — log it and continue.
        console.error(`[reconcile-opensrs] domain ${domainName} reconcile failed:`, e);
      }
    }

    // ── Finalize the run ──
    if (runId) {
      await supabase
        .from('sync_runs')
        .update({
          status: 'completed',
          records_scanned: scanned,
          drift_detected: driftCount,
          completed_at: new Date().toISOString(),
        })
        .eq('id', runId);
    }

    return NextResponse.json({
      success: true,
      scanned,
      drift_detected: driftCount,
    });
  } catch (e: any) {
    console.error('[reconcile-opensrs] run failed:', e);
    if (runId) {
      await supabase
        .from('sync_runs')
        .update({
          status: 'failed',
          records_scanned: scanned,
          drift_detected: driftCount,
          completed_at: new Date().toISOString(),
          error: { message: e?.message ?? String(e) },
        })
        .eq('id', runId);
    }
    return NextResponse.json(
      { error: e?.message ?? 'Reconciliation failed' },
      { status: 500 },
    );
  }
}
