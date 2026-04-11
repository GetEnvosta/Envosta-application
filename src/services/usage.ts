import { createClient } from '@/lib/supabase-server';

// ── Usage Meter ────────────────────────────────────────────

export async function getUsageMeter(userId: string) {
  const supabase = await createClient();

  const { data: user } = await supabase
    .from('users')
    .select('usage_this_cycle, included_credits, cycle_start, spending_cap')
    .eq('id', userId)
    .single();

  const usage = Number(user?.usage_this_cycle ?? 0);
  const included = user?.included_credits ?? 36;
  const cycleStart = user?.cycle_start ? new Date(user.cycle_start) : new Date();

  // Calculate projection
  const now = new Date();
  const daysElapsed = Math.max(1, Math.ceil((now.getTime() - cycleStart.getTime()) / 86400000));
  const dailyRate = usage / daysElapsed;
  const daysInCycle = 30; // approximate
  const daysRemaining = Math.max(0, daysInCycle - daysElapsed);
  const projectedTotal = Math.round(dailyRate * daysInCycle * 100) / 100;
  const projectedOverage = Math.max(0, Math.round((projectedTotal - included) * 100) / 100);
  const currentOverage = Math.max(0, Math.round((usage - included) * 100) / 100);
  const usagePercent = included > 0 ? Math.round((usage / included) * 100) : 0;

  return {
    usage_this_cycle: Math.round(usage * 100) / 100,
    included_credits: included,
    cycle_start: user?.cycle_start,
    days_elapsed: daysElapsed,
    days_remaining: daysRemaining,
    usage_percent: usagePercent,
    current_overage: currentOverage,
    spending_cap: user?.spending_cap ?? null,
    projected_total: projectedTotal,
    projected_overage: projectedOverage,
    estimated_bill: included > 0 ? 36 + Math.max(0, projectedOverage) : 0, // $36 base + overage
  };
}

// ── Usage Breakdown ────────────────────────────────────────

export async function getUsageBreakdown(
  userId: string,
  startDate?: string,
  endDate?: string,
) {
  const supabase = await createClient();
  let query = supabase
    .from('logs')
    .select('metadata')
    .eq('user_id', userId)
    .eq('action', 'usage.recorded');

  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const { data } = await query;

  const breakdown: Record<string, number> = {};
  for (const row of data ?? []) {
    const meta = (row.metadata as any) ?? {};
    const svc = meta.service_type ?? 'other';
    breakdown[svc] = (breakdown[svc] ?? 0) + Number(meta.amount ?? 0);
  }

  return breakdown;
}

// ── Record Usage ───────────────────────────────────────────

export async function recordUsage(
  userId: string,
  amount: number,
  serviceType: string,
  description: string,
  referenceId?: string,
) {
  const supabase = await createClient();
  const { data } = await supabase.rpc('fn_record_usage', {
    p_user_id: userId,
    p_amount: amount,
    p_service_type: serviceType,
    p_description: description,
    p_reference_id: referenceId ?? null,
  });

  const newUsage = Number(data ?? 0);

  // Send threshold emails (one-shot per cycle)
  const { data: user } = await supabase
    .from('users')
    .select('email, full_name, included_credits')
    .eq('id', userId)
    .single();

  if (user?.email) {
    const included = user.included_credits ?? 36;
    const pct = included > 0 ? (newUsage / included) * 100 : 0;

    // Check if we already sent this threshold email this cycle
    const checkThreshold = async (threshold: number) => {
      const { data: existing } = await supabase
        .from('logs')
        .select('id')
        .eq('user_id', userId)
        .eq('action', `usage.threshold_${threshold}`)
        .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()) // within last 30 days
        .maybeSingle();
      return !existing;
    };

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && pct >= 100 && await checkThreshold(100)) {
      await supabase.from('logs').insert({ user_id: userId, action: 'usage.threshold_100', details: `Usage exceeded included credits: ${newUsage}/${included}`, level: 'info' });
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Envosta <noreply@email.envosta.com>', to: user.email,
          subject: `You've exceeded your included credits`,
          html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:40px 20px"><div style="background:#fff;border-radius:12px;padding:40px 32px"><h1 style="font-size:22px;font-weight:600;color:#111;margin:0 0 16px">Usage Update</h1><p style="font-size:15px;color:#555;line-height:1.7">Hey ${user.full_name ?? 'there'}, you've used <strong>${Math.round(newUsage)} of ${included}</strong> included credits this cycle. Any additional usage will be billed as overage at $1/credit when your cycle renews.</p><a href="https://my.envosta.com/dashboard/billing" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:500;margin:8px 0">View Usage</a></div></div>`,
        }),
      });
    } else if (resendKey && pct >= 80 && pct < 100 && await checkThreshold(80)) {
      await supabase.from('logs').insert({ user_id: userId, action: 'usage.threshold_80', details: `Usage at 80%: ${newUsage}/${included}`, level: 'info' });
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Envosta <noreply@email.envosta.com>', to: user.email,
          subject: `You've used 80% of your included credits`,
          html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:40px 20px"><div style="background:#fff;border-radius:12px;padding:40px 32px"><h1 style="font-size:22px;font-weight:600;color:#111;margin:0 0 16px">Usage Update</h1><p style="font-size:15px;color:#555;line-height:1.7">Hey ${user.full_name ?? 'there'}, you've used <strong>${Math.round(newUsage)} of ${included}</strong> included credits this cycle (${Math.round(pct)}%). Usage beyond your included amount will be billed as overage at $1/credit.</p><a href="https://my.envosta.com/dashboard/billing" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:500;margin:8px 0">View Usage</a></div></div>`,
        }),
      });
    }
  }

  return newUsage;
}

// ── Usage History ──────────────────────────────────────────

export async function getUsageHistory(userId: string, limit = 50, offset = 0) {
  const supabase = await createClient();
  const { data, count } = await supabase
    .from('logs')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('action', 'usage.recorded')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const entries = (data ?? []).map((log: any) => {
    const meta = (log.metadata as any) ?? {};
    return {
      id: log.id,
      amount: meta.amount ?? 0,
      usage_after: meta.usage_this_cycle_after ?? 0,
      service_type: meta.service_type ?? 'other',
      description: log.details,
      created_at: log.created_at,
    };
  });

  return { entries, total: count ?? 0 };
}

// ── Admin ──────────────────────────────────────────────────

export async function getAdminUsageStats() {
  const supabase = await createClient();

  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, email, usage_this_cycle, included_credits')
    .gt('usage_this_cycle', 0);

  let totalUsage = 0;
  const overIncluded: any[] = [];
  let projectedOverageRevenue = 0;

  for (const u of users ?? []) {
    const usage = Number(u.usage_this_cycle ?? 0);
    const included = u.included_credits ?? 36;
    totalUsage += usage;
    if (usage > included) {
      const overage = Math.round((usage - included) * 100) / 100;
      overIncluded.push({ ...u, overage });
      projectedOverageRevenue += overage;
    }
  }

  return {
    totalUsage: Math.round(totalUsage * 100) / 100,
    activeUsers: (users ?? []).length,
    usersOverIncluded: overIncluded,
    projectedOverageRevenue: Math.round(projectedOverageRevenue * 100) / 100,
  };
}

export async function adjustUsage(userId: string, amount: number, description: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc('fn_record_usage', {
    p_user_id: userId,
    p_amount: amount,
    p_service_type: 'manual',
    p_description: description,
    p_reference_id: null,
  });
  return Number(data ?? 0);
}
