import Stripe from 'stripe';
import { stripeAdmin } from '@/lib/stripe-admin';

/**
 * Shared helpers for the PER-SITE subscription model.
 *
 * Architecture (post per-site cutover):
 * - Each WordPress site has its OWN Stripe subscription (1 site : 1 sub).
 * - The link is sites.stripe_subscription_id → stripe.subscriptions.id.
 * - The site's plan is the single recurring item on that subscription;
 *   sites.stripe_subscription_item_id points at it (and is the anchor that
 *   per-site add-on items are added alongside).
 * - Adding a site    = create a new subscription for it.
 * - Upgrading a site  = swap that subscription's plan item price
 *                       (Stripe prorates automatically).
 * - Cancelling a site = cancel its subscription.
 *
 * Domain renewals are NOT Stripe Subscriptions — the daily cron fires
 * off-session PaymentIntents instead, so nothing here needs to filter
 * them out.
 *
 * Data source:
 *   - public.subscriptions does not exist. The Stripe Sync Engine mirrors
 *     Stripe into the `stripe` schema continuously, so getSiteSubscription
 *     reads `stripe.subscriptions` via sites.stripe_subscription_id.
 */

export interface HostingSubscriptionRef {
  /** The Stripe subscription ID (alias for stripe_subscription_id for compat). */
  id: string;
  stripe_subscription_id: string;
  status: string;
}

/** Find a specific site's dedicated Stripe subscription (per-site model). */
export async function getSiteSubscription(
  supabase: any,
  siteId: string,
): Promise<HostingSubscriptionRef | null> {
  const { data: site } = await supabase
    .from('sites')
    .select('stripe_subscription_id')
    .eq('id', siteId)
    .maybeSingle();
  const subId = site?.stripe_subscription_id;
  if (!subId) return null;

  // Read live status from the Sync-Engine-mirrored stripe.subscriptions.
  const { data: sub } = await stripeAdmin()
    .from('subscriptions')
    .select('id, status')
    .eq('id', subId)
    .maybeSingle();

  // If the mirror hasn't caught up yet, still return the id we know about.
  return {
    id: subId,
    stripe_subscription_id: subId,
    status: (sub?.status as string) ?? 'unknown',
  };
}

/** Swap a site's line item to a different plan price (upgrade/downgrade). */
export async function updateSiteLineItem(
  stripe: Stripe,
  stripeItemId: string,
  newPriceId: string,
): Promise<Stripe.SubscriptionItem> {
  const item = await stripe.subscriptionItems.update(stripeItemId, {
    price: newPriceId,
    proration_behavior: 'create_prorations',
  });
  return item;
}

/** Resolve a plan slug + billing period to a Stripe price ID. */
export async function resolvePlanPrice(
  supabase: any,
  planSlug: string,
  billing: 'monthly' | 'yearly' = 'monthly',
): Promise<{ productId: string; priceId: string; planName: string } | null> {
  const { data: plan } = await supabase
    .from('products')
    .select('id, name, stripe_price_id, stripe_price_id_yearly')
    .eq('slug', planSlug)
    .eq('type', 'hosting_plan')
    .eq('is_active', true)
    .single();

  if (!plan) return null;

  const priceId = billing === 'yearly' ? plan.stripe_price_id_yearly : plan.stripe_price_id;
  if (!priceId) return null;

  return { productId: plan.id, priceId, planName: plan.name };
}
