/**
 * Admin dashboard read helpers — counts, recent signups, and other
 * top-of-funnel queries used by /admin pages. Reads only; mutations
 * live in the relevant API routes (e.g. /api/admin/*).
 *
 * Post Stripe-Sync-Engine cutover: subscriptions + invoices live in
 * the `stripe` schema, not local public.subscriptions / public.invoices.
 * Customer-detail joins fetch the user's single account subscription
 * via `getAccountSubscriptionWithProduct(userId)` and their invoices
 * via `getAccountInvoices(userId)`.
 */
import { createClient } from '@/lib/supabase-server';
import {
  getAccountSubscriptionWithProduct,
  getAccountInvoices,
} from '@/services/billing';

/**
 * Dashboard stats: counts for customers, active services, registered domains.
 */
export async function getDashboardCounts() {
  const supabase = await createClient();
  const [
    { count: customersCount },
    { count: servicesCount },
    { count: domainsCount },
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
    supabase.from('sites').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('domains').select('id', { count: 'exact', head: true }).eq('status', 'registered'),
  ]);

  return {
    customersCount: customersCount ?? 0,
    servicesCount: servicesCount ?? 0,
    domainsCount: domainsCount ?? 0,
  };
}

/**
 * Recent customer signups.
 */
export async function getRecentCustomers(limit: number = 10) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'customer')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

/**
 * Recent activity logs with user info.
 */
export async function getRecentActivity(limit: number = 10) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('logs')
    .select('*, users(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

/**
 * All customers with optional search filter. Subscription status is
 * fetched per-row from stripe.subscriptions (Sync Engine mirror) via
 * the customer's stripe_customer_id — cross-schema PostgREST joins are
 * iffy, so we do a single batched lookup instead.
 */
export async function getAllCustomers(search?: string) {
  const supabase = await createClient();

  let query = supabase
    .from('users')
    .select('*, sites(id), domains(id)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data } = await query;
  const users = data ?? [];

  // Batch-fetch sub status by stripe_customer_id.
  const customerIds = users
    .map((u: any) => u.stripe_customer_id)
    .filter((cid: any): cid is string => typeof cid === 'string' && cid.length > 0);
  let subStatusByCustomer = new Map<string, string>();
  if (customerIds.length > 0) {
    const stripeSchema: any = (supabase as any).schema('stripe' as any);
    const { data: subs } = await stripeSchema
      .from('subscriptions')
      .select('customer, status, created')
      .in('customer', customerIds)
      .in('status', ['active', 'trialing', 'past_due', 'paused', 'incomplete'])
      .order('created', { ascending: false });
    for (const s of (subs as any[]) ?? []) {
      // First seen (most recent) wins per customer.
      if (!subStatusByCustomer.has(s.customer)) {
        subStatusByCustomer.set(s.customer, s.status);
      }
    }
  }

  return users.map((u: any) => ({
    ...u,
    site_count: Array.isArray(u.sites) ? u.sites.length : 0,
    domain_count: Array.isArray(u.domains) ? u.domains.length : 0,
    sub_status: u.stripe_customer_id ? subStatusByCustomer.get(u.stripe_customer_id) ?? null : null,
    sites: undefined,
    domains: undefined,
  }));
}

/**
 * Dashboard overview counts for the user-facing dashboard.
 */
export async function getUserDashboardCounts(userId: string) {
  const supabase = await createClient();
  const [
    { count: sitesCount },
    { count: domainsCount },
  ] = await Promise.all([
    supabase.from('sites').select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('status', 'in', '("cancelled","deleted")'),
    supabase.from('domains').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  return {
    sitesCount: sitesCount ?? 0,
    domainsCount: domainsCount ?? 0,
  };
}

/**
 * Recent services for the user dashboard (limited).
 */
export async function getRecentUserServices(userId: string, limit: number = 5) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('sites')
    .select('*')
    .eq('user_id', userId)
    .not('status', 'in', '("cancelled","deleted")')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

/**
 * Recent domains for the user dashboard (limited).
 */
export async function getRecentUserDomains(userId: string, limit: number = 5) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('domains')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

/**
 * Single customer by id with all their data.
 */
export async function getCustomerById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  return data;
}

/**
 * Get all data related to a customer: services, domains, subscriptions, logs.
 *
 * Subscriptions + invoices come from the stripe.* mirror (Sync Engine).
 * The shape returned is normalized so the admin UI can keep reading the
 * familiar field names (status, billing_period, current_period_end,
 * stripe_subscription_id, products, amount_cad, description, …).
 */
export async function getCustomerRelatedData(userId: string) {
  const supabase = await createClient();
  const [
    { data: services },
    { data: domains },
    accountSub,
    accountInvoices,
    { data: logs },
  ] = await Promise.all([
    supabase
      .from('sites')
      .select('*, products(name, slug, price_cad, metadata)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('domains')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    getAccountSubscriptionWithProduct(userId),
    getAccountInvoices(userId, 20),
    supabase
      .from('logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  // Build a single-element "subscriptions" array for back-compat with the
  // admin UI, which expects an array of subs (was the [hosting + domain]
  // arrangement previously). Today the user has ≤1 account sub from
  // Stripe; domain renewals are managed separately.
  const subscriptions: any[] = [];
  if (accountSub) {
    subscriptions.push({
      ...accountSub,
      stripe_subscription_id: accountSub.id,
      products: accountSub.product,
      created_at: accountSub.created ? new Date(typeof accountSub.created === 'number' ? accountSub.created * 1000 : accountSub.created).toISOString() : null,
      current_period_end: accountSub.current_period_end
        ? new Date(typeof accountSub.current_period_end === 'number' ? accountSub.current_period_end * 1000 : accountSub.current_period_end).toISOString()
        : null,
    });
  }

  // Shape invoices for back-compat: amount_cad alias for amount_paid,
  // created_at alias for created_iso, etc.
  const invoices = (accountInvoices ?? []).map((inv: any) => ({
    ...inv,
    amount_cad: inv.amount_paid ?? inv.amount_due ?? 0,
    created_at: inv.created_iso,
    subscription_id: inv.subscription ?? null,
    stripe_subscription_id: inv.subscription ?? null,
  }));

  return {
    services: services ?? [],
    domains: domains ?? [],
    subscriptions,
    invoices,
    logs: logs ?? [],
  };
}

/**
 * Admin logs with optional level/search filters.
 */
export async function getAdminLogs(filters?: { level?: string; q?: string }, limit: number = 50) {
  const supabase = await createClient();

  let query = supabase
    .from('logs')
    .select('*, users(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filters?.level) {
    query = query.eq('level', filters.level);
  }

  if (filters?.q) {
    query = query.or(`action.ilike.%${filters.q}%,message.ilike.%${filters.q}%`);
  }

  const { data } = await query;
  return data ?? [];
}

/**
 * User-facing logs for dashboard.
 */
export async function getUserLogs(limit: number = 50) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}
