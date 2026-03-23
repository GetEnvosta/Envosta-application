import { createClient } from '@/lib/supabase-server';

/**
 * Fetch active/trialing subscriptions with plan join for current user.
 */
export async function getUserSubscriptions(userId?: string) {
  const supabase = await createClient();

  if (userId) {
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!customer) return [];

    const { data } = await supabase
      .from('subscriptions')
      .select('*, plans(name, slug)')
      .eq('customer_id', customer.id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false });
    return data ?? [];
  }

  const { data } = await supabase
    .from('subscriptions')
    .select('*, plans(name, slug)')
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false });
  return data ?? [];
}

/**
 * Fetch active/trialing subscriptions with plan + customer + features for billing page.
 */
export async function getUserSubscriptionsWithDetails() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('subscriptions')
    .select('*, plans(name, slug, price_monthly, features), customers(stripe_customer_id)')
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false });
  return data ?? [];
}

/**
 * Fetch a single subscription by id.
 */
export async function getSubscriptionById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('subscriptions')
    .select('*, plans(name, slug)')
    .eq('id', id)
    .single();
  return data;
}

/**
 * Fetch the first active subscription (for dashboard overview).
 */
export async function getActiveSubscription(userId?: string) {
  const supabase = await createClient();

  if (userId) {
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!customer) return null;

    const { data } = await supabase
      .from('subscriptions')
      .select('*, plans(name, slug)')
      .eq('customer_id', customer.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    return data;
  }

  const { data } = await supabase
    .from('subscriptions')
    .select('*, plans(name, slug)')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  return data;
}

/**
 * Admin: all active subscriptions with plan price info (for MRR calculation).
 */
export async function getAllActiveSubscriptions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('subscriptions')
    .select('*, plans(price_monthly)')
    .eq('status', 'active');
  return data ?? [];
}
