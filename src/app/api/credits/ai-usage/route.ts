import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/services/auth';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Get all AI usage logs for this user this month
  const { data: logs } = await supabase
    .from('logs')
    .select('metadata, created_at')
    .eq('user_id', userId)
    .eq('action', 'ai.usage')
    .gte('created_at', monthStart)
    .order('created_at', { ascending: true });

  // Get their AI token limit (from any active site's guardrail)
  const { data: sites } = await supabase
    .from('sites')
    .select('monthly_ai_token_limit')
    .eq('user_id', userId)
    .in('status', ['active', 'provisioning'])
    .not('monthly_ai_token_limit', 'is', null)
    .limit(1);

  const tokenLimit = sites?.[0]?.monthly_ai_token_limit ?? null;

  // Aggregate
  let totalTokens = 0;
  let totalCredits = 0;
  let totalCalls = 0;
  const byAction: Record<string, { calls: number; tokens: number; credits: number }> = {};
  const daily: Record<string, { tokens: number; credits: number; calls: number }> = {};

  for (const log of logs ?? []) {
    const meta = (log.metadata as any) ?? {};
    const tokens = meta.total_tokens ?? 0;
    const credits = meta.credits_charged ?? 0;
    const action = meta.ai_action ?? 'unknown';
    const day = log.created_at?.substring(0, 10) ?? '';

    totalTokens += tokens;
    totalCredits += credits;
    totalCalls++;

    if (!byAction[action]) byAction[action] = { calls: 0, tokens: 0, credits: 0 };
    byAction[action].calls++;
    byAction[action].tokens += tokens;
    byAction[action].credits += credits;

    if (!daily[day]) daily[day] = { tokens: 0, credits: 0, calls: 0 };
    daily[day].tokens += tokens;
    daily[day].credits += credits;
    daily[day].calls++;
  }

  return NextResponse.json({
    totalTokens,
    totalCredits: Math.round(totalCredits * 100) / 100,
    totalCalls,
    tokenLimit,
    tokenUsagePercent: tokenLimit ? Math.round((totalTokens / tokenLimit) * 100) : null,
    byAction,
    daily,
  });
}
