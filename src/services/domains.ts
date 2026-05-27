/**
 * Domain reads for customer + admin dashboards. Domains are
 * registered through OpenSRS and mirrored into the `domains` table
 * by the domain-registration API routes; this file is read-only.
 */
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
 * Admin: get domain by id (no user scoping).
 */
export async function getAdminDomainById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('domains')
    .select('*, users(id, full_name, email)')
    .eq('id', id)
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
 * DNS records for a specific domain, read from the canonical
 * opensrs_dns_records mirror table. Replaces reading from the
 * domains.metadata.dns_records JSONB cache (which can lag behind
 * upstream-discovered records that the reconcile-opensrs cron writes).
 *
 * Returned in the shape the DnsManager component's mapper expects
 * ({type, name, value, priority, ttl}) — the mapper falls back through
 * `value` when type-specific fields aren't present.
 */
export async function getDnsRecordsByDomainId(domainId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('opensrs_dns_records')
    .select('record_type, name, value, priority, ttl, source, upstream_status')
    .eq('domain_id', domainId)
    .order('record_type', { ascending: true });

  return (data ?? []).map((r: any) => ({
    type: r.record_type,
    name: r.name,
    value: r.value,
    priority: r.priority,
    ttl: r.ttl ?? 3600,
  }));
}

/**
 * Admin: all domains with user join and optional filters.
 */
export async function getAllDomains(filters?: { q?: string; status?: string }) {
  const supabase = await createClient();

  let query = supabase
    .from('domains')
    .select('*, users(full_name, email), sites(id, label, status)')
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
