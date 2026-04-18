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
 * Single site by id.
 */
export async function getSiteById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('sites')
    .select('*')
    .eq('id', id)
    .single();
  return data;
}

/**
 * Sites for listing page.
 */
export async function getUserSitesWithSubscriptions(userId?: string) {
  const supabase = await createClient();
  // Show active + provisioning + cancelled sites (cancelled have 30-day recovery)
  // Only hide permanently deleted sites
  let query = supabase
    .from('sites')
    .select('*, products(name, slug, price_cad)')
    .not('status', 'eq', 'deleted')
    .order('created_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  const { data } = await query;
  return data ?? [];
}

/**
 * Sites basic info.
 */
export async function getUserServicesBasic() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('sites')
    .select('id, label')
    .order('created_at', { ascending: false });
  return data ?? [];
}

/**
 * Admin: all sites with user joins and optional filters.
 */
export async function getAllServices(filters?: { q?: string; status?: string }) {
  const supabase = await createClient();
  let query = supabase
    .from('sites')
    .select('*, users(full_name, email, subscriptions(id, status, products(name))), domains(id, domain_name, status)')
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
    .select('id, label, status')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return (data ?? []).map((s: any) => ({
    id: s.id,
    label: s.label,
    status: s.status,
  }));
}

/**
 * Admin: single site detail with user join.
 */
export async function getServiceDetailById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('sites')
    .select('*, users(id, full_name, email, company_name)')
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
    .eq('site_id', siteId)
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
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}
