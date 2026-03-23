import { createClient } from '@/lib/supabase-server';

/**
 * Fetch all services for current user, ordered by created_at desc.
 * Optionally pass a userId to filter; if omitted, returns all for the session user.
 */
export async function getUserSites(userId?: string) {
  const supabase = await createClient();

  let query = supabase
    .from('services')
    .select('*')
    .not('status', 'eq', 'cancelled')
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data } = await query;
  return data ?? [];
}

/**
 * Fetch a single service by id with plan join.
 */
export async function getSiteById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('services')
    .select('*, plans(name, slug)')
    .eq('id', id)
    .single();
  return data;
}

/**
 * Fetch services with plan + subscription joins (for the sites listing page).
 */
export async function getUserSitesWithSubscriptions(userId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('services')
    .select('*, plans(name, slug), subscriptions(id, status, current_period_end, plans(name))')
    .order('created_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  const { data } = await query;
  return data ?? [];
}

/**
 * Fetch services with basic info (id, label, subscription_id) for billing page.
 */
export async function getUserServicesBasic() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('services')
    .select('id, label, subscription_id')
    .order('created_at', { ascending: false });
  return data ?? [];
}

/**
 * Admin: fetch all services with user, plan joins and optional filters.
 */
export async function getAllServices(filters?: { q?: string; status?: string }) {
  const supabase = await createClient();

  let query = supabase
    .from('services')
    .select('*, users(full_name, email), plans(name)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.q) {
    query = query.or(`label.ilike.%${filters.q}%,users.email.ilike.%${filters.q}%`);
  }

  const { data } = await query;
  return data ?? [];
}

/**
 * Fetch user's services with minimal fields (id, label) for domain detail page.
 */
export async function getUserServicesList(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('services')
    .select('id, label')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

/**
 * Admin: fetch single service with user + plan joins.
 */
export async function getServiceDetailById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('services')
    .select('*, users(id, full_name, email, company_name), plans(name, slug, max_php_workers, default_php_workers, php_memory_mb)')
    .eq('id', id)
    .single();
  return data;
}

/**
 * Admin: fetch domains linked to a service.
 */
export async function getServiceDomains(serviceId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('domains')
    .select('*')
    .eq('service_id', serviceId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

/**
 * Admin: fetch logs for a specific service.
 */
export async function getServiceLogs(serviceId: string, limit: number = 20) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('logs')
    .select('*')
    .eq('service_id', serviceId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}
