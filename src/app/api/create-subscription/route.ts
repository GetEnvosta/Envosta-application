import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
// '@/lib/stripe-subscription' helpers (findHostingSubscription,
// addSiteLineItem, resolvePlanPrice) are intentionally unused in this
// file — the default signup path is one-site-per-subscription, so we
// skip the line-item-collapse logic. Those helpers stay exported for
// the future multi-site agency plan flow.

export const dynamic = 'force-dynamic';

/**
 * POST — Create a Stripe subscription with incomplete status for embedded checkout.
 * Returns client_secret for PaymentElement confirmation.
 *
 * If the user already has an active hosting subscription, adds a new site
 * line item to that subscription instead of creating a new one.
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
  const { priceId, domainName, name, email, password, trial, promoCode, billing, addonSlugs } = body as {
    priceId?: string;
    domainName?: string;
    name?: string;
    email?: string;
    password?: string;
    trial?: boolean;
    promoCode?: string;
    billing?: 'monthly' | 'yearly';
    /** Optional bundle of plan-addon slugs to attach as extra SubscriptionItems. */
    addonSlugs?: string[];
  };

  if (!priceId) return NextResponse.json({ error: 'priceId is required' }, { status: 400 });

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });

  // ── Resolve optional add-on bundle ─────────────────────────────
  // For each requested addonSlug, look up the products row and pick
  // the Stripe Price matching the billing period (yearly → monthly fallback).
  // Any addon that isn't synced to Stripe yet is a hard error — the
  // admin needs to hit "Sync to Stripe" on the addon row first.
  const cleanedAddonSlugs = Array.isArray(addonSlugs)
    ? Array.from(new Set(addonSlugs.filter((s): s is string => typeof s === 'string' && s.length > 0)))
    : [];
  const addonItems: { price: string; quantity: number }[] = [];
  if (cleanedAddonSlugs.length > 0) {
    const { data: addonRows } = await sb
      .from('products')
      .select('id, slug, type, is_active, stripe_price_id, stripe_price_id_yearly, stripe_price_id_cad, stripe_price_id_yearly_cad')
      .eq('type', 'plan_addon')
      .in('slug', cleanedAddonSlugs);

    const bySlug = new Map<string, any>((addonRows ?? []).map((r: any) => [r.slug, r]));
    for (const slug of cleanedAddonSlugs) {
      const row = bySlug.get(slug);
      if (!row || !row.is_active) {
        return NextResponse.json({ error: `Addon "${slug}" is not available.` }, { status: 400 });
      }
      const wantYearly = billing === 'yearly';
      // Prefer USD price IDs to match the hosting plan path (priceId from
      // the caller is whichever currency the checkout already chose).
      const priceForAddon = wantYearly
        ? (row.stripe_price_id_yearly ?? row.stripe_price_id ?? row.stripe_price_id_yearly_cad ?? row.stripe_price_id_cad)
        : (row.stripe_price_id ?? row.stripe_price_id_cad ?? row.stripe_price_id_yearly ?? row.stripe_price_id_yearly_cad);
      if (!priceForAddon) {
        return NextResponse.json(
          { error: `Addon "${slug}" has no Stripe price. Admin should sync it first.` },
          { status: 400 },
        );
      }
      addonItems.push({ price: priceForAddon, quantity: 1 });
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
  // Default behaviour today: every new site purchase creates its OWN
  // Stripe subscription (one site = one subscription, mirrors how each
  // domain is its own renewal sub). Customers can have many concurrent
  // hosting subscriptions on a single account.
  //
  // The collapse-into-existing-subscription path (adding a new line
  // item to an existing sub) is intentionally NOT used here — it stays
  // available via lib/stripe-subscription.ts#addSiteLineItem so a
  // future agency plan can opt back into multi-site-per-subscription
  // billing without re-implementing it.
  // ───────────────────────────────────────────────────────────────────

  // Build subscription params. Admin-created accounts get their Stripe
  // sub pre-created server-side (see lib/admin-precreate-subscription.ts)
  // and never reach this route, so no envosta_site_id pre-link logic
  // is needed here.
  const subParams: Stripe.SubscriptionCreateParams = {
    customer: customerId,
    items: [
      { price: priceId },
      ...addonItems.map(a => ({ price: a.price, quantity: a.quantity })),
    ],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
    metadata: {
      supabase_user_id: userId,
      domain_name: domainName ?? '',
      billing_period: billing ?? 'monthly',
      subscription_type: 'hosting',
      // JSON-string of the addon slugs bundled at signup. Read by the
      // stripe-webhook to drive per-addon side effects + audit log.
      addon_slugs: JSON.stringify(cleanedAddonSlugs),
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
  } catch (e: any) {
    console.error('Subscription error:', e);
    return NextResponse.json({ error: e.message ?? 'Internal error' }, { status: 500 });
  }
}
