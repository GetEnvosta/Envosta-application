import { createClient } from '@/lib/supabase-server';

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
