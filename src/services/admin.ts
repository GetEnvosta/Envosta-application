import { createClient } from '@/lib/supabase-server';

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
 * All customers with optional search filter.
 */
export async function getAllCustomers(search?: string) {
  const supabase = await createClient();

  let query = supabase
    .from('users')
    .select('*, sites(id), domains(id), subscriptions(id, status, billing_period)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data } = await query;
  return (data ?? []).map((u: any) => {
    const subs = Array.isArray(u.subscriptions) ? u.subscriptions : [];
    const activeSub = subs.find((s: any) => s.status === 'active') ?? subs.find((s: any) => s.status === 'trialing') ?? null;
    return {
      ...u,
      site_count: Array.isArray(u.sites) ? u.sites.length : 0,
      domain_count: Array.isArray(u.domains) ? u.domains.length : 0,
      sub_status: activeSub?.status ?? (subs.length > 0 ? subs[0].status : null),
      sites: undefined,
      domains: undefined,
      subscriptions: undefined,
    };
  });
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
 */
export async function getCustomerRelatedData(userId: string) {
  const supabase = await createClient();
  const [
    { data: services },
    { data: domains },
    { data: subscriptions },
    { data: invoices },
    { data: logs },
  ] = await Promise.all([
    supabase
      .from('sites')
      .select('*, products(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('domains')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('subscriptions')
      .select('*, products(name, price_cad, type)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('invoices')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return {
    services: services ?? [],
    domains: domains ?? [],
    subscriptions: subscriptions ?? [],
    invoices: invoices ?? [],
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
