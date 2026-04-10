import { createClient } from '@/lib/supabase-server';

/**
 * Get all credit rate products (type='credit_rate').
 * Each has metadata: { service_type, metric, credits_per_unit }
 */
export async function getServicePricing() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('type', 'credit_rate')
    .eq('is_active', true)
    .order('slug');

  return (data ?? []).map((p: any) => ({
    id: p.id,
    service_type: p.metadata?.service_type ?? '',
    metric: p.metadata?.metric ?? '',
    credits_per_unit: Number(p.metadata?.credits_per_unit ?? 0),
    description: p.description,
    is_active: p.is_active,
    slug: p.slug,
  }));
}

export async function updateServicePricing(
  id: string,
  updates: { credits_per_unit?: number; is_active?: boolean; description?: string },
) {
  const supabase = await createClient();

  // Read current metadata to merge
  const { data: current } = await supabase
    .from('products')
    .select('metadata')
    .eq('id', id)
    .single();

  const currentMeta = (current?.metadata as any) ?? {};
  const newMeta = { ...currentMeta };
  if (updates.credits_per_unit !== undefined) newMeta.credits_per_unit = updates.credits_per_unit;

  const dbUpdates: any = { metadata: newMeta, updated_at: new Date().toISOString() };
  if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;
  if (updates.description !== undefined) dbUpdates.description = updates.description;

  const { data } = await supabase
    .from('products')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  return data;
}

/**
 * Calculate monthly credit cost for a WordPress site.
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
      rates[p.metric] = p.credits_per_unit;
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
  const rate = match ? match.credits_per_unit : 0.5;
  return Math.round((totalTokens / 1000) * rate * 10000) / 10000;
}
