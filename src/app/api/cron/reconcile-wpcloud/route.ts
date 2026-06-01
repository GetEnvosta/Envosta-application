/**
 * GET /api/cron/reconcile-wpcloud
 *
 * Hourly wp.cloud mirror reconciliation.
 *
 * A READ-ONLY sweep that keeps the `wpcloud_sites` mirror table fresh
 * and surfaces drift. It NEVER mutates upstream wp.cloud state — it only
 * writes to local mirror tables (`wpcloud_sites`, `sync_drift`,
 * `sync_runs`).
 *
 * For every `sites` row that has a non-null `wp_cloud_site_id`:
 *   1. getSite()    — site detail (status, php, quota, usage, …)
 *   2. getSiteIp()  — primary IP address
 *   3. getSslInfo() — cert status + expiry (keyed on the site domain)
 * Each upstream call is wrapped individually — one failing call (or one
 * failing site) never aborts the run.
 *
 * Drift detection writes a `sync_drift` row when:
 *   - status_mismatch — the mirror's stored upstream_status differs from
 *     what wp.cloud now reports, OR our local `sites.status` disagrees
 *     with wp.cloud's reported status.
 *   - ssl_expiring   — the SSL cert expires within 21 days.
 *
 * Why we iterate our own `sites` table instead of wp.cloud's list
 * endpoint: the Atomic `get-sites/{client}/+` endpoint has a known URL
 * bug (see wpcloud.ts listSites / listAllSitesRaw), so we drive the
 * sweep off rows we already own.
 *
 * Auth: Vercel cron sends `Authorization: Bearer ${CRON_SECRET}`.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createWpCloudClient } from '@/lib/integrations/wpcloud';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const SSL_EXPIRY_WARN_DAYS = 21;

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}

/** wp.cloud's "is this site healthy" status mapped to our sites.status. */
function mapUpstreamToLocalStatus(upstream: string | null | undefined): string | null {
  if (!upstream) return null;
  const s = upstream.toLowerCase();
  if (['active', 'live', 'ready', 'running'].includes(s)) return 'active';
  if (['suspended', 'paused', 'disabled'].includes(s)) return 'suspended';
  if (['deleted', 'removed'].includes(s)) return 'deleted';
  if (['failed', 'error'].includes(s)) return 'failed';
  if (['provisioning', 'creating', 'pending'].includes(s)) return 'provisioning';
  return null; // unknown — don't claim a mismatch we can't reason about
}

function toIso(v: unknown): string | null {
  if (v === undefined || v === null || v === '') return null;
  const asNum = Number(v);
  const d =
    Number.isFinite(asNum) && String(v).trim() === String(asNum)
      ? new Date(asNum < 1e12 ? asNum * 1000 : asNum)
      : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function toInt(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: Request) {
  // ── Auth ──
  const authHeader = req.headers.get('authorization');
  // Fail-closed: reject when CRON_SECRET is unset (was fail-open before).
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Pause check + last-run stamp (managed in Settings → Crons). Fail-open.
  const { guardCron } = await import('@/lib/crons');
  if (!(await guardCron('reconcile-wpcloud')).enabled) {
    return NextResponse.json({ ok: true, skipped: 'cron paused' });
  }

  const supabase = sb();
  const client = createWpCloudClient();

  // ── Open a sync_runs row ──
  const { data: runRow } = await supabase
    .from('sync_runs')
    .insert({ provider: 'wpcloud', resource_type: 'sites', status: 'running' })
    .select('id')
    .single();
  const runId = runRow?.id as string | undefined;

  let scanned = 0;
  let driftCount = 0;

  try {
    // Iterate OUR sites table — NOT wp.cloud's list endpoint, which has
    // a known URL bug (see wpcloud.ts). Only rows with an upstream id.
    const { data: sites, error: sitesErr } = await supabase
      .from('sites')
      .select('id, status, wp_cloud_site_id, wp_cloud_url, domain_name')
      .not('wp_cloud_site_id', 'is', null);

    if (sitesErr) throw new Error(`sites query failed: ${sitesErr.message}`);

    const nowMs = Date.now();

    for (const site of sites ?? []) {
      const wpId = site.wp_cloud_site_id as string;
      scanned += 1;

      // Per-site try/catch — one bad site never aborts the sweep.
      try {
        // ── 1. Site detail (best-effort) ──
        let detail: Record<string, unknown> = {};
        try {
          detail = (await client.getSite(wpId)) as Record<string, unknown>;
        } catch (e) {
          console.error(`[reconcile-wpcloud] getSite ${wpId} failed:`, e);
        }

        // ── 2. IP (best-effort) ──
        let ipAddress: string | null = null;
        try {
          const ipRes = await client.getSiteIp(site.domain_name ?? wpId);
          ipAddress = ipRes.ip;
        } catch (e) {
          console.error(`[reconcile-wpcloud] getSiteIp ${wpId} failed:`, e);
        }

        // ── 3. SSL (best-effort) — keyed on the site's domain ──
        let sslStatus: string | null = null;
        let sslExpiresAt: string | null = null;
        const sslDomain =
          (detail?.domain_name as string | undefined) ?? site.domain_name ?? null;
        if (sslDomain) {
          try {
            const ssl = await client.getSslInfo(sslDomain);
            sslStatus = ssl.status;
            sslExpiresAt = ssl.expires_at;
          } catch (e) {
            console.error(`[reconcile-wpcloud] getSslInfo ${sslDomain} failed:`, e);
          }
        }

        const upstreamStatus =
          (detail?.status as string | undefined) ?? null;

        // ── Read the existing mirror row to compare for drift ──
        const { data: prevMirror } = await supabase
          .from('wpcloud_sites')
          .select('id, upstream_status')
          .eq('upstream_id', wpId)
          .maybeSingle();

        // ── Upsert the mirror with fresh data ──
        const nowIso = new Date().toISOString();
        const spaceUsedMb = (() => {
          const v =
            (detail?.space_used as unknown) ??
            (detail?.space_used_mb as unknown) ??
            null;
          return v != null && v !== '' ? Number(v) : null;
        })();
        await supabase.from('wpcloud_sites').upsert(
          {
            upstream_id: wpId,
            site_id: site.id,
            wpcom_blog_id:
              detail?.wpcom_blog_id != null
                ? String(detail.wpcom_blog_id)
                : detail?.blog_id != null
                  ? String(detail.blog_id)
                  : null,
            primary_domain: sslDomain,
            upstream_status: upstreamStatus,
            php_version: (detail?.php_version as string | undefined) ?? null,
            geo_affinity: (detail?.geo_affinity as string | undefined) ?? null,
            space_quota_gb: toInt(detail?.space_quota),
            space_used_mb:
              spaceUsedMb != null && Number.isFinite(spaceUsedMb)
                ? Math.round(spaceUsedMb)
                : null,
            php_memory_mb: toInt(detail?.php_memory_limit),
            php_workers: toInt(
              (detail?.php_workers as unknown) ?? detail?.default_php_conns,
            ),
            burst_enabled:
              detail?.burst_php_conns != null
                ? Number(detail.burst_php_conns) > 0
                : null,
            ip_address: ipAddress,
            ssl_status: sslStatus,
            ssl_expires_at: sslExpiresAt,
            upstream_created_at: toIso(
              (detail?.created_at as unknown) ?? detail?.created,
            ),
            upstream_payload: { getSite: detail },
            last_synced_at: nowIso,
            updated_at: nowIso,
          },
          { onConflict: 'upstream_id' },
        );

        // ── Drift detection ──
        // (a) status_mismatch — mirror's prior status changed, or our
        //     local sites.status disagrees with what wp.cloud reports.
        const localExpected = mapUpstreamToLocalStatus(upstreamStatus);
        const mirrorChanged =
          prevMirror?.upstream_status != null &&
          upstreamStatus != null &&
          prevMirror.upstream_status !== upstreamStatus;
        const localDisagrees =
          localExpected != null &&
          site.status != null &&
          site.status !== localExpected;

        if (upstreamStatus != null && (mirrorChanged || localDisagrees)) {
          await supabase.from('sync_drift').insert({
            sync_run_id: runId ?? null,
            provider: 'wpcloud',
            resource_type: 'site',
            resource_id: wpId,
            drift_type: 'status_mismatch',
            details: {
              site_id: site.id,
              upstream_status: upstreamStatus,
              previous_mirror_status: prevMirror?.upstream_status ?? null,
              local_site_status: site.status,
              expected_local_status: localExpected,
            },
          });
          driftCount += 1;
        }

        // (b) ssl_expiring — cert within the warning window.
        if (sslExpiresAt) {
          const daysLeft = (new Date(sslExpiresAt).getTime() - nowMs) / 86_400_000;
          if (daysLeft <= SSL_EXPIRY_WARN_DAYS) {
            await supabase.from('sync_drift').insert({
              sync_run_id: runId ?? null,
              provider: 'wpcloud',
              resource_type: 'site',
              resource_id: wpId,
              drift_type: 'ssl_expiring',
              details: {
                site_id: site.id,
                domain: sslDomain,
                ssl_status: sslStatus,
                ssl_expires_at: sslExpiresAt,
                days_remaining: Math.round(daysLeft),
              },
            });
            driftCount += 1;
          }
        }
      } catch (e) {
        // Per-site failure — log it and continue.
        console.error(`[reconcile-wpcloud] site ${wpId} reconcile failed:`, e);
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
    console.error('[reconcile-wpcloud] run failed:', e);
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
