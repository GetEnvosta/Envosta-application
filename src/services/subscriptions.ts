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
    .select('*, products(price_cad)')
    .eq('status', 'active');
  return data ?? [];
}

/**
 * Admin: all subscriptions with user + product info.
 */
export async function getAllSubscriptionsAdmin() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('subscriptions')
    .select('*, products(name, slug, price_cad), users(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(200);
  return data ?? [];
}
