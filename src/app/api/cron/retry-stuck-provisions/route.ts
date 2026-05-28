import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { start } from 'workflow/api';
import { provisionSite } from '@/app/workflows/provision-site';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * GET /api/cron/retry-stuck-provisions
 *
 * Scheduled sweep that re-fires the provisionSite workflow for sites
 * stuck in status='provisioning' with no wp_cloud_site_id. The
 * provisionSite workflow has its own step-level retry semantics; this
 * cron's job is to spot sites where the workflow died entirely (Vercel
 * runtime error, dead-letter, etc.) and re-fire it.
 *
 * ── Loop protection ──────────────────────────────────────────────────
 * Three layers prevent runaway retries:
 *
 * 1. **Per-site attempt cap.** metadata.provision_attempts is incremented
 *    on each retry. Once it hits MAX_ATTEMPTS (5), the site is no longer
 *    auto-retried — admin can still kick it manually via the Retry button
 *    (which calls /api/admin/provision-site and resets the counter).
 *
 * 2. **Exponential backoff.** Each retry waits exponentially longer than
 *    the last: 5 → 10 → 20 → 40 → 80 minutes since the previous attempt.
 *    Stored in metadata.provision_last_attempt_at.
 *
 * 3. **Batch cap.** At most BATCH_SIZE (10) sites are processed per run.
 *    With a 5-minute cron schedule that's 120/hour worst-case across all
 *    customers, well under any reasonable wp.cloud rate limit.
 *
 * Sites that exceed the cap get metadata.provision_giving_up = true so
 * the admin diagnostics page can flag them distinctly from "still trying."
 */

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 10;
const MIN_AGE_SECONDS = 5 * 60; // don't grab sites < 5 min old (webhook may still be working)
const BACKOFF_MINUTES = [0, 5, 10, 20, 40, 80]; // index = attempt number (0 = first retry)

export async function GET(req: Request) {
  // Allow Vercel Cron OR an explicit Bearer match. If CRON_SECRET is set
  // we require it; otherwise we accept any caller (dev convenience).
  const authHeader = req.headers.get('authorization');
  // Fail-closed: if CRON_SECRET is unset, reject ALL callers. Previously
  // this fell open and let anyone hit the route.
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  const cutoffIso = new Date(Date.now() - MIN_AGE_SECONDS * 1000).toISOString();
  const { data: stuck, error } = await sb
    .from('sites')
    // Note: php_version is not a column on `sites` — it's stored in
    // metadata when set, with '8.4' as the default at provision time.
    .select('id, label, user_id, product_id, server_region, metadata, created_at')
    .eq('status', 'provisioning')
    .is('wp_cloud_site_id', null)
    .lt('created_at', cutoffIso)
    .limit(BATCH_SIZE * 3); // fetch a bit more to allow filtering by attempts

  if (error) {
    console.error('retry-stuck-provisions: query failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const candidates = (stuck ?? []).filter((s: any) => {
    const meta = (s.metadata as any) ?? {};
    if (meta.provision_giving_up) return false;
    // Skip sites explicitly tagged as not auto-provisioned (e.g. manual
    // admin-only flows). Unclaimed sites are NOT skipped — admin
    // "Create Account for Client" provisions at creation time, and the
    // initial fire-and-forget call may have failed transiently.
    if (meta.auto_provisioned === false) return false;
    const attempts = meta.provision_attempts ?? 0;
    if (attempts >= MAX_ATTEMPTS) return false;
    // Backoff: skip if we tried too recently for this attempt count.
    const lastAt = meta.provision_last_attempt_at ? new Date(meta.provision_last_attempt_at).getTime() : 0;
    const requiredWaitMin = BACKOFF_MINUTES[Math.min(attempts, BACKOFF_MINUTES.length - 1)];
    if (lastAt && (Date.now() - lastAt) < requiredWaitMin * 60 * 1000) return false;
    return true;
  }).slice(0, BATCH_SIZE);

  const results: Array<{ siteId: string; status: string; attempts: number; error?: string }> = [];

  for (const site of candidates) {
    const meta = (site.metadata as any) ?? {};
    const attempts = (meta.provision_attempts ?? 0) + 1;
    const givingUp = attempts >= MAX_ATTEMPTS;

    // Persist attempt counter BEFORE firing so a hang doesn't loop.
    await sb.from('sites').update({
      metadata: {
        ...meta,
        provision_attempts: attempts,
        provision_last_attempt_at: new Date().toISOString(),
        provision_giving_up: givingUp ? true : meta.provision_giving_up ?? false,
      },
    }).eq('id', site.id);

    // Re-fire the provisionSite workflow. start() is fire-and-forget; the
    // workflow handles its own step retries. If start() throws, the
    // workflow runtime is misconfigured — fall back to inline fetch so
    // stuck sites still get retried.
    try {
      await start(provisionSite, [{
        siteId: site.id,
        userId: site.user_id,
        planSlug: undefined, // not available from sites row; workflow derives from siteId
      }]);
      results.push({ siteId: site.id, status: 'retried', attempts });
    } catch (workflowErr: any) {
      console.error('[retry-stuck-provisions] workflow start failed, falling back to inline:', site.id, workflowErr);
      try {
        const origin = process.env.NEXT_PUBLIC_APP_URL
          ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
          : new URL(req.url).origin;
        const provRes = await fetch(
          `${origin}/api/internal/wpcloud/provision-site`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Token': process.env.INTERNAL_API_TOKEN ?? '',
            },
            body: JSON.stringify({
              siteId: site.id,
              serviceId: site.id,
              label: site.label || 'site',
              region: site.server_region || 'dca',
              phpVersion: (site.metadata as any)?.php_version || '8.4',
              planId: site.product_id,
              userId: site.user_id,
            }),
          }
        );
        const provData = await provRes.json().catch(() => ({}));
        if (provRes.ok) {
          results.push({ siteId: site.id, status: 'retried_inline', attempts });
        } else {
          results.push({ siteId: site.id, status: 'failed', attempts, error: provData?.error || `HTTP ${provRes.status}` });
        }
      } catch (fetchErr: any) {
        results.push({ siteId: site.id, status: 'failed', attempts, error: fetchErr?.message || String(fetchErr) });
      }
    }

    // Clear giving_up flag if we somehow recovered after marking it.
    if (givingUp && results[results.length - 1]?.status?.startsWith('retried')) {
      await sb.from('sites').update({
        metadata: { ...meta, provision_attempts: attempts, provision_giving_up: false, provision_last_attempt_at: new Date().toISOString() },
      }).eq('id', site.id);
    }
  }

  return NextResponse.json({
    scanned: stuck?.length ?? 0,
    eligible: candidates.length,
    processed: results.length,
    results,
  });
}
