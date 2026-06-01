import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * GET /api/cron/delete-expired-sites
 *
 * Hard-deletes sites whose subscription has been paused/cancelled past
 * their recovery_deadline (typically the subscription's period_end).
 *
 * Flow that puts a site in this state:
 *   1. Customer cancels subscription (or Stripe sub transitions to paused).
 *   2. Stripe webhook detects pause → for each attached site, sets
 *      status='cancelled' + metadata.recovery_deadline = period_end.
 *   3. This cron runs daily, finds rows where deadline < now(), and calls
 *      wp.cloud delete-site to permanently remove the WordPress install.
 *   4. Site row is marked status='deleted' so it won't be picked up again.
 *
 * Loop / safety guards (paranoia is cheap when deletion is involved):
 *   - Filter is strict: status='cancelled' AND recovery_deadline NOT NULL
 *     AND recovery_deadline < NOW(). Sites without a deadline are skipped.
 *   - BATCH_SIZE caps work per run.
 *   - Each delete is wrapped in try/catch — a single wp.cloud failure
 *     doesn't block the rest of the batch.
 *   - On wp.cloud success the row is marked deleted; on failure it stays
 *     cancelled and the cron will retry next day. After MAX_DELETE_ATTEMPTS
 *     failed runs the row is marked status='failed' so an admin reviews it.
 */

const BATCH_SIZE = 25;
const MAX_DELETE_ATTEMPTS = 5;

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  // Fail-closed: reject when CRON_SECRET is unset. Was fail-open before
  // — a misconfigured env would have made site-deletion publicly callable.
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Pause check + last-run stamp (managed in Settings → Crons). Fail-open.
  const { guardCron } = await import('@/lib/crons');
  if (!(await guardCron('delete-expired-sites')).enabled) {
    return NextResponse.json({ ok: true, skipped: 'cron paused' });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  const nowIso = new Date().toISOString();

  // Pull candidates. Order by oldest deadline first so we don't keep
  // delaying hits for long-overdue sites.
  const { data: candidates, error } = await sb
    .from('sites')
    .select('id, label, wp_cloud_site_id, user_id, metadata')
    .eq('status', 'cancelled')
    .not('metadata->>recovery_deadline', 'is', null)
    .lt('metadata->>recovery_deadline', nowIso)
    .limit(BATCH_SIZE);

  if (error) {
    console.error('delete-expired-sites: query failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Array<{ siteId: string; status: string; error?: string }> = [];

  for (const site of candidates ?? []) {
    const meta = (site.metadata as any) ?? {};

    // Comped sites don't have subscriptions so they should never be in
    // a cancelled-with-deadline state. If they somehow are, skip — comp
    // sites aren't subject to the no-payment reaper.
    if (meta.comp === true) {
      results.push({ siteId: site.id, status: 'skipped — comped site' });
      continue;
    }

    const attempts = (meta.delete_attempts ?? 0) + 1;

    // Persist attempt counter BEFORE firing.
    await sb.from('sites').update({
      metadata: { ...meta, delete_attempts: attempts, delete_last_attempt_at: nowIso },
    }).eq('id', site.id);

    if (!site.wp_cloud_site_id) {
      // Nothing to delete on wp.cloud — just mark row deleted.
      await sb.from('sites').update({ status: 'deleted' }).eq('id', site.id);
      results.push({ siteId: site.id, status: 'deleted (no wp.cloud site)' });
      continue;
    }

    try {
      const origin = process.env.NEXT_PUBLIC_APP_URL
        ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
        : new URL(req.url).origin;
      const res = await fetch(
        `${origin}/api/internal/wpcloud/site-info`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Token': process.env.INTERNAL_API_TOKEN ?? '',
          },
          body: JSON.stringify({ action: 'hard-delete-site', siteId: site.id, userId: site.user_id, actorId: site.user_id }),
        }
      );
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        await sb.from('sites').update({ status: 'deleted' }).eq('id', site.id);
        results.push({ siteId: site.id, status: 'deleted' });
      } else {
        const failPermanent = attempts >= MAX_DELETE_ATTEMPTS;
        if (failPermanent) {
          await sb.from('sites').update({
            status: 'failed',
            metadata: { ...meta, delete_attempts: attempts, delete_last_error: data?.error || `HTTP ${res.status}`, delete_giving_up: true },
          }).eq('id', site.id);
        }
        results.push({
          siteId: site.id,
          status: failPermanent ? 'gave_up' : 'failed',
          error: data?.error || `HTTP ${res.status}`,
        });
      }
    } catch (e: any) {
      const failPermanent = attempts >= MAX_DELETE_ATTEMPTS;
      if (failPermanent) {
        await sb.from('sites').update({
          status: 'failed',
          metadata: { ...meta, delete_attempts: attempts, delete_last_error: String(e), delete_giving_up: true },
        }).eq('id', site.id);
      }
      results.push({ siteId: site.id, status: failPermanent ? 'gave_up' : 'failed', error: String(e) });
    }
  }

  return NextResponse.json({
    scanned: candidates?.length ?? 0,
    processed: results.length,
    results,
  });
}
