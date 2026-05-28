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
 *
 * Subscription enrichment comes from stripe.subscriptions (Sync Engine
 * mirror) batched by stripe_customer_id, then stitched into each user's
 * `subscriptions` array so the admin page keeps the old shape.
 */
export async function getAllServices(filters?: { q?: string; status?: string; queue?: string }) {
  const supabase = await createClient();
  let query = supabase
    .from('sites')
    .select('*, users(id, full_name, email, stripe_customer_id), domains(id, domain_name, status), flagged_for_deletion_at, flag_reason, paused_at')
    .order('created_at', { ascending: false })
    .limit(50);

  // Cleanup queue: status='paused' (admin can flag) OR anything with
  // flagged_for_deletion_at set (legacy 'flagged_for_deletion' OR new
  // workflow path 'cancelled' + flagged_for_deletion_at). Excludes
  // subscription-paused-cancelled sites — those have recovery_deadline
  // and are auto-handled by the delete-expired-sites cron.
  if (filters?.queue === 'cleanup') {
    query = query.or('status.eq.paused,flagged_for_deletion_at.not.is.null');
  } else if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.q) query = query.or(`label.ilike.%${filters.q}%`);

  const { data } = await query;
  const sites = data ?? [];
  if (!sites.length) return sites;

  // Collect stripe customer IDs from the joined users, fetch their active
  // subs from stripe.* in one batch, then enrich with the matching
  // public.products row for the plan name.
  const customerIds = Array.from(new Set(
    sites
      .map((s: any) => (s.users as any)?.stripe_customer_id)
      .filter((cid: any): cid is string => typeof cid === 'string' && cid.length > 0)
  ));

  if (customerIds.length === 0) return sites;

  const stripeSchema: any = (supabase as any).schema('stripe' as any);
  const { data: subs } = await stripeSchema
    .from('subscriptions')
    .select('id, customer, status, created')
    .in('customer', customerIds)
    .in('status', ['active', 'trialing', 'past_due', 'paused'])
    .order('created', { ascending: false });

  const subsByCustomer = new Map<string, any[]>();
  for (const sub of (subs as any[]) ?? []) {
    if (!subsByCustomer.has(sub.customer)) subsByCustomer.set(sub.customer, []);
    subsByCustomer.get(sub.customer)!.push(sub);
  }

  // Best-effort plan name from the first sub's first item → public.products
  const subIds = ((subs as any[]) ?? []).map(s => s.id);
  let productBySubId = new Map<string, any>();
  if (subIds.length) {
    const { data: items } = await stripeSchema
      .from('subscription_items')
      .select('subscription, price')
      .in('subscription', subIds);

    const priceToSub = new Map<string, string>();
    for (const item of (items as any[]) ?? []) {
      const priceId = typeof item.price === 'string' ? item.price : item.price?.id;
      if (priceId && !priceToSub.has(priceId)) priceToSub.set(priceId, item.subscription);
    }

    if (priceToSub.size) {
      const priceIds = Array.from(priceToSub.keys());
      const { data: products } = await supabase
        .from('products')
        .select('name, stripe_price_id, stripe_price_id_yearly, stripe_price_id_cad, stripe_price_id_yearly_cad')
        .or(priceIds.map(id =>
          `stripe_price_id.eq.${id},stripe_price_id_yearly.eq.${id},stripe_price_id_cad.eq.${id},stripe_price_id_yearly_cad.eq.${id}`
        ).join(','));
      for (const p of (products as any[]) ?? []) {
        const allPriceIds = [p.stripe_price_id, p.stripe_price_id_yearly, p.stripe_price_id_cad, p.stripe_price_id_yearly_cad].filter(Boolean);
        for (const priceId of allPriceIds) {
          const subId = priceToSub.get(priceId);
          if (subId) productBySubId.set(subId, p);
        }
      }
    }
  }

  // Stitch the subs (with synthesized products + back-compat status field)
  // onto each user object so the admin page reads them unchanged.
  return sites.map((site: any) => {
    const customerId = site.users?.stripe_customer_id;
    const userSubs = (customerId ? subsByCustomer.get(customerId) : []) ?? [];
    const enrichedSubs = userSubs.map(sub => ({
      ...sub,
      products: productBySubId.get(sub.id) ?? null,
    }));
    return {
      ...site,
      users: site.users ? { ...site.users, subscriptions: enrichedSubs } : null,
    };
  });
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
 * Logs for a specific site. Reads from audit_log (the legacy `logs`
 * table was dropped). Maps audit_log rows back to the legacy logs
 * shape so consumers don't need touching.
 */
export async function getServiceLogs(siteId: string, limit: number = 20) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('audit_log')
    .select('*')
    .eq('resource_type', 'site')
    .eq('resource_id', siteId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []).map((row: any) => {
    const md = (row?.metadata ?? {}) as Record<string, any>;
    return {
      id: row.id,
      user_id: row.actor_id,
      site_id: row.resource_id,
      action: row.action,
      details: md.details ?? null,
      message: md.details ?? null,
      level: md.level ?? 'info',
      metadata: md,
      created_at: row.created_at,
    };
  });
}
