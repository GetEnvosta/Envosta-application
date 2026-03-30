import { createClient } from '@/lib/supabase-server';

/**
 * User's sites, ordered by created_at desc.
 */
export async function getUserSites(userId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('sites')
    .select('*')
    .not('status', 'eq', 'cancelled')
    .order('created_at', { ascending: false });

  if (userId) query = query.eq('user_id', userId);
  const { data } = await query;
  return data ?? [];
}

/**
 * Single site by id with product (plan) join.
 */
export async function getSiteById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('sites')
    .select('*, products(name, slug, metadata, features)')
    .eq('id', id)
    .single();
  return data;
}

/**
 * Sites with product + subscription joins (listing page).
 */
export async function getUserSitesWithSubscriptions(userId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('sites')
    .select('*, products(name, slug), subscriptions(id, status, current_period_end)')
    .order('created_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  const { data } = await query;
  return data ?? [];
}

/**
 * Sites basic info (for billing page).
 */
export async function getUserServicesBasic() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('sites')
    .select('id, label, subscription_id')
    .order('created_at', { ascending: false });
  return data ?? [];
}

/**
 * Admin: all sites with user + product joins and optional filters.
 */
export async function getAllServices(filters?: { q?: string; status?: string }) {
  const supabase = await createClient();
  let query = supabase
    .from('sites')
    .select('*, users(full_name, email), products(name, slug)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.q) query = query.or(`label.ilike.%${filters.q}%`);

  const { data } = await query;
  return data ?? [];
}

/**
 * User's sites minimal (for domain detail page).
 */
export async function getUserServicesList(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('sites')
    .select('id, label')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

/**
 * Admin: single site detail with user + product joins.
 */
export async function getServiceDetailById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('sites')
    .select('*, users(id, full_name, email, company_name), products(name, slug, metadata)')
    .eq('id', id)
    .single();
  return data;
}

/**
 * Domains linked to a site.
 */
export async function getServiceDomains(siteId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('domains')
    .select('*')
    .eq('service_id', siteId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

/**
 * Logs for a specific site.
 */
export async function getServiceLogs(siteId: string, limit: number = 20) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('logs')
    .select('*')
    .eq('service_id', siteId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}
