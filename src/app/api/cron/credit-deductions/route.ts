import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Daily cron: record pro-rated infrastructure usage for all active users.
 *
 * Runs daily. Calculates each site's monthly cost, divides by days in month,
 * records the daily portion as usage via fn_record_usage.
 */
export async function GET(req: Request) {
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
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  // Load credit rates from products table
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

  // Get all users with active subscriptions
  const { data: activeUsers } = await sb
    .from('subscriptions')
    .select('user_id')
    .eq('status', 'active');

  const userIds = [...new Set((activeUsers ?? []).map(s => s.user_id))];

  let processed = 0;
  const errors: string[] = [];

  for (const userId of userIds) {
    try {
      // Get all active sites for this user
      const { data: sites } = await sb
        .from('sites')
        .select('id, label, config, bursting_enabled')
        .eq('user_id', userId)
        .in('status', ['active', 'provisioning']);

      for (const site of sites ?? []) {
        const config = (site.config as any) ?? {};
        const phpWorkers = config.php_workers ?? 2;
        const ssdGb = config.storage_gb ?? 25;
        const bursting = site.bursting_enabled ?? false;

        // Monthly cost for this site
        let monthlyCost = 0;
        monthlyCost += phpWorkers * (rates['wordpress/php_worker'] ?? 8);
        monthlyCost += ssdGb * (rates['wordpress/ssd_gb'] ?? 0.8);
        if (bursting) monthlyCost += rates['wordpress/bursting'] ?? 10;

        // Daily portion
        const dailyCost = Math.round((monthlyCost / daysInMonth) * 100) / 100;

        if (dailyCost > 0) {
          await sb.rpc('fn_record_usage', {
            p_user_id: userId,
            p_amount: dailyCost,
            p_service_type: 'wordpress',
            p_description: `Daily hosting: ${site.label ?? 'Site'} (${phpWorkers}w/${ssdGb}GB${bursting ? '/burst' : ''})`,
            p_reference_id: site.id,
          });
        }

      }

      processed++;
    } catch (err) {
      errors.push(`User ${userId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    message: 'Daily usage recorded',
    processed,
    daysInMonth,
    errors: errors.length > 0 ? errors : undefined,
  });
}
