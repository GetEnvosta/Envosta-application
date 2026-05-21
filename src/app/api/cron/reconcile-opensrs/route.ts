/**
 * GET /api/cron/reconcile-opensrs
 *
 * Phase 6 — daily OpenSRS mirror reconciliation (runs 04:00 UTC).
 *
 * A READ-ONLY sweep that keeps the `opensrs_domains` + `opensrs_contacts`
 * mirror tables fresh and surfaces drift. It NEVER mutates upstream
 * OpenSRS state — it only writes local mirror tables (`opensrs_domains`,
 * `opensrs_contacts`, `sync_drift`, `sync_runs`).
 *
 * For every registered `domains` row:
 *   1. getDomainAllInfo() — merged all_info + status fetch (dates,
 *      auto_renew, lock_state, nameservers, contact_set, whois privacy).
 *   2. Upsert `opensrs_domains` with the fresh data.
 *   3. Upsert the (up to) 4 `opensrs_contacts` rows, keyed on
 *      (domain_id, contact_type).
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
 *
 * The EPP auth code (domain_auth_info) is never fetched here.
 *
 * Auth: Vercel cron sends `Authorization: Bearer ${CRON_SECRET}`.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  createOpenSrsClient,
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
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
