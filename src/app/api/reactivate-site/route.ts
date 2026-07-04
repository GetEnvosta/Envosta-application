import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import Stripe from 'stripe';
import { resolvePlanPrice } from '@/lib/stripe-subscription';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * POST — Reactivate a cancelled site within the 30-day recovery window.
 *
 * Re-adds the site's plan as a new line item on the user's subscription.
 * If the subscription was cancelled (last site), creates a new subscription.
 * The wp.cloud site is still alive during the 30-day window, so no re-provisioning needed.
 *
 * Post Stripe-Sync-Engine cutover: the local public.subscriptions table
 * was dropped; the helper reads from stripe.* via the user's customer ID,
 * and we don't write any local subscription rows after creating in Stripe.
 *
 * Body: { siteId: string }
 */
export async function POST(req: Request) {
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

  const { siteId } = await req.json();
  if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

  // Get the cancelled site
  const { data: site } = await supabase
    .from('sites')
    .select('id, user_id, label, status, product_id, wp_cloud_site_id, metadata')
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
    // PER-SITE model: a cancelled site's subscription was cancelled with it,
    // so reactivation always creates a NEW subscription dedicated to this
    // site (there is no account-level sub to re-use or resume).
    const newSubscriptionCreated = true;

    const { data: profile } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: 'No payment method on file. Please add a payment method first.' }, { status: 400 });
    }

    const newSub = await stripe.subscriptions.create({
      customer: profile.stripe_customer_id,
      items: [{ price: priceId, metadata: { envosta_site_id: siteId } }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        supabase_user_id: user.id,
        envosta_site_id: siteId,
        subscription_type: 'hosting',
        billing_period: 'monthly',
      },
    });

    // If there's no usable default payment method, bail (and clean up the
    // incomplete sub) so the customer can fix billing and retry.
    const invoice = newSub.latest_invoice as any;
    const pi = invoice?.payment_intent as Stripe.PaymentIntent;
    if (pi && pi.status === 'requires_payment_method') {
      try { await stripe.subscriptions.cancel(newSub.id); } catch { /* best-effort */ }
      return NextResponse.json({
        error: 'Payment required. Please update your payment method.',
        requiresPayment: true,
      }, { status: 402 });
    }

    // Link the reactivated site to its new subscription + clear deletion flags.
    const firstItem = newSub.items.data[0];
    const { recovery_deadline, cancelled_at, ...keptMeta } = meta;
    await supabase.from('sites').update({
      status: 'active',
      product_id: productId,
      stripe_subscription_id: newSub.id,
      stripe_subscription_item_id: firstItem?.id ?? null,
      flag_reason: null,
      flagged_for_deletion_at: null,
      paused_at: null,
      metadata: {
        ...keptMeta,
        reactivated_at: new Date().toISOString(),
        reactivated_from: 'cancelled',
      },
    }).eq('id', siteId);

    // Log it
    await recordAudit({
      actorId: user.id,
      actorType: 'user',
      action: 'site.reactivated',
      resourceType: 'site',
      resourceId: siteId,
      before: { status: 'cancelled' },
      after: { status: 'active' },
      metadata: {
        level: 'info',
        details: `Site "${site.label}" reactivated on ${planSlug} plan. ${newSubscriptionCreated ? 'New subscription created.' : 'Added back to existing subscription.'}`,
        plan_slug: planSlug,
        new_subscription: newSubscriptionCreated,
      },
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
