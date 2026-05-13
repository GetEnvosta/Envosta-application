import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * POST — Domain-only checkout: creates account + domain subscription.
 * No hosting plan required. Returns client_secret for embedded payment.
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`domain-checkout:${ip}`, 10, 300_000);
  if (!allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

  try {
  const { name, email, password, domainName } = await req.json();
  if (!email || !password || !name) return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
  if (!domainName || !domainName.includes('.')) return NextResponse.json({ error: 'Valid domain name required' }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });

  // 1. Create or find user
  let userId: string;
  const { data: existing } = await sb.from('users').select('id').eq('email', email.toLowerCase()).maybeSingle();

  if (existing) {
    userId = existing.id;
  } else {
    const { data: authUser, error: authErr } = await sb.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (authErr) {
      // User exists in auth but not in users table
      if (authErr.message?.includes('already been registered')) {
        const { data: userRow } = await sb.from('users').select('id').eq('email', email.toLowerCase()).maybeSingle();
        if (userRow) { userId = userRow.id; } else { return NextResponse.json({ error: 'Account exists. Please sign in.' }, { status: 400 }); }
      } else {
        return NextResponse.json({ error: authErr.message ?? 'Failed to create account' }, { status: 400 });
      }
    } else {
      userId = authUser.user!.id;
      await sb.from('users').upsert({
        id: userId, email: email.toLowerCase(), full_name: name, role: 'customer',
        metadata: { signup_source: 'domain_purchase' },
      }, { onConflict: 'id' });
    }
  }

  // 2. Get TLD product
  const tld = domainName.split('.').pop()!.toLowerCase();
  const { data: tldProduct } = await sb.from('products')
    .select('id, stripe_price_id, price_cad, metadata')
    .eq('slug', `tld-${tld}`).eq('type', 'domain_tld').eq('is_active', true).single();

  if (!tldProduct?.stripe_price_id) {
    return NextResponse.json({ error: `Domain extension .${tld} is not available` }, { status: 400 });
  }

  // 3. Get or create Stripe customer
  const { data: profile } = await sb.from('users').select('stripe_customer_id, full_name').eq('id', userId!).maybeSingle();
  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const sc = await stripe.customers.create({
      email: email.toLowerCase(), name: name,
      metadata: { supabase_user_id: userId! },
    });
    await sb.from('users').update({ stripe_customer_id: sc.id }).eq('id', userId!);
    customerId = sc.id;
  }

  // 4. Create domain subscription with embedded payment
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: tldProduct.stripe_price_id }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
    metadata: {
      supabase_user_id: userId!,
      domain_name: domainName,
      is_domain_purchase: 'true',
      type: 'domain_renewal',
    },
  });

  const invoice = subscription.latest_invoice as any;
  const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent;

  if (!paymentIntent?.client_secret) {
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    subscriptionId: subscription.id,
  });
  } catch (e: any) {
    console.error('Domain checkout error:', e);
    return NextResponse.json({ error: e.message ?? 'Internal error' }, { status: 500 });
  }
}
