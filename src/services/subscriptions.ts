import { createClient } from '@/lib/supabase-server';

/**
 * User's active/trialing subscriptions with product join.
 */
export async function getUserSubscriptions(userId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('subscriptions')
    .select('*, products(name, slug)')
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false });

  if (userId) query = query.eq('user_id', userId);
  const { data } = await query;
  return data ?? [];
}

/**
 * User's subscriptions with product details for billing page.
 */
export async function getUserSubscriptionsWithDetails() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('subscriptions')
    .select('*, products(name, slug, price_cad, features)')
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false });
  return data ?? [];
}

/**
 * Single subscription by id.
 */
export async function getSubscriptionById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('subscriptions')
    .select('*, products(name, slug)')
    .eq('id', id)
    .single();
  return data;
}

/**
 * First active subscription (for dashboard overview).
 */
export async function getActiveSubscription(userId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('subscriptions')
    .select('*, products(name, slug)')
    .eq('status', 'active')
    .limit(1);

  if (userId) query = query.eq('user_id', userId);
  const { data } = await query.maybeSingle();
  return data;
}

/**
 * Admin: all active subscriptions with product price (for MRR).
 */
export async function getAllActiveSubscriptions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('subscriptions')
    .select('*, products(price_cad, type)')
    .eq('status', 'active');
  return data ?? [];
}

/** Convert a subscription's price to monthly equivalent based on billing period. */
export function toMonthly(sub: any): number {
  const price = sub.products?.price_cad ?? 0;
  const period = sub.billing_period ?? 'monthly';
  const divisors: Record<string, number> = { monthly: 1, yearly: 12, '2yr': 24, '3yr': 36 };
  return Math.round(price / (divisors[period] ?? 1));
}

/**
 * Admin: count of abandoned checkouts (incomplete subscriptions).
 */
export async function getAbandonedCheckoutCount() {
  const supabase = await createClient();
  const { count } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'incomplete');
  return count ?? 0;
}

/**
 * Admin: recent abandoned checkouts with user info.
 */
export async function getAbandonedCheckouts(limit = 20) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('subscriptions')
    .select('*, products(name, type), users(full_name, email)')
    .eq('status', 'incomplete')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

/**
 * Admin: all subscriptions with user + product info.
 */
export async function getAllSubscriptionsAdmin() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('subscriptions')
    .select('*, products(name, slug, price_cad), users(full_name, email, usage_this_cycle, included_credits)')
    .order('created_at', { ascending: false })
    .limit(200);
  return data ?? [];
}
