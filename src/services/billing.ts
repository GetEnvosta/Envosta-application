import { createClient } from '@/lib/supabase-server';

/**
 * Invoices for current user, ordered by created_at desc.
 */
export async function getUserInvoices(limit: number = 20) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

/**
 * Customer record with payment method info for a given user.
 */
export async function getCustomerInfo(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
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
