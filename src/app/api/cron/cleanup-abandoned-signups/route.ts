import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * GET /api/cron/cleanup-abandoned-signups
 *
 * Daily sweep of customer-initiated signups that never converted.
 *
 * Runs on the industry-standard "create early, recover later" pattern:
 *   - /api/create-subscription tags new accounts with
 *     metadata.signup_status = 'awaiting_payment' (or 'payment_failed'
 *     if their card was declined)
 *   - Stripe webhook flips the status to 'active' on the first paid
 *     invoice (and email_confirm to true)
 *   - This cron deletes rows still stuck at 'awaiting_payment' /
 *     'payment_failed' after MAX_AGE_DAYS days, AS LONG AS no successful
 *     invoice has ever been recorded for them
 *
 * Separate from /api/cron/cleanup-unclaimed because that targets the
 * admin-creates-account-for-client flow (claimed: false), which is a
 * different concept.
 *
 * Safety guards:
 *   - Hard age threshold (30 days) — slow deciders aren't nuked
 *   - Cross-check invoices table — anyone with even one paid invoice is
 *     skipped regardless of signup_status (defense vs. webhook lag)
 *   - Batch cap so a runaway purge can't take down the auth API
 *   - Per-user try/catch so one failure doesn't abort the rest
 */

const MAX_AGE_DAYS = 30;
const BATCH_SIZE = 50;
const ABANDONED_STATUSES = ['awaiting_payment', 'payment_failed'];

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  const cutoffIso = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Pull candidates: users tagged as abandoned-signup, older than threshold.
  // We over-fetch a bit so the per-row safety check (no paid invoices) can
  // still leave us with a reasonable batch.
  const { data: candidates, error } = await sb
    .from('users')
    .select('id, email, full_name, created_at, metadata')
    .in('metadata->>signup_status', ABANDONED_STATUSES)
    .lt('created_at', cutoffIso)
    .limit(BATCH_SIZE * 2);

  if (error) {
    console.error('cleanup-abandoned-signups: query failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!candidates?.length) {
    return NextResponse.json({ message: 'No abandoned signups to clean up', cleaned: 0 });
  }

  let cleaned = 0;
  const results: Array<{ email: string; status: string; error?: string }> = [];

  for (const user of candidates.slice(0, BATCH_SIZE)) {
    try {
      // Defense in depth: skip if there's any paid invoice on file. The
      // webhook should have flipped signup_status to 'active' if so, but
      // if the webhook is delayed or missed an event we don't want to
      // delete a paying customer. Read directly from stripe.invoices
      // (mirrored by Sync Engine) via the user's stripe_customer_id.
      const { data: userRow } = await sb
        .from('users')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .maybeSingle();

      if (userRow?.stripe_customer_id) {
        const { count: paidCount } = await (sb.schema('stripe' as any) as any)
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .eq('customer', userRow.stripe_customer_id)
          .eq('status', 'paid');

        if ((paidCount ?? 0) > 0) {
          results.push({ email: user.email, status: 'skipped — has paid invoices' });
          continue;
        }
      }

      // Skip if all of this user's sites are comped — they're not paying
      // because we explicitly told them they don't have to.
      const { data: userSites } = await sb
        .from('sites')
        .select('id, metadata')
        .eq('user_id', user.id);
      if (userSites && userSites.length > 0 && userSites.every((s: any) => (s.metadata as any)?.comp === true)) {
        results.push({ email: user.email, status: 'skipped — all sites comped' });
        continue;
      }

      // Cascade-delete related rows. We do this manually in case FK
      // cascades aren't set up everywhere. public.subscriptions and
      // public.invoices were dropped in the Sync Engine cutover —
      // stripe.* mirrors stay (managed by the Sync Engine); they're
      // harmless to leave around since the customer ID is gone.
      await sb.from('sites').delete().eq('user_id', user.id);
      await sb.from('domains').delete().eq('user_id', user.id);
      const { data: tickets } = await sb.from('tickets').select('id').eq('user_id', user.id);
      for (const t of tickets ?? []) {
        await sb.from('ticket_messages').delete().eq('ticket_id', t.id);
      }
      await sb.from('tickets').delete().eq('user_id', user.id);
      await sb.from('logs').delete().eq('user_id', user.id);

      await sb.from('users').delete().eq('id', user.id);
      await sb.auth.admin.deleteUser(user.id);

      // Audit log (no user_id — they're gone).
      await sb.from('logs').insert({
        action: 'account.abandoned_signup_purged',
        details: `Abandoned signup deleted: ${user.full_name ?? '(no name)'} (${user.email}) — never converted`,
        level: 'info',
        metadata: {
          deleted_user_id: user.id,
          email: user.email,
          last_signup_status: (user.metadata as any)?.signup_status,
          age_days: Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000),
        },
      });

      cleaned++;
      results.push({ email: user.email, status: 'deleted' });
    } catch (err) {
      results.push({
        email: user.email,
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    scanned: candidates.length,
    cleaned,
    results,
  });
}
