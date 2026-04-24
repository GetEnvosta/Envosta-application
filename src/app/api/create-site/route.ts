import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import Stripe from 'stripe';
import { findHostingSubscription, addSiteLineItem, resolvePlanPrice, resumeSubscription } from '@/lib/stripe-subscription';

export const dynamic = 'force-dynamic';

/**
 * User-facing endpoint: add a WordPress site to the customer's subscription.
 *
 * Each site is a Stripe subscription line item. The user picks which plan
 * tier the site should be on (e.g. minimum, growth). The price is added
 * as a new line item on their existing hosting subscription.
 *
 * If the user has no subscription yet, they're directed to sign up first.
 */

export async function POST(req: Request) {
  // Verify logged-in user
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

  const { label, region, planSlug } = await req.json();
  if (!label || typeof label !== 'string') {
    return NextResponse.json({ error: 'Site name is required' }, { status: 400 });
  }

  // Default to minimum plan if not specified
  const selectedPlan = planSlug || 'minimum';

  // Resolve the plan to a Stripe price
  const plan = await resolvePlanPrice(supabase, selectedPlan);
  if (!plan) {
    return NextResponse.json({ error: `Plan "${selectedPlan}" not found or not configured in Stripe` }, { status: 400 });
  }

  // Enforce sites_allowed for the user's CURRENT plan (not the requested one — they
  // can't escape the limit by passing a different planSlug; new sites always inherit
  // the existing hosting subscription's plan if one exists).
  const { data: existingSites } = await supabase
    .from('sites')
    .select('id, product_id')
    .eq('user_id', user.id)
    .not('status', 'in', '("cancelled","deleted","flagged_for_deletion")');

  const sitesUsed = existingSites?.length ?? 0;
  if (sitesUsed > 0) {
    // Use the plan of an existing site to determine the cap
    const referencePlanId = existingSites![0].product_id;
    const { data: refPlan } = await supabase
      .from('products')
      .select('name, metadata')
      .eq('id', referencePlanId)
      .maybeSingle();
    const sitesAllowed = Number((refPlan?.metadata as any)?.sites_allowed ?? 1);
    if (sitesUsed >= sitesAllowed) {
      return NextResponse.json({
        error: `Your ${refPlan?.name ?? 'current'} plan allows ${sitesAllowed} site${sitesAllowed === 1 ? '' : 's'}. You're using ${sitesUsed}. Upgrade to add more sites.`,
      }, { status: 403 });
    }
  }

  // Find user's existing hosting subscription — or create one
  let hostingSub = await findHostingSubscription(supabase, user.id);

  if (!hostingSub?.stripe_subscription_id) {
    // No active subscription — create a new one with this site as the first item
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

    try {
      const newSub = await stripe.subscriptions.create({
        customer: profile.stripe_customer_id,
        items: [{ price: plan.priceId }],
        payment_settings: { save_default_payment_method: 'on_subscription' },
        metadata: {
          supabase_user_id: user.id,
          subscription_type: 'hosting',
        },
      });

      // Save subscription to DB
      const { data: dbSub } = await supabase.from('subscriptions').upsert({
        user_id: user.id,
        stripe_subscription_id: newSub.id,
        status: newSub.status,
        billing_period: 'monthly',
        metadata: { subscription_type: 'hosting' },
      }, { onConflict: 'stripe_subscription_id' }).select('id').single();

      hostingSub = {
        id: dbSub!.id,
        stripe_subscription_id: newSub.id,
        status: newSub.status,
      };

      // The first item is already on the subscription — grab its ID
      const firstItem = newSub.items.data[0];

      // Create the site record linked to this subscription + item
      const siteLabel = label.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 40) || 'site';
      const { data: site, error: siteErr } = await supabase.from('sites').insert({
        user_id: user.id,
        subscription_id: hostingSub.id,
        product_id: plan.productId,
        stripe_subscription_item_id: firstItem.id,
        label: siteLabel,
        status: 'provisioning',
        server_region: region || 'dca',
        metadata: { self_service: true, plan_slug: selectedPlan },
      }).select('id').single();

      if (siteErr) return NextResponse.json({ error: siteErr.message }, { status: 500 });

      // Update Stripe item metadata with our site ID
      await stripe.subscriptionItems.update(firstItem.id, {
        metadata: { envosta_site_id: site.id },
      });

      // Trigger provisioning
      try {
        const provRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/provision-hosting`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            serviceId: site.id,
            label: siteLabel,
            region: region || 'dca',
            phpVersion: '8.4',
            planId: plan.productId,
            userId: user.id,
          }),
        });

        await supabase.from('logs').insert({
          user_id: user.id,
          site_id: site.id,
          action: 'site.created',
          details: `New subscription + site "${siteLabel}" on ${plan.planName} plan`,
          level: 'info',
          metadata: { plan: selectedPlan, provisioned: provRes.ok, new_subscription: true },
        });

        return NextResponse.json({
          success: true,
          siteId: site.id,
          plan: plan.planName,
          newSubscription: true,
          warning: provRes.ok ? undefined : 'Site created but provisioning may need retry',
        });
      } catch (e: any) {
        return NextResponse.json({
          success: true,
          siteId: site.id,
          plan: plan.planName,
          newSubscription: true,
          warning: 'Site created but provisioning failed — please contact support',
        });
      }
    } catch (stripeErr: any) {
      console.error('Failed to create subscription:', stripeErr);
      return NextResponse.json({
        error: stripeErr.message?.includes('payment')
          ? 'Payment failed. Please update your payment method and try again.'
          : `Failed to create subscription: ${stripeErr.message}`,
      }, { status: 400 });
    }
  }

  // If subscription is paused (0 sites), resume it before adding the item
  if (hostingSub.status === 'paused') {
    try {
      await resumeSubscription(stripe, hostingSub.stripe_subscription_id);
      await supabase.from('subscriptions').update({
        status: 'active',
        metadata: {
          resumed_at: new Date().toISOString(),
        },
      }).eq('id', hostingSub.id);
      console.log('Resumed paused subscription:', hostingSub.stripe_subscription_id);
    } catch (e: any) {
      console.error('Failed to resume subscription:', e);
      return NextResponse.json({ error: 'Failed to resume subscription. Please contact support.' }, { status: 500 });
    }
  }

  // Active subscription — add a new line item
  const siteLabel = label.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 40) || 'site';
  const { data: site, error: siteErr } = await supabase.from('sites').insert({
    user_id: user.id,
    subscription_id: hostingSub.id,
    product_id: plan.productId,
    label: siteLabel,
    status: 'provisioning',
    server_region: region || 'dca',
    metadata: { self_service: true, plan_slug: selectedPlan },
  }).select('id').single();

  if (siteErr) return NextResponse.json({ error: siteErr.message }, { status: 500 });

  try {
    const item = await addSiteLineItem(
      stripe,
      hostingSub.stripe_subscription_id,
      plan.priceId,
      site.id,
    );

    // Save the Stripe subscription item ID on the site
    await supabase.from('sites').update({
      stripe_subscription_item_id: item.id,
    }).eq('id', site.id);
  } catch (stripeErr: any) {
    // If Stripe fails, clean up the site record
    await supabase.from('sites').delete().eq('id', site.id);
    console.error('Failed to add line item:', stripeErr);
    return NextResponse.json({
      error: stripeErr.message?.includes('interval')
        ? 'Cannot mix billing intervals. Your subscription is monthly — choose a monthly plan.'
        : `Failed to add site to subscription: ${stripeErr.message}`,
    }, { status: 400 });
  }

  // Trigger wp.cloud provisioning via the edge function
  try {
    const provRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/provision-hosting`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        serviceId: site.id,
        label: siteLabel,
        region: region || 'dca',
        phpVersion: '8.4',
        planId: plan.productId,
        userId: user.id,
      }),
    });

    await supabase.from('logs').insert({
      user_id: user.id,
      site_id: site.id,
      action: 'site.created',
      details: `Added site "${siteLabel}" on ${plan.planName} plan`,
      level: 'info',
      metadata: { plan: selectedPlan, provisioned: provRes.ok },
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
