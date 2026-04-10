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
        .select('id, label, config, metadata, bursting_enabled, twilio_phone_number')
        .eq('user_id', userId)
        .in('status', ['active', 'provisioning']);

      for (const site of sites ?? []) {
        const config = (site.config as any) ?? {};
        const phpWorkers = config.php_workers ?? 2;
        const ssdGb = config.storage_gb ?? 25;
        const bursting = site.bursting_enabled ?? false;

        let siteCost = 0;
        siteCost += phpWorkers * (rates['wordpress/php_worker'] ?? 8);
        siteCost += ssdGb * (rates['wordpress/ssd_gb'] ?? 0.8);
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

      // ── Twilio phone number monthly billing ──
      const phoneSites = (sites ?? []).filter((s: any) => s.twilio_phone_number);
      const phoneRate = rates['twilio_number/per_month'] ?? 2;
      for (const ps of phoneSites) {
        if (phoneRate > 0) {
          await sb.rpc('fn_deduct_credits', {
            p_user_id: userId,
            p_amount: Math.round(phoneRate),
            p_service_type: 'twilio_number',
            p_description: `Phone number: ${ps.twilio_phone_number}`,
            p_reference_id: ps.id,
            p_priority: 'purchased',
          });
        }
      }

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

  // ── Daily spend alerting — notify admin of high spenders ──
  const HIGH_SPEND_THRESHOLD = 100;
  try {
    const { data: todayDeductions } = await sb
      .from('logs')
      .select('user_id, metadata')
      .eq('action', 'credit.deduction')
      .gte('created_at', new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString());

    const dailySpend: Record<string, number> = {};
    for (const d of todayDeductions ?? []) {
      const amt = Math.abs((d.metadata as any)?.amount ?? 0);
      dailySpend[d.user_id] = (dailySpend[d.user_id] ?? 0) + amt;
    }

    for (const [uid, spend] of Object.entries(dailySpend)) {
      if (spend > HIGH_SPEND_THRESHOLD) {
        const { data: u } = await sb.from('users').select('full_name, email').eq('id', uid).single();
        await sb.from('logs').insert({
          user_id: uid,
          action: 'credits.high_daily_spend',
          details: `Daily spend: ${spend} credits (threshold: ${HIGH_SPEND_THRESHOLD})`,
          level: 'warn',
          metadata: { daily_spend: spend, threshold: HIGH_SPEND_THRESHOLD },
        });

        // Email admin
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Envosta <noreply@email.envosta.com>',
              to: 'admin@envosta.com',
              subject: `[Alert] High daily spend: ${u?.email ?? uid}`,
              html: `<p><strong>${u?.full_name ?? 'User'}</strong> (${u?.email ?? uid}) spent <strong>${spend} credits</strong> today (threshold: ${HIGH_SPEND_THRESHOLD}).</p>`,
            }),
          });
        }
      }
    }
  } catch (alertErr) {
    console.error('Daily spend alert error (non-fatal):', alertErr);
  }

  return NextResponse.json({
    message: `Credit deductions completed`,
    processed,
    errors: errors.length > 0 ? errors : undefined,
  });
}
