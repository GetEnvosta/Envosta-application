import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import Stripe from 'stripe';
import { resolvePlanPrice } from '@/lib/stripe-subscription';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * User-facing endpoint: add a WordPress site.
 *
 * PER-SITE model: every site gets its OWN Stripe subscription (1 site : 1
 * sub). Adding a site creates a brand-new subscription for the chosen plan,
 * charged immediately to the customer's default payment method, and links
 * the site via sites.stripe_subscription_id (+ stripe_subscription_item_id
 * for the plan line item that per-site add-ons attach alongside).
 *
 * There is no account-level "sites allowed" cap — each site is billed on
 * its own, so a customer can run as many as they want.
 *
 * The Stripe Sync Engine mirrors the new sub into stripe.* asynchronously;
 * the webhook (customer.subscription.created) also fires but provisioning
 * there is a no-op once we've provisioned inline (guarded by wp_cloud_site_id).
 */

export async function POST(req: Request) {
  // Verify logged-in user
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });

  const { label, region, planSlug } = await req.json();
  if (!label || typeof label !== 'string') {
    return NextResponse.json({ error: 'Site name is required' }, { status: 400 });
  }

  // Default to the entry public plan. Self-serve may never select the
  // hidden Minimum (internal/retention) or Enterprise (sales-only).
  const selectedPlan = planSlug || 'standard';
  if (selectedPlan === 'minimum' || selectedPlan === 'enterprise') {
    return NextResponse.json(
      { error: selectedPlan === 'enterprise' ? 'Enterprise is set up by our team — contact sales.' : 'That plan is not available.' },
      { status: 400 },
    );
  }

  // Resolve the plan to a Stripe price
  const plan = await resolvePlanPrice(supabase, selectedPlan);
  if (!plan) {
    return NextResponse.json({ error: `Plan "${selectedPlan}" not found or not configured in Stripe` }, { status: 400 });
  }

  // Require a Stripe customer (payment method on file). Each site is its own
  // subscription billed immediately, so we need a card to charge.
  const { data: profile } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({
      error: 'No payment method on file. Please add a payment method in billing settings.',
    }, { status: 400 });
  }

  // Create the site row first (status=provisioning). The Stripe sub is
  // created next and stamped back onto the row; if Stripe fails we roll the
  // row back so we never strand a site with no billing.
  const siteLabel = label.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 40) || 'site';
  const { data: site, error: siteErr } = await supabase.from('sites').insert({
    user_id: user.id,
    product_id: plan.productId,
    label: siteLabel,
    status: 'provisioning',
    server_region: region || 'dca',
    metadata: { self_service: true, plan_slug: selectedPlan },
  }).select('id').single();

  if (siteErr || !site) {
    return NextResponse.json({ error: siteErr?.message ?? 'Failed to create site' }, { status: 500 });
  }

  // Create this site's dedicated Stripe subscription. No coupons or
  // discounts exist (charter §7).
  let subscription: Stripe.Subscription;
  try {
    subscription = await stripe.subscriptions.create({
      customer: profile.stripe_customer_id,
      items: [{ price: plan.priceId, metadata: { envosta_site_id: site.id } }],
      payment_settings: { save_default_payment_method: 'on_subscription' },
      metadata: {
        supabase_user_id: user.id,
        envosta_site_id: site.id,
        subscription_type: 'hosting',
        billing_period: 'monthly',
      },
    });
  } catch (stripeErr: any) {
    // Roll back the site row so we don't leave an unbilled orphan.
    await supabase.from('sites').delete().eq('id', site.id);
    console.error('Failed to create per-site subscription:', stripeErr);
    return NextResponse.json({
      error: stripeErr.message?.includes('payment')
        ? 'Payment failed. Please update your payment method and try again.'
        : `Failed to create subscription: ${stripeErr.message}`,
    }, { status: 400 });
  }

  // If the immediate charge couldn't complete (e.g. no usable card on file),
  // don't strand a provisioning site — roll everything back.
  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    try { await stripe.subscriptions.cancel(subscription.id); } catch { /* best-effort */ }
    await supabase.from('sites').delete().eq('id', site.id);
    return NextResponse.json({
      error: 'Payment could not be completed. Please update your payment method and try again.',
      requiresPayment: true,
    }, { status: 402 });
  }

  // Link the site to its subscription.
  const firstItem = subscription.items.data[0];
  await supabase.from('sites').update({
    stripe_subscription_id: subscription.id,
    stripe_subscription_item_id: firstItem?.id ?? null,
  }).eq('id', site.id);

  // Trigger wp.cloud provisioning via Vercel internal route.
  try {
    const origin = process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
      : new URL(req.url).origin;
    const provRes = await fetch(`${origin}/api/internal/wpcloud/provision-site`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': process.env.INTERNAL_API_TOKEN ?? '',
      },
      body: JSON.stringify({
        siteId: site.id,
        serviceId: site.id,
        label: siteLabel,
        region: region || 'dca',
        phpVersion: '8.4',
        planId: plan.productId,
        userId: user.id,
      }),
    });

    await recordAudit({
      actorId: user.id,
      actorType: 'user',
      action: 'site.created',
      resourceType: 'site',
      resourceId: site.id,
      metadata: {
        level: 'info',
        details: `Added site "${siteLabel}" on ${plan.planName} plan (own subscription)`,
        plan: selectedPlan,
        provisioned: provRes.ok,
        stripe_subscription_id: subscription.id,
      },
    });

    return NextResponse.json({
      success: true,
      siteId: site.id,
      plan: plan.planName,
      warning: provRes.ok ? undefined : 'Site created but provisioning may need retry',
    });
  } catch (e: any) {
    return NextResponse.json({
      success: true,
      siteId: site.id,
      plan: plan.planName,
      warning: 'Site created but provisioning failed — please contact support',
    });
  }
}
