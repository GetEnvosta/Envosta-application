import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min for processing all users

/**
 * Daily cron: deduct credits for active WordPress sites and domains.
 * Runs daily, checks each user's billing anniversary.
 */
export async function GET(req: Request) {
  // Verify cron secret (Vercel cron sends this header)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const today = new Date();
  const dayOfMonth = today.getDate();

  // Get all users with active subscriptions
  const { data: activeSubscriptions } = await sb
    .from('subscriptions')
    .select('user_id, current_period_start, products(type, slug)')
    .eq('status', 'active');

  if (!activeSubscriptions?.length) {
    return NextResponse.json({ message: 'No active subscriptions', processed: 0 });
  }

  // Get unique users whose billing anniversary matches today
  const usersToProcess = new Set<string>();
  for (const sub of activeSubscriptions) {
    const product = sub.products as any;
    if (product?.type !== 'hosting_plan') continue;

    const periodStart = sub.current_period_start ? new Date(sub.current_period_start) : null;
    if (!periodStart) continue;

    // Check if today is the billing anniversary day
    const billingDay = periodStart.getDate();
    if (billingDay === dayOfMonth) {
      usersToProcess.add(sub.user_id);
    }
  }

  // Load credit rates from products table (type='credit_rate')
  const { data: pricing } = await sb
    .from('products')
    .select('metadata, is_active')
    .eq('type', 'credit_rate')
    .eq('is_active', true);

  const rates: Record<string, number> = {};
  for (const p of pricing ?? []) {
    const m = (p.metadata as any) ?? {};
    if (m.service_type && m.metric) {
      rates[`${m.service_type}/${m.metric}`] = Number(m.credits_per_unit ?? 0);
    }
  }

  let processed = 0;
  const errors: string[] = [];

  for (const userId of usersToProcess) {
    try {
      // ── WordPress site deductions (FIRST — subscription credits allocated to hosting) ──
      // WordPress hosting always draws from subscription credits first.
      // This ensures the 50 free monthly credits go toward hosting before anything else.
      const { data: sites } = await sb
        .from('sites')
        .select('id, label, config, metadata, bursting_enabled')
        .eq('user_id', userId)
        .in('status', ['active', 'provisioning']);

      for (const site of sites ?? []) {
        const config = (site.config as any) ?? {};
        const phpWorkers = config.php_workers ?? 2;
        const ssdGb = config.storage_gb ?? 10;
        const bursting = site.bursting_enabled ?? false;

        let siteCost = 0;
        siteCost += phpWorkers * (rates['wordpress/php_worker'] ?? 5);
        siteCost += ssdGb * (rates['wordpress/ssd_gb'] ?? 0.5);
        if (bursting) siteCost += rates['wordpress/bursting'] ?? 10;

        if (siteCost > 0) {
          await sb.rpc('fn_deduct_credits', {
            p_user_id: userId,
            p_amount: Math.round(siteCost),
            p_service_type: 'wordpress',
            p_description: `Monthly hosting: ${site.label ?? 'Site'} (${phpWorkers} workers, ${ssdGb}GB)`,
            p_reference_id: site.id,
            p_priority: 'subscription', // hosting gets subscription credits first
          });
        }
      }

      // Domains are billed as separate Stripe yearly subscriptions (not credits).

      // ── Check for negative balance → log warning ──
      const { data: userBalance } = await sb
        .from('users')
        .select('subscription_credits, purchased_credits, auto_refill_enabled, auto_refill_threshold')
        .eq('id', userId)
        .single();

      if (userBalance) {
        const total = (userBalance.subscription_credits ?? 0) + (userBalance.purchased_credits ?? 0);
        if (total < 0) {
          await sb.from('logs').insert({
            user_id: userId,
            action: 'credits.negative_balance',
            details: `User balance is ${total} credits after monthly deductions`,
            level: 'warn',
          });
        }

        if (userBalance.auto_refill_enabled && total < (userBalance.auto_refill_threshold ?? 10)) {
          await sb.from('logs').insert({
            user_id: userId,
            action: 'credits.auto_refill_needed',
            details: `Balance ${total} below threshold ${userBalance.auto_refill_threshold}`,
            level: 'info',
          });
        }
      }

      processed++;
    } catch (err) {
      const msg = `User ${userId}: ${err instanceof Error ? err.message : String(err)}`;
      errors.push(msg);
      console.error('Credit deduction error:', msg);
    }
  }

  return NextResponse.json({
    message: `Credit deductions completed`,
    processed,
    errors: errors.length > 0 ? errors : undefined,
  });
}
