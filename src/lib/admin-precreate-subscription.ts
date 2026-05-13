/**
 * Shared helper for admin-driven site creation: pre-creates a Stripe
 * Customer + incomplete Subscription (with 14-day trial) and stamps
 * envosta_site_id in the sub metadata so the webhook attaches it to
 * the existing site row instead of duplicating.
 *
 * Used by:
 *   - /api/admin/create-unclaimed-account
 *   - /api/admin/add-site-for-customer
 *
 * Returns a result object — caller decides what to do on failure;
 * we never throw past the helper boundary, only log + return a
 * `warning` field so the admin sees something went wrong but the
 * site row + provisioning still proceed.
 *
 * Post Stripe-Sync-Engine cutover:
 *   - We no longer write to public.subscriptions (dropped). The Sync
 *     Engine mirrors the new sub into stripe.subscriptions on the next
 *     event poll.
 *   - We no longer update sites.subscription_id (column dropped). The
 *     site is linked to the user via user_id; the user's single active
 *     subscription is looked up via users.stripe_customer_id.
 *   - We still stamp users.metadata.pending_subscription_id +
 *     pending_setup_intent_client_secret for the claim/activate flow.
 */

import Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface PreCreateResult {
  ok: boolean;
  warning?: string;
  pendingSubscriptionId?: string;
  pendingClientSecret?: string;
  /** @deprecated public.subscriptions was dropped; always undefined now. */
  dbSubId?: string;
  stripeSubscriptionItemId?: string | null;
}

interface PreCreateArgs {
  sb: SupabaseClient;
  userId: string;
  userEmail: string;
  userFullName: string | null;
  productId: string;
  siteId: string;
  callerUserId: string;
  signupSource: 'admin_unclaimed' | 'admin_added';
  couponCode?: string | null;
}

export async function preCreateAdminSubscription(args: PreCreateArgs): Promise<PreCreateResult> {
  const { sb, userId, userEmail, userFullName, productId, siteId, callerUserId, signupSource, couponCode } = args;

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return { ok: false, warning: 'STRIPE_SECRET_KEY not configured — subscription not created' };
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' as any });

    // 1. Resolve plan price
    const { data: product } = await sb
      .from('products')
      .select('stripe_price_id, stripe_price_id_yearly, slug')
      .eq('id', productId)
      .maybeSingle();

    if (!product?.stripe_price_id) {
      return { ok: false, warning: `Plan ${productId} has no stripe_price_id; subscription not created` };
    }

    // 2. Resolve / create Stripe Customer
    const { data: profile } = await sb.from('users').select('stripe_customer_id, full_name').eq('id', userId).maybeSingle();
    let customerId = profile?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const sc = await stripe.customers.create({
        email: userEmail,
        name: userFullName ?? profile?.full_name ?? undefined,
        metadata: { supabase_user_id: userId },
      });
      customerId = sc.id;
      await sb.from('users').update({ stripe_customer_id: customerId }).eq('id', userId);
    }

    // 3. Create the subscription (default_incomplete, 14-day trial)
    const baseParams: Stripe.SubscriptionCreateParams = {
      customer: customerId!,
      items: [{ price: product.stripe_price_id }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      trial_period_days: 14,
      expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
      metadata: {
        supabase_user_id: userId,
        envosta_site_id: siteId,
        admin_created_by: callerUserId,
        signup_source: signupSource,
        subscription_type: 'hosting',
        billing_period: 'monthly',
      },
    };

    let subscription: Stripe.Subscription;
    let couponWarning: string | undefined;

    // Try with coupon first; on error, retry without
    if (couponCode) {
      try {
        subscription = await stripe.subscriptions.create({ ...baseParams, coupon: couponCode } as any);
      } catch (e: any) {
        couponWarning = `Coupon "${couponCode}" rejected by Stripe (${e?.message ?? 'unknown'}); created subscription without coupon`;
        console.error('preCreateAdminSubscription: coupon failed, retrying without —', e?.message);
        subscription = await stripe.subscriptions.create(baseParams);
      }
    } else {
      subscription = await stripe.subscriptions.create(baseParams);
    }

    // 4. Capture client_secret — trial subs use pending_setup_intent
    const pendingSetup = (subscription as any).pending_setup_intent as Stripe.SetupIntent | null;
    const latestInvoice = subscription.latest_invoice as Stripe.Invoice | null;
    const paymentIntent = latestInvoice ? ((latestInvoice as any).payment_intent as Stripe.PaymentIntent | null) : null;
    const clientSecret = pendingSetup?.client_secret ?? paymentIntent?.client_secret ?? null;

    // 5. Link the site row to the new Stripe subscription item.
    //    sites.subscription_id was removed (account-centric model);
    //    we still record the line-item ID for per-site upgrades/downgrades.
    const firstItem = subscription.items?.data?.[0];
    if (firstItem?.id) {
      await sb.from('sites').update({
        stripe_subscription_item_id: firstItem.id,
      }).eq('id', siteId);
    }

    // 6. Stamp user metadata with pending pieces for the claim flow
    const { data: userRow } = await sb.from('users').select('metadata').eq('id', userId).maybeSingle();
    const existingMeta = (userRow?.metadata as any) ?? {};
    await sb.from('users').update({
      metadata: {
        ...existingMeta,
        pending_subscription_id: subscription.id,
        ...(clientSecret ? { pending_setup_intent_client_secret: clientSecret } : {}),
      },
    }).eq('id', userId);

    return {
      ok: true,
      warning: couponWarning,
      pendingSubscriptionId: subscription.id,
      pendingClientSecret: clientSecret ?? undefined,
      stripeSubscriptionItemId: firstItem?.id ?? null,
    };
  } catch (e: any) {
    console.error('preCreateAdminSubscription: unexpected error (non-fatal)', e);
    return { ok: false, warning: `Stripe subscription creation failed: ${e?.message ?? 'unknown'}` };
  }
}
