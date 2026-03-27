import { createClient } from '@/lib/supabase-server';

/**
 * All domains for current user, ordered by created_at desc.
 */
export async function getUserDomains(userId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('domains')
    .select('*')
    .order('created_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  const { data } = await query;
  return data ?? [];
}

/**
 * Fetch domains for a specific user, ordered by domain_name asc (for site detail page).
 */
export async function getUserDomainsForSite(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('domains')
    .select('id, domain_name, site_id')
    .eq('user_id', userId)
    .order('domain_name', { ascending: true });
  return data ?? [];
}

/**
 * Single domain by id, scoped to user.
 */
export async function getDomainById(id: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('domains')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  return data;
}

/**
 * Admin: count of registered domains.
 */
export async function getRegisteredDomainsCount() {
  const supabase = await createClient();
  const { count } = await supabase
    .from('domains')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'registered');
  return count ?? 0;
}

/**
 * Admin: all domains with user join and optional filters.
 */
export async function getAllDomains(filters?: { q?: string; status?: string }) {
  const supabase = await createClient();

  let query = supabase
    .from('domains')
    .select('*, users(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.q) {
    query = query.ilike('domain_name', `%${filters.q}%`);
  }

  const { data } = await query;
  return data ?? [];
}
