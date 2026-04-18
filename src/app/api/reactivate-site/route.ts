import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import Stripe from 'stripe';
import { findHostingSubscription, addSiteLineItem, resolvePlanPrice, resumeSubscription } from '@/lib/stripe-subscription';

export const dynamic = 'force-dynamic';

/**
 * POST — Reactivate a cancelled site within the 30-day recovery window.
 *
 * Re-adds the site's plan as a new line item on the user's subscription.
 * If the subscription was cancelled (last site), creates a new subscription.
 * The wp.cloud site is still alive during the 30-day window, so no re-provisioning needed.
 *
 * Body: { siteId: string }
 */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });

  const { siteId } = await req.json();
  if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

  // Get the cancelled site
  const { data: site } = await supabase
    .from('sites')
    .select('id, user_id, label, status, product_id, subscription_id, wp_cloud_site_id, metadata')
    .eq('id', siteId)
    .single();

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  if (site.user_id !== user.id) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  if (site.status !== 'cancelled') return NextResponse.json({ error: 'Site is not cancelled' }, { status: 400 });

  // Check recovery window
  const meta = (site.metadata as any) ?? {};
  const recoveryDeadline = meta.recovery_deadline ? new Date(meta.recovery_deadline) : null;
  if (recoveryDeadline && new Date() > recoveryDeadline) {
    return NextResponse.json({
      error: 'Recovery window has expired. The 30-day recovery period has passed. Please create a new site.',
    }, { status: 410 });
  }

  // Resolve the plan this site was on
  const previousProductId = meta.previous_product_id ?? site.product_id;
  let planSlug = 'minimum';
  let priceId: string | null = null;
  let productId = previousProductId;

  if (previousProductId) {
    const { data: plan } = await supabase
      .from('products')
      .select('id, slug, stripe_price_id, name')
      .eq('id', previousProductId)
      .single();
    if (plan) {
      planSlug = plan.slug;
      priceId = plan.stripe_price_id;
      productId = plan.id;
    }
  }

  // Fallback: resolve by slug
  if (!priceId) {
    const resolved = await resolvePlanPrice(supabase, planSlug);
    if (!resolved) return NextResponse.json({ error: 'Could not resolve plan pricing' }, { status: 400 });
    priceId = resolved.priceId;
    productId = resolved.productId;
  }

  try {
    // Find or re-use existing hosting subscription
    let hostingSub = await findHostingSubscription(supabase, user.id);
    let newSubscriptionCreated = false;

    if (!hostingSub?.stripe_subscription_id) {
      // No active subscription — need to create a new one
      // Get customer's Stripe ID
      const { data: profile } = await supabase
        .from('users')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single();

      if (!profile?.stripe_customer_id) {
        return NextResponse.json({ error: 'No payment method on file. Please add a payment method first.' }, { status: 400 });
      }

      // Create new subscription with this site's plan as the first item
      const newSub = await stripe.subscriptions.create({
        customer: profile.stripe_customer_id,
        items: [{ price: priceId, metadata: { envosta_site_id: siteId } }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          supabase_user_id: user.id,
          subscription_type: 'hosting',
        },
      });

      // Check if payment is needed
      const invoice = newSub.latest_invoice as any;
      const pi = invoice?.payment_intent as Stripe.PaymentIntent;

      if (pi && pi.status === 'requires_payment_method') {
        return NextResponse.json({
          error: 'Payment required. Please update your payment method.',
          requiresPayment: true,
        }, { status: 402 });
      }

      // Save subscription to DB
      const { data: dbSub } = await supabase.from('subscriptions').insert({
        user_id: user.id,
        stripe_subscription_id: newSub.id,
        status: newSub.status,
        billing_period: 'monthly',
        metadata: { subscription_type: 'hosting', reactivated: true },
      }).select('id').single();

      hostingSub = { id: dbSub!.id, stripe_subscription_id: newSub.id, status: newSub.status };
      newSubscriptionCreated = true;

      // Link the site to the new subscription item
      const firstItem = newSub.items.data[0];
      await supabase.from('sites').update({
        status: 'active',
        subscription_id: dbSub!.id,
        product_id: productId,
        stripe_subscription_item_id: firstItem.id,
        metadata: {
          ...meta,
          reactivated_at: new Date().toISOString(),
          reactivated_from: 'cancelled',
        },
      }).eq('id', siteId);
    } else {
      // Subscription exists — resume it if paused, then add the line item
      if (hostingSub.status === 'paused') {
        await resumeSubscription(stripe, hostingSub.stripe_subscription_id);
        await supabase.from('subscriptions').update({
          status: 'active',
          metadata: { resumed_at: new Date().toISOString() },
        }).eq('id', hostingSub.id);
      }

      const item = await addSiteLineItem(
        stripe,
        hostingSub.stripe_subscription_id,
        priceId,
        siteId,
      );

      await supabase.from('sites').update({
        status: 'active',
        subscription_id: hostingSub.id,
        product_id: productId,
        stripe_subscription_item_id: item.id,
        metadata: {
          ...meta,
          reactivated_at: new Date().toISOString(),
          reactivated_from: 'cancelled',
        },
      }).eq('id', siteId);
    }

    // Log it
    await supabase.from('logs').insert({
      user_id: user.id,
      site_id: siteId,
      action: 'site.reactivated',
      details: `Site "${site.label}" reactivated on ${planSlug} plan. ${newSubscriptionCreated ? 'New subscription created.' : 'Added back to existing subscription.'}`,
      level: 'info',
    });

    return NextResponse.json({
      success: true,
      site: site.label,
      plan: planSlug,
      newSubscription: newSubscriptionCreated,
      message: `${site.label} has been reactivated. Billing resumes immediately.`,
    });
  } catch (e: any) {
    console.error('Reactivation error:', e);
    return NextResponse.json({ error: e.message ?? 'Failed to reactivate' }, { status: 500 });
  }
}
