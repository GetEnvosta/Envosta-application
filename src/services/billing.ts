/**
 * Billing reads — subscriptions, invoices, payment methods.
 *
 * Backed by our local Supabase mirror of Stripe data (kept in sync by
 * the stripe-webhook edge function). Don't call Stripe directly from
 * here; use API routes that own their Stripe SDK initialization.
 */
import { createClient } from '@/lib/supabase-server';

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTIONS
// ─────────────────────────────────────────────────────────────────────────────

/** User's active/trialing subscriptions with product join. */
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

/** User's subscriptions with product details for billing page. */
export async function getUserSubscriptionsWithDetails() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('subscriptions')
    .select('*, products(name, slug, price_cad, features)')
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false });
  return data ?? [];
}

/** Single subscription by id. */
export async function getSubscriptionById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('subscriptions')
    .select('*, products(name, slug)')
    .eq('id', id)
    .single();
  return data;
}

/** First active subscription (for dashboard overview). */
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

/** Admin: all active subscriptions with product price (for MRR). */
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
  const divisors: Record<string, number> = { monthly: 1, yearly: 12 };
  return Math.round(price / (divisors[period] ?? 1));
}

/** Admin: count of abandoned checkouts (incomplete subscriptions). */
export async function getAbandonedCheckoutCount() {
  const supabase = await createClient();
  const { count } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'incomplete');
  return count ?? 0;
}

/** Admin: recent abandoned checkouts with user info. */
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

/** Admin: all subscriptions with user + product info. */
export async function getAllSubscriptionsAdmin() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('subscriptions')
    .select('*, products(name, slug, price_cad), users(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(200);
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// INVOICES & CUSTOMERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Invoices for a user, ordered by created_at desc.
 */
export async function getUserInvoices(limit: number = 20, userId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data } = await query;
  return data ?? [];
}

/**
 * User info with payment method from Stripe.
 */
export async function getCustomerInfo(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (!data?.stripe_customer_id) return data;

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return data;

    const res = await fetch(
      `https://api.stripe.com/v1/customers/${data.stripe_customer_id}?expand[]=default_source&expand[]=invoice_settings.default_payment_method`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    );
    const customer = await res.json();

    const pm = customer.invoice_settings?.default_payment_method;
    if (pm?.card) {
      return {
        ...data,
        card_brand: pm.card.brand,
        card_last4: pm.card.last4,
        card_expiry: `${String(pm.card.exp_month).padStart(2, '0')}/${pm.card.exp_year}`,
      };
    }

    const src = customer.default_source;
    if (src?.last4) {
      return {
        ...data,
        card_brand: src.brand,
        card_last4: src.last4,
        card_expiry: `${String(src.exp_month).padStart(2, '0')}/${src.exp_year}`,
      };
    }

    // Fallback: Checkout attaches the PM to the subscription, not the customer.
    // Pull the most recent payment method from the customer's payment methods list.
    const pmRes = await fetch(
      `https://api.stripe.com/v1/payment_methods?customer=${data.stripe_customer_id}&type=card&limit=1`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    );
    const pmList = await pmRes.json();
    const latestPm = pmList.data?.[0];
    if (latestPm?.card) {
      return {
        ...data,
        card_brand: latestPm.card.brand,
        card_last4: latestPm.card.last4,
        card_expiry: `${String(latestPm.card.exp_month).padStart(2, '0')}/${latestPm.card.exp_year}`,
      };
    }
  } catch (e) {
    console.error('Failed to fetch payment method:', e);
  }

  return data;
}

/**
 * Admin: billing stats.
 */
export async function getAdminBillingStats() {
  const supabase = await createClient();
  const [
    { count: paidInvoicesCount },
    { count: outstandingInvoicesCount },
  ] = await Promise.all([
    supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
    supabase.from('invoices').select('id', { count: 'exact', head: true }).in('status', ['open', 'draft']),
  ]);

  return {
    paidInvoicesCount: paidInvoicesCount ?? 0,
    outstandingInvoicesCount: outstandingInvoicesCount ?? 0,
  };
}

/**
 * Admin: recent invoices with user info.
 */
export async function getAdminRecentInvoices(limit: number = 30) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('invoices')
    .select('*, users(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

/**
 * Admin: all users with stripe_customer_id (for invoice dropdown).
 */
export async function getAllCustomersWithUsers() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('id, full_name, email, stripe_customer_id')
    .not('stripe_customer_id', 'is', null)
    .order('full_name', { ascending: true });
  return data ?? [];
}
