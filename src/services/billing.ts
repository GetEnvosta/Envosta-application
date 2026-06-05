/**
 * Billing reads — subscriptions, invoices, payment methods.
 *
 * Per-site model: a user has ONE Stripe subscription PER SITE (1 site : 1
 * sub), all under their single stripe_customer_id. The Supabase Stripe
 * Sync Engine mirrors all Stripe data into the `stripe` schema
 * (stripe.subscriptions, stripe.invoices, stripe.payment_methods, …); this
 * service queries those directly via `users.stripe_customer_id` — there is
 * no public.subscriptions / public.invoices table.
 *
 * getAccountSubscription returns the user's MOST RECENT live subscription —
 * a convenience for "primary plan" displays only. To act on a specific
 * site's billing, resolve its subscription via sites.stripe_subscription_id
 * (see getSiteSubscription in lib/stripe-subscription.ts).
 *
 * Mutations still go through Stripe directly (via API routes). This
 * service is read-only.
 */
import { createClient } from '@/lib/supabase-server';
import { stripeAdmin } from '@/lib/stripe-admin';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a value from Sync Engine to a JS Date. Some columns are stored
 * as Unix timestamps (INTEGER), others as TIMESTAMPTZ depending on the
 * sync version — handle both.
 */
export function asDate(val: unknown): Date | null {
  if (val == null) return null;
  if (typeof val === 'number') return new Date(val * 1000);
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** ISO string from a Sync-Engine date-ish value, or null. */
export function asIsoDate(val: unknown): string | null {
  return asDate(val)?.toISOString() ?? null;
}

const ACTIVE_SUB_STATUSES = ['active', 'trialing', 'past_due', 'paused'] as const;

/** Lookup user's Stripe customer ID. Returns null if not set. */
async function getStripeCustomerId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .maybeSingle();
  return data?.stripe_customer_id ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTIONS — one per SITE (this returns the most recent as "primary")
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the user's MOST RECENT active/trialing/past_due/paused subscription.
 * Returns null if none. Per-site model: a user may have many live subs
 * (one per site); this returns the newest as a "primary plan" convenience
 * for account-level displays. For a specific site's sub, use
 * getSiteSubscription(siteId) in lib/stripe-subscription.ts.
 */
export async function getAccountSubscription(userId: string): Promise<any | null> {
  const customerId = await getStripeCustomerId(userId);
  if (!customerId) return null;

  const { data, error } = await stripeAdmin()
    .from('subscriptions')
    .select('*')
    .eq('customer', customerId)
    .in('status', ACTIVE_SUB_STATUSES as any)
    .order('created', { ascending: false });

  if (error) {
    console.error('getAccountSubscription error:', error);
    return null;
  }

  // Exclude domain-renewal subscriptions (a separate billing concern) so
  // "primary plan" displays surface a HOSTING subscription, never a domain
  // renewal. Returns null when the user has only non-hosting subs.
  const hosting = ((data as any[]) ?? []).find((s) => {
    const meta = (s.metadata as any) ?? {};
    return meta.type !== 'domain_renewal' && meta.is_domain_purchase !== 'true';
  });
  return hosting ?? null;
}

/**
 * Resolve the billing interval of a SPECIFIC site's subscription
 * (per-site model). Used to show the correct add-on price column. Reads
 * the sub's billing_period metadata, falling back to the plan item's
 * recurring interval for legacy subs that predate the metadata stamp.
 */
export async function getSiteBillingPeriod(siteId: string): Promise<'monthly' | 'yearly'> {
  const supabase = await createClient();
  const { data: site } = await supabase
    .from('sites')
    .select('stripe_subscription_id')
    .eq('id', siteId)
    .maybeSingle();
  const subId = site?.stripe_subscription_id;
  if (!subId) return 'monthly';

  const stripeSchema: any = stripeAdmin();
  const { data: sub } = await stripeSchema
    .from('subscriptions')
    .select('metadata')
    .eq('id', subId)
    .maybeSingle();
  if ((sub?.metadata as any)?.billing_period === 'yearly') return 'yearly';

  const { data: items } = await stripeSchema
    .from('subscription_items')
    .select('price')
    .eq('subscription', subId);
  for (const it of (items as any[]) ?? []) {
    const interval = it?.price && typeof it.price === 'object' ? (it.price as any)?.recurring?.interval : null;
    if (interval === 'year') return 'yearly';
  }
  return 'monthly';
}

/**
 * Same as getAccountSubscription, but enriches with the matching
 * public.products row (joined manually on the first subscription_item's
 * price_id → products.stripe_price_id). Returns the sub with an extra
 * `product` field, or null.
 */
export async function getAccountSubscriptionWithProduct(userId: string): Promise<any | null> {
  const sub = await getAccountSubscription(userId);
  if (!sub) return null;

  const supabase = await createClient();

  // Find the first subscription_item's price.
  const { data: items } = await stripeAdmin()
    .from('subscription_items')
    .select('id, price')
    .eq('subscription', sub.id)
    .limit(1);

  const firstItem = items?.[0];
  // Sync Engine stores `price` as a JSONB blob OR as a foreign key text
  // depending on version. Handle both.
  let priceId: string | null = null;
  if (firstItem?.price) {
    priceId = typeof firstItem.price === 'string' ? firstItem.price : (firstItem.price as any)?.id ?? null;
  }

  if (!priceId) {
    return { ...sub, product: null, billing_period: 'monthly' };
  }

  const { data: product } = await supabase
    .from('products')
    .select('id, name, slug, type, price_cad, price_usd, price_yearly_cad, price_yearly_usd, metadata, features')
    .or(
      `stripe_price_id.eq.${priceId},stripe_price_id_yearly.eq.${priceId},stripe_price_id_cad.eq.${priceId},stripe_price_id_yearly_cad.eq.${priceId}`,
    )
    .maybeSingle();

  // Best-effort billing_period detection.
  const isYearly =
    product &&
    ((product as any).stripe_price_id_yearly === priceId ||
      (product as any).stripe_price_id_yearly_cad === priceId);

  return { ...sub, product, billing_period: isYearly ? 'yearly' : 'monthly' };
}

/**
 * Admin: count of incomplete subscriptions across all users (abandoned
 * checkouts). Used on the dashboard.
 */
export async function getAbandonedCheckoutCount(): Promise<number> {
  const { count } = await stripeAdmin()
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'incomplete');
  return count ?? 0;
}

/**
 * Admin: recent incomplete subscriptions with the matching user row.
 * Joined manually because the cross-schema PostgREST join is iffy.
 */
export async function getAbandonedCheckouts(limit = 20) {
  const supabase = await createClient();
  const { data } = await stripeAdmin()
    .from('subscriptions')
    .select('id, customer, status, created, metadata')
    .eq('status', 'incomplete')
    .order('created', { ascending: false })
    .limit(limit);

  const subs = (data as any[]) ?? [];
  if (!subs.length) return [];

  const customerIds = Array.from(new Set(subs.map((s) => s.customer).filter(Boolean)));
  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, email, stripe_customer_id')
    .in('stripe_customer_id', customerIds as string[]);
  const byCustomer = new Map<string, any>((users ?? []).map((u: any) => [u.stripe_customer_id, u]));

  return subs.map((s) => ({
    ...s,
    created_iso: asIsoDate(s.created),
    user: byCustomer.get(s.customer) ?? null,
  }));
}

/**
 * Admin: all subscriptions with user + first-item price for the
 * subscriptions list page. Best-effort enrichment.
 *
 * Returns subs with the OLD shape's familiar fields synthesized
 * (`users`, `products`, `stripe_subscription_id`, `created_at`,
 * `billing_period`) so existing UIs work without rewriting their JSX.
 */
export async function getAllSubscriptionsAdmin(limit = 200) {
  const supabase = await createClient();
  const stripeSchema: any = stripeAdmin();

  const { data } = await stripeSchema
    .from('subscriptions')
    .select('*')
    .order('created', { ascending: false })
    .limit(limit);

  const subs = (data as any[]) ?? [];
  if (!subs.length) return [];

  // Fetch users by customer id
  const customerIds = Array.from(new Set(subs.map((s) => s.customer).filter(Boolean)));
  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, email, stripe_customer_id')
    .in('stripe_customer_id', customerIds as string[]);
  const byCustomer = new Map<string, any>((users ?? []).map((u: any) => [u.stripe_customer_id, u]));

  // Fetch first-item price for each sub to derive product/billing_period.
  const subIds = subs.map((s) => s.id);
  const { data: items } = await stripeSchema
    .from('subscription_items')
    .select('id, subscription, price')
    .in('subscription', subIds);
  const itemsBySub = new Map<string, any[]>();
  for (const it of (items as any[]) ?? []) {
    const arr = itemsBySub.get(it.subscription) ?? [];
    arr.push(it);
    itemsBySub.set(it.subscription, arr);
  }

  // Collect every priceId we need to look up against products.
  const priceIds = new Set<string>();
  for (const it of (items as any[]) ?? []) {
    const pid = typeof it.price === 'string' ? it.price : (it.price as any)?.id;
    if (pid) priceIds.add(pid);
  }
  let productsByPriceId = new Map<string, any>();
  if (priceIds.size > 0) {
    const priceIdList = Array.from(priceIds);
    const { data: products } = await supabase
      .from('products')
      .select('id, name, slug, type, price_cad, stripe_price_id, stripe_price_id_yearly, stripe_price_id_cad, stripe_price_id_yearly_cad')
      .or(
        priceIdList
          .flatMap((pid) => [
            `stripe_price_id.eq.${pid}`,
            `stripe_price_id_yearly.eq.${pid}`,
            `stripe_price_id_cad.eq.${pid}`,
            `stripe_price_id_yearly_cad.eq.${pid}`,
          ])
          .join(','),
      );
    for (const p of (products as any[]) ?? []) {
      for (const f of ['stripe_price_id', 'stripe_price_id_yearly', 'stripe_price_id_cad', 'stripe_price_id_yearly_cad']) {
        const v = (p as any)[f];
        if (v) productsByPriceId.set(v, { ...p, _matched_field: f });
      }
    }
  }

  return subs.map((s) => {
    const firstItem = itemsBySub.get(s.id)?.[0];
    const priceId = firstItem
      ? typeof firstItem.price === 'string'
        ? firstItem.price
        : (firstItem.price as any)?.id ?? null
      : null;
    const product = priceId ? productsByPriceId.get(priceId) ?? null : null;
    const isYearly =
      product && (product._matched_field === 'stripe_price_id_yearly' || product._matched_field === 'stripe_price_id_yearly_cad');
    const user = byCustomer.get(s.customer) ?? null;
    return {
      ...s,
      // Compatibility fields for the existing admin UI:
      stripe_subscription_id: s.id,
      created_at: asIsoDate(s.created),
      current_period_end: asIsoDate(s.current_period_end),
      billing_period: isYearly ? 'yearly' : 'monthly',
      products: product,
      users: user,
      user,
    };
  });
}

/**
 * Admin: all active/trialing subscriptions across the platform (for MRR
 * + dashboard counts). Same shape-compat as getAllSubscriptionsAdmin.
 */
export async function getAllActiveSubscriptions() {
  const all = await getAllSubscriptionsAdmin(500);
  return all.filter((s: any) => s.status === 'active');
}

/**
 * Convert a subscription's price to monthly equivalent based on billing
 * period. Mirrors the pre-Sync-Engine helper.
 */
export function toMonthly(sub: any): number {
  const price = sub.products?.price_cad ?? 0;
  const period = sub.billing_period ?? 'monthly';
  const divisors: Record<string, number> = { monthly: 1, yearly: 12 };
  return Math.round(price / (divisors[period] ?? 1));
}

// ─────────────────────────────────────────────────────────────────────────────
// INVOICES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * User's invoices, newest first. Read directly from the mirrored
 * stripe.invoices table.
 */
export async function getAccountInvoices(userId: string, limit = 20) {
  const customerId = await getStripeCustomerId(userId);
  if (!customerId) return [];

  const { data } = await stripeAdmin()
    .from('invoices')
    .select('id, customer, subscription, status, paid, amount_paid, amount_due, currency, hosted_invoice_url, invoice_pdf, number, description, created, period_start, period_end, metadata')
    .eq('customer', customerId)
    .order('created', { ascending: false })
    .limit(limit);

  return ((data as any[]) ?? []).map((inv) => ({
    ...inv,
    created_iso: asIsoDate(inv.created),
    period_start_iso: asIsoDate(inv.period_start),
    period_end_iso: asIsoDate(inv.period_end),
  }));
}

/**
 * Admin: recent invoices across the platform with user info.
 */
export async function getAdminRecentInvoices(limit = 30) {
  const supabase = await createClient();
  const { data } = await stripeAdmin()
    .from('invoices')
    .select('id, customer, subscription, status, paid, amount_paid, amount_due, currency, hosted_invoice_url, invoice_pdf, number, description, created, metadata')
    .order('created', { ascending: false })
    .limit(limit);

  const invs = (data as any[]) ?? [];
  if (!invs.length) return [];

  const customerIds = Array.from(new Set(invs.map((i) => i.customer).filter(Boolean)));
  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, email, stripe_customer_id')
    .in('stripe_customer_id', customerIds as string[]);
  const byCustomer = new Map<string, any>((users ?? []).map((u: any) => [u.stripe_customer_id, u]));

  return invs.map((inv) => ({
    ...inv,
    created_iso: asIsoDate(inv.created),
    user: byCustomer.get(inv.customer) ?? null,
  }));
}

/**
 * Admin: paid + outstanding invoice counts (for dashboard cards).
 */
export async function getAdminBillingStats() {
  const stripeSchema: any = stripeAdmin();
  const [
    { count: paidInvoicesCount },
    { count: outstandingInvoicesCount },
  ] = await Promise.all([
    stripeSchema.from('invoices').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
    stripeSchema.from('invoices').select('id', { count: 'exact', head: true }).in('status', ['open', 'draft']),
  ]);

  return {
    paidInvoicesCount: paidInvoicesCount ?? 0,
    outstandingInvoicesCount: outstandingInvoicesCount ?? 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT METHODS
// ─────────────────────────────────────────────────────────────────────────────

/** All payment methods on file for the user (Sync Engine mirror). */
export async function getAccountPaymentMethods(userId: string) {
  const customerId = await getStripeCustomerId(userId);
  if (!customerId) return [];

  const { data } = await stripeAdmin()
    .from('payment_methods')
    .select('*')
    .eq('customer', customerId)
    .order('created', { ascending: false });
  return (data as any[]) ?? [];
}

/**
 * The user's default payment method (the one Stripe will charge on the
 * next invoice). Sync Engine stores this as a flag on the row, OR as the
 * customer's `invoice_settings.default_payment_method` — fall back if
 * the flag isn't available.
 */
export async function getDefaultPaymentMethod(userId: string): Promise<any | null> {
  const customerId = await getStripeCustomerId(userId);
  if (!customerId) return null;

  const stripeSchema: any = stripeAdmin();

  // Try the flag first (Sync Engine recent versions).
  const { data: flagged } = await stripeSchema
    .from('payment_methods')
    .select('*')
    .eq('customer', customerId)
    .eq('is_default', true)
    .maybeSingle();
  if (flagged) return flagged;

  // Fall back: customers.invoice_settings.default_payment_method
  const { data: customer } = await stripeSchema
    .from('customers')
    .select('invoice_settings')
    .eq('id', customerId)
    .maybeSingle();
  const defaultPmId = (customer?.invoice_settings as any)?.default_payment_method;
  if (defaultPmId) {
    const { data: pm } = await stripeSchema
      .from('payment_methods')
      .select('*')
      .eq('id', defaultPmId)
      .maybeSingle();
    if (pm) return pm;
  }

  // Last resort: latest card on file.
  const { data: latest } = await stripeSchema
    .from('payment_methods')
    .select('*')
    .eq('customer', customerId)
    .eq('type', 'card')
    .order('created', { ascending: false })
    .limit(1)
    .maybeSingle();
  return latest ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// USER + CARD CONVENIENCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * User row + the brand/last4/expiry of their default card. The card
 * info is shaped to match what `card_brand`, `card_last4`, `card_expiry`
 * looked like on the old direct-Stripe-API call.
 */
export async function getCustomerInfo(userId: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (!profile?.stripe_customer_id) return profile;

  const pm = await getDefaultPaymentMethod(userId);
  const card = (pm?.card as any) ?? null;
  if (!card) return profile;

  return {
    ...profile,
    card_brand: card.brand ?? null,
    card_last4: card.last4 ?? null,
    card_expiry:
      card.exp_month && card.exp_year
        ? `${String(card.exp_month).padStart(2, '0')}/${card.exp_year}`
        : null,
  };
}

/** Admin: all users with stripe_customer_id (for invoice dropdown). */
export async function getAllCustomersWithUsers() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('id, full_name, email, stripe_customer_id')
    .not('stripe_customer_id', 'is', null)
    .order('full_name', { ascending: true });
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY ALIAS — getUserInvoices / getUserSubscriptions removed (no callers).
// getActiveSubscription is still used by the dashboard overview; kept as a
// thin alias for the new account-centric helper.
// ─────────────────────────────────────────────────────────────────────────────

export async function getActiveSubscription(userId?: string) {
  if (!userId) return null;
  return getAccountSubscriptionWithProduct(userId);
}
