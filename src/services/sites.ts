import { createClient } from '@/lib/supabase-server';

/**
 * Site queries used across customer + admin dashboards.
 *
 * ── Site lifecycle ─────────────────────────────────────────────────
 * `sites.status` transitions through these states:
 *
 *   provisioning  ── wp.cloud is creating the WordPress install. Set
 *                    by /api/create-subscription on first signup, or
 *                    by admin's "Provision" button. The retry-stuck-
 *                    provisions cron re-fires the wp.cloud call if
 *                    it failed silently (with backoff + 5-attempt
 *                    cap, gated by metadata.provision_attempts /
 *                    metadata.provision_giving_up).
 *   active        ── Live. wp_cloud_site_id populated, site reachable.
 *   paused        ── Subscription is in dunning / payment failure.
 *                    Stripe webhook flips this. Site is suspended at
 *                    wp.cloud but data is intact.
 *   cancelled     ── Subscription cancelled OR Stripe pause_collection
 *                    set. metadata.recovery_deadline is stamped to the
 *                    sub's current_period_end. The customer has until
 *                    that deadline to resume billing; after it passes,
 *                    delete-expired-sites cron hard-deletes the site
 *                    on wp.cloud and flips status → 'deleted'.
 *   failed        ── Provisioning gave up entirely (hit the retry cap
 *                    OR delete-expired-sites couldn't remove the wp.cloud
 *                    site after MAX_DELETE_ATTEMPTS).
 *   deleted       ── Permanently removed from wp.cloud. Row kept for
 *                    audit trail.
 *
 * Customer-facing queries (getUserSites, etc.) hide 'cancelled' until
 * the customer is on the recovery flow. Admin queries surface every
 * status so support can intervene at any stage.
 * ───────────────────────────────────────────────────────────────────
 */

/**
 * User's sites, ordered by created_at desc. Excludes 'cancelled' so
 * customers don't see sites that are mid-deletion countdown — those
 * surface separately on the recovery flow if applicable.
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
    .select('*, products(name, slug, price_cad), domains(domain_name)')
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
