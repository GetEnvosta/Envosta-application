import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * GET /api/cron/retry-stuck-provisions
 *
 * Scheduled sweep that re-fires wp.cloud provisioning for sites stuck in
 * status='provisioning' with no wp_cloud_site_id. The original
 * provision-hosting call from the Stripe webhook is fire-and-forget, so
 * transient wp.cloud errors leave sites permanently stuck without this.
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
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const cutoffIso = new Date(Date.now() - MIN_AGE_SECONDS * 1000).toISOString();
  const { data: stuck, error } = await sb
    .from('sites')
    .select('id, label, user_id, product_id, subscription_id, server_region, php_version, metadata, created_at')
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
    // Skip unclaimed-account placeholder sites — those are intentionally
    // unprovisioned until the customer claims the account and adds billing.
    if (meta.unclaimed === true || meta.auto_provisioned === false) return false;
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

    try {
      const provRes = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/provision-hosting`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            serviceId: site.id,
            label: site.label || 'site',
            region: site.server_region || 'dca',
            phpVersion: site.php_version || '8.4',
            planId: site.product_id,
            userId: site.user_id,
          }),
        }
      );
      const provData = await provRes.json().catch(() => ({}));

      if (provRes.ok) {
        results.push({ siteId: site.id, status: 'retried', attempts });
        // Clear giving_up flag if we somehow recovered after marking it.
        if (givingUp) {
          await sb.from('sites').update({
            metadata: { ...meta, provision_attempts: attempts, provision_giving_up: false, provision_last_attempt_at: new Date().toISOString() },
          }).eq('id', site.id);
        }
      } else {
        results.push({ siteId: site.id, status: 'failed', attempts, error: provData?.error || `HTTP ${provRes.status}` });
      }
    } catch (e: any) {
      results.push({ siteId: site.id, status: 'failed', attempts, error: e?.message || String(e) });
    }
  }

  return NextResponse.json({
    scanned: stuck?.length ?? 0,
    eligible: candidates.length,
    processed: results.length,
    results,
  });
}
