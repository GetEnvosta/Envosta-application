import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
// Per-site model: signup always creates ONE subscription for the new
// site. There is no account-level subscription to collapse line items
// into. No coupons, promo codes, or discounts exist (charter §7).

export const dynamic = 'force-dynamic';

/**
 * POST — Create a Stripe subscription with incomplete status for embedded checkout.
 * Returns client_secret for PaymentElement confirmation.
 *
 * Per-site model: each purchase creates its own subscription (one site =
 * one subscription). A customer can hold many concurrent hosting subs.
 *
 * For new signups: creates user first, then subscription.
 * For dashboard: uses existing auth.
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`create-sub:${ip}`, 10, 300_000);
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please wait.' }, { status: 429 });

  try {
  const body = await req.json();
  const { priceId, domainName, name, email, password, trial, billing } = body as {
    priceId?: string;
    domainName?: string;
    name?: string;
    email?: string;
    password?: string;
    trial?: boolean;
    billing?: 'monthly' | 'yearly';
  };

  if (!priceId) return NextResponse.json({ error: 'priceId is required' }, { status: 400 });

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });

  // ── Block self-serve checkout of sales-only plans ──────────────
  // Enterprise is custom-priced + manually provisioned by our team (the
  // admin pre-creates its subscription). It must never be purchasable via
  // this self-serve route, even with a hand-crafted priceId.
  {
    const { data: salesOnlyPlans } = await sb
      .from('products')
      .select('stripe_price_id, stripe_price_id_yearly, stripe_price_id_cad, stripe_price_id_yearly_cad')
      .eq('type', 'hosting_plan')
      .eq('slug', 'enterprise');
    const blockedPriceIds = new Set(
      (salesOnlyPlans ?? []).flatMap((p: any) => [
        p.stripe_price_id, p.stripe_price_id_yearly, p.stripe_price_id_cad, p.stripe_price_id_yearly_cad,
      ].filter(Boolean)),
    );
    if (blockedPriceIds.has(priceId)) {
      return NextResponse.json(
        { error: 'Enterprise is set up by our team — please contact sales to get started.' },
        { status: 400 },
      );
    }
  }

  let userId: string;
  let userEmail: string;

  // Check if this is a logged-in user or a new signup
  if (email && password && name) {
    // New signup — create or get user
    const { data: existing } = await sb.from('users').select('id, email, stripe_customer_id').eq('email', email.toLowerCase()).maybeSingle();

    if (existing) {
      userId = existing.id;
      userEmail = existing.email;
    } else {
      // Industry-standard "incomplete signup" pattern (Shopify / Kinsta /
      // Stripe-recommended). The auth user is created at "Continue to
      // Payment" so we can attach a Stripe customer + subscription, but
      // it's tagged signup_status: 'awaiting_payment' until the first
      // invoice clears. The webhook flips this to 'active' on payment
      // success; the cleanup-abandoned-signups cron purges rows that
      // sit in 'awaiting_payment' for 30 days with no paid invoice.
      const { data: authUser, error: authErr } = await sb.auth.admin.createUser({
        email: email.toLowerCase(),
        password,
        email_confirm: false, // flipped to true on first paid invoice
        user_metadata: { full_name: name },
      });
      if (authErr || !authUser.user) return NextResponse.json({ error: authErr?.message ?? 'Failed to create account' }, { status: 400 });

      userId = authUser.user.id;
      userEmail = email.toLowerCase();

      await sb.from('users').upsert({
        id: userId,
        email: userEmail,
        full_name: name,
        role: 'customer',
        metadata: {
          signup_source: 'embedded_checkout',
          signup_status: 'awaiting_payment',
          signup_started_at: new Date().toISOString(),
        },
      }, { onConflict: 'id' });
    }
  } else {
    // Logged-in user
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    userId = user.id;
    userEmail = user.email!;
  }

  // Get or create Stripe customer
  const { data: profile } = await sb.from('users').select('stripe_customer_id, full_name').eq('id', userId).maybeSingle();
  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const sc = await stripe.customers.create({
      email: userEmail,
      name: profile?.full_name ?? name ?? undefined,
      metadata: { supabase_user_id: userId },
    });
    await sb.from('users').update({ stripe_customer_id: sc.id }).eq('id', userId);
    customerId = sc.id;
  }

  // ── Per-site subscription model ──────────────────────────────────
  // Every new site purchase creates its OWN Stripe subscription (one
  // site = one subscription, mirroring how each domain renewal is its
  // own sub). A customer can hold many concurrent hosting subscriptions.
  // ───────────────────────────────────────────────────────────────────

  // Build subscription params. Admin-created accounts get their Stripe
  // sub pre-created server-side (see lib/admin-precreate-subscription.ts)
  // and never reach this route, so no envosta_site_id pre-link logic
  // is needed here.
  const subParams: Stripe.SubscriptionCreateParams = {
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
    metadata: {
      supabase_user_id: userId,
      domain_name: domainName ?? '',
      billing_period: billing ?? 'monthly',
      subscription_type: 'hosting',
    },
  };

  // Trial
  if (trial) {
    subParams.trial_period_days = 14;
  }

  const subscription = await stripe.subscriptions.create(subParams);

  // For trials, there's no payment — collect card via separate SetupIntent
  if (trial) {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: { subscription_id: subscription.id },
    });
    return NextResponse.json({
      type: 'setup',
      clientSecret: setupIntent.client_secret,
      subscriptionId: subscription.id,
    });
  }

  // For paid, get the payment intent from the latest invoice
  const invoice = subscription.latest_invoice as any;
  const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent;

  if (!paymentIntent?.client_secret) {
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }

  return NextResponse.json({
    type: 'payment',
    clientSecret: paymentIntent.client_secret,
    subscriptionId: subscription.id,
  });
  } catch (e: any) {
    console.error('Subscription error:', e);
    return NextResponse.json({ error: e.message ?? 'Internal error' }, { status: 500 });
  }
}
