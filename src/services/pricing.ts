import { createClient } from '@/lib/supabase-server';

export async function getServicePricing() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('service_credit_pricing')
    .select('*')
    .eq('is_active', true)
    .order('service_type');

  return data ?? [];
}

export async function updateServicePricing(
  id: string,
  updates: { credits_per_unit?: number; is_active?: boolean; description?: string },
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('service_credit_pricing')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  return data;
}

/**
 * Calculate monthly credit cost for a WordPress site based on its config.
 */
export async function calculateSiteCreditCost(config: {
  php_workers?: number;
  ssd_gb?: number;
  bursting?: boolean;
}) {
  const pricing = await getServicePricing();

  const rates: Record<string, number> = {};
  for (const p of pricing) {
    if (p.service_type === 'wordpress') {
      rates[p.metric] = Number(p.credits_per_unit);
    }
  }

  let total = 0;
  total += (config.php_workers ?? 2) * (rates['php_worker'] ?? 5);
  total += (config.ssd_gb ?? 10) * (rates['ssd_gb'] ?? 0.5);
  if (config.bursting) total += rates['bursting'] ?? 10;

  return Math.round(total * 100) / 100;
}

/**
 * Calculate credit cost for AI token usage.
 */
export async function calculateAiTokenCost(totalTokens: number) {
  const pricing = await getServicePricing();
  const match = pricing.find(
    (p) => p.service_type === 'ai_tokens' && p.metric === 'per_1k_tokens',
  );
  const rate = match ? Number(match.credits_per_unit) : 0.5;
  return Math.round((totalTokens / 1000) * rate * 10000) / 10000;
}
