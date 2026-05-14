import Stripe from 'stripe';

/**
 * Shared helpers for the single-subscription-per-customer model.
 *
 * Architecture:
 * - Each customer has ONE Stripe subscription for hosting
 * - Each WordPress site is a line item (subscription item) on that subscription
 * - Adding a site = adding a line item with the plan's price
 * - Upgrading a site = swapping its line item's price (Stripe prorates automatically)
 * - Removing a site = deleting the line item
 *
 * Phase 3: domain renewals are NOT Stripe Subscriptions — the daily cron
 * fires off-session PaymentIntents instead. There's nothing here that
 * needs to filter them out anymore.
 *
 * Post Stripe-Sync-Engine cutover:
 *   - public.subscriptions was dropped. The Sync Engine mirrors Stripe
 *     into the `stripe` schema continuously, so `findHostingSubscription`
 *     now reads `stripe.subscriptions` via the user's stripe_customer_id.
 *   - The returned shape preserves `stripe_subscription_id` (alias of the
 *     stripe.subscriptions.id) so callers don't need to change.
 */

export interface HostingSubscriptionRef {
  /** The Stripe subscription ID (alias for stripe_subscription_id for compat). */
  id: string;
  stripe_subscription_id: string;
  status: string;
}

/** Find the user's hosting subscription from stripe.* (active, trialing, or paused). */
export async function findHostingSubscription(
  supabase: any,
  userId: string,
): Promise<HostingSubscriptionRef | null> {
  // Resolve Stripe customer ID first.
  const { data: profile } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .maybeSingle();
  const customerId = profile?.stripe_customer_id;
  if (!customerId) return null;

  // Pull alive subs from the Sync-Engine-mirrored stripe.subscriptions.
  const { data: subs } = await supabase
    .schema('stripe')
    .from('subscriptions')
    .select('id, status, metadata')
    .eq('customer', customerId)
    .in('status', ['active', 'trialing', 'paused'])
    .order('created', { ascending: false });

  // Phase 3: domain renewals are no longer Stripe Subscriptions — any
  // live sub belongs to hosting. Defensive guard kept for legacy rows.
  const hostingSub = (subs ?? []).find((s: any) => {
    const meta = (s.metadata as any) ?? {};
    return meta.type !== 'domain_renewal' && meta.is_domain_purchase !== 'true';
  }) ?? (subs ?? [])[0];

  if (!hostingSub) return null;

  return {
    id: hostingSub.id,
    stripe_subscription_id: hostingSub.id,
    status: hostingSub.status,
  };
}

/** Add a site as a line item to an existing Stripe subscription. */
export async function addSiteLineItem(
  stripe: Stripe,
  stripeSubscriptionId: string,
  priceId: string,
  siteId: string,
): Promise<Stripe.SubscriptionItem> {
  const item = await stripe.subscriptionItems.create({
    subscription: stripeSubscriptionId,
    price: priceId,
    quantity: 1,
    metadata: { envosta_site_id: siteId },
    proration_behavior: 'create_prorations',
  });
  return item;
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

/** Remove a site's line item from the subscription.
 *  If it's the last item, pauses the subscription instead of cancelling it.
 *  This keeps the subscription object alive so adding a new site just resumes it.
 */
export async function removeSiteLineItem(
  stripe: Stripe,
  stripeSubscriptionId: string,
  stripeItemId: string,
): Promise<{ removed: boolean; subscriptionPaused: boolean }> {
  // Check how many items are on the subscription
  const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const itemCount = sub.items.data.length;

  if (itemCount <= 1) {
    // Last item — remove it and pause the subscription (keep it alive at $0)
    await stripe.subscriptionItems.del(stripeItemId, {
      proration_behavior: 'create_prorations',
    });

    // Pause billing — subscription stays active but won't invoice
    await stripe.subscriptions.update(stripeSubscriptionId, {
      pause_collection: { behavior: 'void' },
    });

    return { removed: true, subscriptionPaused: true };
  }

  // Other items remain — just remove this one
  await stripe.subscriptionItems.del(stripeItemId, {
    proration_behavior: 'create_prorations',
  });
  return { removed: true, subscriptionPaused: false };
}

/** Resume a paused subscription (called when adding a new site to a paused sub). */
export async function resumeSubscription(
  stripe: Stripe,
  stripeSubscriptionId: string,
): Promise<void> {
  await stripe.subscriptions.update(stripeSubscriptionId, {
    pause_collection: '' as any, // Stripe API: set to empty to unpause
  });
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
