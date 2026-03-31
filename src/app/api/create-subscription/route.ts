import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

/**
 * POST — Create a Stripe subscription with incomplete status for embedded checkout.
 * Returns client_secret for PaymentElement confirmation.
 *
 * For new signups: creates user first, then subscription.
 * For dashboard: uses existing auth.
 */
export async function POST(req: Request) {
  const body = await req.json();
  const { priceId, domainName, name, email, password, trial, promoCode, billing } = body;

  if (!priceId) return NextResponse.json({ error: 'priceId is required' }, { status: 400 });

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });

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
      const { data: authUser, error: authErr } = await sb.auth.admin.createUser({
        email: email.toLowerCase(),
        password,
        email_confirm: true,
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
        metadata: { signup_source: 'embedded_checkout' },
      }, { onConflict: 'id' });
    }
  } else {
    // Logged-in user
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // Build subscription params
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
    },
  };

  // Trial
  if (trial) {
    subParams.trial_period_days = 14;
  }

  // Promo code
  if (promoCode) {
    try {
      const promos = await stripe.promotionCodes.list({ code: promoCode, active: true, limit: 1 });
      if (promos.data[0]) {
        (subParams as any).promotion_code = promos.data[0].id;
      }
    } catch { /* ignore */ }
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
}
