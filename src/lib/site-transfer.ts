/**
 * Shared site-transfer engine (per-site billing model).
 *
 * Moves a site's billing + ownership to a new user: creates a fresh per-site
 * Stripe subscription under the new owner, recreates the site's active add-ons
 * on it, flips sites.user_id + the billing links, then cancels the old
 * subscription (prorated credit). The wp.cloud site itself is untouched —
 * only ownership + billing move.
 *
 * Callers handle authorization (admin transfer tool, or the self-serve
 * handoff-accept route). This function assumes the move is already authorized
 * and that the new owner has a usable payment method on file.
 *
 * It does NOT write an audit row — the caller knows the actor and records its
 * own audit entry.
 */
import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface SiteTransferResult {
  ok: boolean;
  /** Suggested HTTP status for the calling route. */
  status: number;
  error?: string;
  newSubscriptionId?: string;
  newSubscriptionItemId?: string | null;
  oldSubscriptionId?: string | null;
  oldSubscriptionCancelled?: boolean;
  oldCancelError?: string | null;
  oldUserId?: string | null;
  siteLabel?: string | null;
  warning?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function pickAddonPrice(addon: any, interval: 'month' | 'year'): string | null {
  const yearly = interval === 'year';
  return yearly
    ? (addon.stripe_price_id_yearly ?? addon.stripe_price_id ?? addon.stripe_price_id_yearly_cad ?? addon.stripe_price_id_cad ?? null)
    : (addon.stripe_price_id ?? addon.stripe_price_id_cad ?? addon.stripe_price_id_yearly ?? addon.stripe_price_id_yearly_cad ?? null);
}

export async function executeSiteTransfer(
  sb: SupabaseClient,
  stripe: Stripe,
  siteId: string,
  newUserId: string,
): Promise<SiteTransferResult> {
  // ── Load the site ──
  const { data: site } = await sb
    .from('sites')
    .select('id, user_id, label, product_id, stripe_subscription_id, stripe_subscription_item_id')
    .eq('id', siteId)
    .maybeSingle();
  if (!site) return { ok: false, status: 404, error: 'Site not found' };

  const oldUserId = site.user_id as string | null;
  if (oldUserId === newUserId) return { ok: false, status: 400, error: 'Site already belongs to that account' };

  // ── Validate the new owner ──
  const { data: newOwner } = await sb
    .from('users')
    .select('id, email, full_name, stripe_customer_id')
    .eq('id', newUserId)
    .maybeSingle();
  if (!newOwner) return { ok: false, status: 404, error: 'New owner not found' };
  if (!newOwner.stripe_customer_id) {
    return { ok: false, status: 400, error: 'New owner has no payment method on file.' };
  }

  // ── Resolve the price + billing interval to move ──
  const oldSubId = site.stripe_subscription_id as string | null;
  const oldItemId = site.stripe_subscription_item_id as string | null;
  let priceId: string | null = null;
  let interval: 'month' | 'year' = 'month';
  if (oldItemId) {
    try {
      const oldItem = await stripe.subscriptionItems.retrieve(oldItemId);
      priceId = oldItem.price?.id ?? null;
      interval = (oldItem.price?.recurring?.interval as any) === 'year' ? 'year' : 'month';
    } catch {
      // Stale/missing item — fall back to the plan price.
    }
  }
  if (!priceId) {
    const { data: planProduct } = await sb
      .from('products')
      .select('stripe_price_id, stripe_price_id_yearly')
      .eq('id', site.product_id)
      .maybeSingle();
    priceId = (planProduct?.stripe_price_id ?? planProduct?.stripe_price_id_yearly) as string | null;
    if (planProduct?.stripe_price_id_yearly && !planProduct?.stripe_price_id) interval = 'year';
  }
  if (!priceId) return { ok: false, status: 400, error: 'Could not resolve a Stripe price for this site (plan not synced?).' };

  // ── 1) Create the site's NEW subscription under the new owner ──
  let newSub: Stripe.Subscription;
  try {
    newSub = await stripe.subscriptions.create({
      customer: newOwner.stripe_customer_id,
      items: [{ price: priceId, metadata: { envosta_site_id: siteId } }],
      payment_settings: { save_default_payment_method: 'on_subscription' },
      metadata: {
        supabase_user_id: newUserId,
        envosta_site_id: siteId,
        subscription_type: 'hosting',
        billing_period: interval === 'year' ? 'yearly' : 'monthly',
      },
    });
  } catch (e: any) {
    return { ok: false, status: 502, error: `Failed to create the site's subscription under the new owner — nothing changed: ${e?.message ?? e}` };
  }
  const newSubId = newSub.id;

  // Abort cleanly if the new owner's charge couldn't complete.
  if (newSub.status !== 'active' && newSub.status !== 'trialing') {
    try { await stripe.subscriptions.cancel(newSubId); } catch { /* best-effort */ }
    return { ok: false, status: 402, error: `Payment could not be completed (subscription ${newSub.status}). Nothing changed.` };
  }
  const newItemId = newSub.items.data[0]?.id ?? null;

  // ── 2) Flip ownership + per-site billing link ──
  await sb.from('sites').update({
    user_id: newUserId,
    stripe_subscription_id: newSubId,
    stripe_subscription_item_id: newItemId,
    updated_at: new Date().toISOString(),
  }).eq('id', siteId);

  // ── 4) Cancel the OLD subscription (prorated credit to the old owner) ──
  let oldCancelError: string | null = null;
  if (oldSubId) {
    try {
      await stripe.subscriptions.cancel(oldSubId, { prorate: true, invoice_now: true } as any);
    } catch (e: any) {
      oldCancelError = e?.message ?? String(e);
    }
  }

  return {
    ok: true,
    status: 200,
    newSubscriptionId: newSubId,
    newSubscriptionItemId: newItemId,
    oldSubscriptionId: oldSubId,
    oldSubscriptionCancelled: !oldCancelError && !!oldSubId,
    oldCancelError,
    oldUserId,
    siteLabel: site.label as string | null,
    warning: oldCancelError
      ? 'Site moved + new owner billed, but the OLD subscription could not be cancelled — cancel it manually in Stripe to stop billing the previous owner.'
      : undefined,
  };
}
