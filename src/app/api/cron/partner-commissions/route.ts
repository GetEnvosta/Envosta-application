import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Daily cron (8am UTC, 1 hour after credit deductions):
 * Calculate partner commissions based on client credit spend.
 *
 * Commission tiers by partner avg rating:
 *   0–3.9 stars → 15%
 *   4.0–4.4 stars → 20%
 *   4.5–5.0 stars → 25%
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

  // Get today's credit deductions grouped by user
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

  const { data: deductions } = await sb
    .from('credit_transactions')
    .select('user_id, amount')
    .eq('type', 'deduction')
    .gte('created_at', startOfDay);

  if (!deductions?.length) {
    return NextResponse.json({ message: 'No deductions today', processed: 0 });
  }

  // Group deductions by user
  const userTotals: Record<string, number> = {};
  for (const d of deductions) {
    userTotals[d.user_id] = (userTotals[d.user_id] ?? 0) + Math.abs(d.amount);
  }

  // Get users who have a partner
  const userIds = Object.keys(userTotals);
  const { data: usersWithPartners } = await sb
    .from('users')
    .select('id, partner_id')
    .in('id', userIds)
    .not('partner_id', 'is', null);

  if (!usersWithPartners?.length) {
    return NextResponse.json({ message: 'No partnered users with deductions', processed: 0 });
  }

  let processed = 0;
  const errors: string[] = [];

  // Cache partner ratings to avoid repeated queries
  const partnerRates: Record<string, number> = {};

  for (const user of usersWithPartners) {
    const partnerId = user.partner_id!;
    const totalSpend = userTotals[user.id];
    if (!totalSpend || totalSpend <= 0) continue;

    try {
      // Get commission rate (cached per partner)
      if (!(partnerId in partnerRates)) {
        const { data: avgRating } = await sb.rpc('fn_calculate_partner_avg_rating', {
          p_partner_id: partnerId,
        });
        const rating = Number(avgRating ?? 0);
        partnerRates[partnerId] = rating >= 4.5 ? 0.25 : rating >= 4.0 ? 0.20 : 0.15;
      }

      const rate = partnerRates[partnerId];
      const commissionAmount = Math.round(totalSpend * rate * 100); // in cents

      if (commissionAmount <= 0) continue;

      // Check for duplicate (same earner + customer + today)
      const { data: existing } = await sb
        .from('commissions')
        .select('id')
        .eq('earner_id', partnerId)
        .eq('customer_id', user.id)
        .eq('type', 'partner')
        .gte('created_at', startOfDay)
        .maybeSingle();

      if (existing) continue; // Already processed

      await sb.from('commissions').insert({
        type: 'partner',
        earner_id: partnerId,
        customer_id: user.id,
        amount_cad: commissionAmount,
        status: 'approved', // auto-approved
        payout_method: 'stripe_credit',
        notes: `${(rate * 100).toFixed(0)}% of ${totalSpend} credits ($${(totalSpend).toFixed(2)} CAD)`,
      });

      processed++;
    } catch (err) {
      errors.push(`Partner ${partnerId} / Client ${user.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    message: 'Partner commissions calculated',
    processed,
    errors: errors.length > 0 ? errors : undefined,
  });
}
