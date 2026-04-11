import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/services/auth';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get('siteId');
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  const supabase = await createClient();

  // Get user's cycle_start for time range
  const { data: user } = await supabase
    .from('users')
    .select('cycle_start')
    .eq('id', userId)
    .single();

  const cycleStart = user?.cycle_start ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  // Get all usage and AI logs for this site this cycle
  const [{ data: usageLogs }, { data: aiLogs }, { data: callLogs }] = await Promise.all([
    supabase
      .from('logs')
      .select('metadata')
      .eq('action', 'usage.recorded')
      .eq('site_id', siteId)
      .gte('created_at', cycleStart),
    supabase
      .from('logs')
      .select('metadata')
      .eq('action', 'ai.usage')
      .eq('site_id', siteId)
      .gte('created_at', cycleStart),
    supabase
      .from('logs')
      .select('metadata')
      .eq('action', 'receptionist.call')
      .eq('site_id', siteId)
      .gte('created_at', cycleStart),
  ]);

  // Aggregate usage by type
  let hosting = 0;
  let phoneNumber = 0;
  for (const log of usageLogs ?? []) {
    const m = (log.metadata as any) ?? {};
    if (m.service_type === 'wordpress') hosting += Number(m.amount ?? 0);
    if (m.service_type === 'twilio_number') phoneNumber += Number(m.amount ?? 0);
  }

  // AI usage
  let aiTokens = 0;
  let aiCalls = 0;
  let aiTotalTokens = 0;
  for (const log of aiLogs ?? []) {
    const m = (log.metadata as any) ?? {};
    aiTokens += Number(m.credits_charged ?? 0);
    aiTotalTokens += Number(m.total_tokens ?? 0);
    aiCalls++;
  }

  // Receptionist calls
  let receptionistCredits = 0;
  let receptionistCalls = 0;
  let receptionistMinutes = 0;
  for (const log of callLogs ?? []) {
    const m = (log.metadata as any) ?? {};
    receptionistCredits += Number(m.credits_charged ?? 0);
    receptionistMinutes += Number(m.duration_minutes ?? 0);
    receptionistCalls++;
  }

  return NextResponse.json({
    hosting: Math.round(hosting * 100) / 100,
    ai_tokens: Math.round(aiTokens * 100) / 100,
    ai_calls: aiCalls,
    ai_total_tokens: aiTotalTokens,
    receptionist_credits: Math.round(receptionistCredits * 100) / 100,
    receptionist_calls: receptionistCalls,
    receptionist_minutes: receptionistMinutes,
    phone_number: Math.round(phoneNumber * 100) / 100,
    total: Math.round((hosting + aiTokens + receptionistCredits + phoneNumber) * 100) / 100,
  });
}
