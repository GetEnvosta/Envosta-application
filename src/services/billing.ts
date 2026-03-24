import { createClient } from '@/lib/supabase-server';

/**
 * Invoices for current user, ordered by created_at desc.
 */
export async function getUserInvoices(limit: number = 20, userId?: string) {
  const supabase = await createClient();

  if (userId) {
    // Invoices are linked via customer_id, not user_id — look up customer first
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!customer) return [];

    const { data } = await supabase
      .from('invoices')
      .select('*')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    return data ?? [];
  }

  // No userId filter — relies on RLS
  const { data } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

/**
 * Customer record with payment method info for a given user.
 * Fetches card details from Stripe if a customer exists.
 */
export async function getCustomerInfo(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data?.stripe_customer_id) return data;

  // Fetch payment method from Stripe
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

    // Fallback: check default source
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
    console.error('Failed to fetch payment method from Stripe:', e);
  }

  return data;
}

/**
 * Admin: billing stats (paid/outstanding invoice counts).
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
 * Admin: recent invoices with customer/user joins.
 */
export async function getAdminRecentInvoices(limit: number = 30) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('invoices')
    .select('*, customers(user_id, users(full_name, email))')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

/**
 * Admin: all customers with user info (for invoice dropdown).
 */
export async function getAllCustomersWithUsers() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('customers')
    .select('id, user_id, stripe_customer_id, billing_email, users(full_name, email)')
    .order('created_at', { ascending: false });
  return data ?? [];
}
