/**
 * Add-ons service — read-only helpers for `products` rows with
 * type='plan_addon'. These are the recurring extras (bursting capacity,
 * premium WAF, etc.) that a customer attaches on top of their hosting
 * subscription as additional Stripe SubscriptionItems.
 *
 * Mutation paths (attach / detach an add-on to a sub) live in
 * /api/account/addons/* — this file is reads only.
 */
import { createClient } from '@/lib/supabase-server';

export interface Addon {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_cad: number | null;
  price_yearly_cad: number | null;
  price_usd: number | null;
  price_yearly_usd: number | null;
  stripe_product_id: string | null;
  /** USD monthly price (primary). */
  stripe_price_id: string | null;
  /** USD yearly price. */
  stripe_price_id_yearly: string | null;
  /** CAD monthly price (set when CAD pricing is enabled). */
  stripe_price_id_cad: string | null;
  /** CAD yearly price (set when CAD pricing is enabled). */
  stripe_price_id_yearly_cad: string | null;
  billing: string | null;
  is_active: boolean;
  metadata: Record<string, any> | null;
}

/** Active add-ons available for purchase. */
export async function getActiveAddons(): Promise<Addon[]> {
  const sb = await createClient();
  const { data } = await sb
    .from('products')
    .select('*')
    .eq('type', 'plan_addon')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return (data as any[] | null) ?? [];
}

/** Lookup a single add-on by slug. Returns null if not found. */
export async function getAddonBySlug(slug: string): Promise<Addon | null> {
  const sb = await createClient();
  const { data } = await sb
    .from('products')
    .select('*')
    .eq('type', 'plan_addon')
    .eq('slug', slug)
    .maybeSingle();
  return (data as Addon | null) ?? null;
}

/**
 * Pick the Stripe Price ID for an add-on given a billing period. Returns
 * null when nothing is synced. Yearly falls back to monthly when only a
 * monthly price exists (so a customer on a yearly hosting plan can still
 * attach a monthly-only add-on).
 *
 * Currency selection: prefer the matching-currency price when present,
 * otherwise fall back to the other currency. Stripe handles the rest.
 */
export function resolveAddonPriceId(
  addon: Addon,
  billing: 'monthly' | 'yearly' = 'monthly',
  currency: 'cad' | 'usd' = 'usd',
): string | null {
  const cadMonthly = addon.stripe_price_id_cad ?? null;
  const cadYearly = addon.stripe_price_id_yearly_cad ?? null;
  const usdMonthly = addon.stripe_price_id ?? null;
  const usdYearly = addon.stripe_price_id_yearly ?? null;

  if (currency === 'cad') {
    if (billing === 'yearly') return cadYearly ?? cadMonthly ?? usdYearly ?? usdMonthly;
    return cadMonthly ?? usdMonthly ?? cadYearly ?? usdYearly;
  }
  if (billing === 'yearly') return usdYearly ?? usdMonthly ?? cadYearly ?? cadMonthly;
  return usdMonthly ?? cadMonthly ?? usdYearly ?? cadYearly;
}
