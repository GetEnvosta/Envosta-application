import { createClient } from '@/lib/supabase-server';

/**
 * Check if a user has exceeded their daily AI token budget.
 * Uses monthly_ai_token_limit from sites, divided by 30.
 */
export async function checkAiTokenBudget(userId: string): Promise<{
  allowed: boolean;
  dailyUsed: number;
  dailyLimit: number | null;
}> {
  const supabase = await createClient();
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

  // Get today's token usage
  const { data: todayLogs } = await supabase
    .from('logs')
    .select('metadata')
    .eq('user_id', userId)
    .eq('action', 'ai.usage')
    .gte('created_at', startOfDay);

  let dailyUsed = 0;
  for (const log of todayLogs ?? []) {
    dailyUsed += (log.metadata as any)?.total_tokens ?? 0;
  }

  // Get their monthly limit
  const { data: sites } = await supabase
    .from('sites')
    .select('monthly_ai_token_limit')
    .eq('user_id', userId)
    .in('status', ['active', 'provisioning'])
    .not('monthly_ai_token_limit', 'is', null)
    .limit(1);

  const monthlyLimit = sites?.[0]?.monthly_ai_token_limit ?? null;
  const dailyLimit = monthlyLimit ? Math.floor(monthlyLimit / 30) : null;

  return {
    allowed: dailyLimit ? dailyUsed < dailyLimit : true,
    dailyUsed,
    dailyLimit,
  };
}
