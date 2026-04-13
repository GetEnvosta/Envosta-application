import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
  // Auth
  const jar = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => jar.getAll(), setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });

  const { domainName } = await req.json();
  if (!domainName || !domainName.includes('.')) {
    return NextResponse.json({ error: 'Valid domain name required' }, { status: 400 });
  }

  const domain = domainName.toLowerCase().trim();
  const tld = domain.split('.').pop()!;

  // Find the TLD product
  const { data: tldProduct } = await sb.from('products')
    .select('id, name, stripe_price_id, stripe_price_id_yearly, price_cad, price_yearly_cad')
    .eq('slug', `tld-${tld}`)
    .eq('type', 'domain_tld')
    .eq('is_active', true)
    .single();

  if (!tldProduct) {
    return NextResponse.json({ error: `Domain extension .${tld} is not available for registration` }, { status: 400 });
  }

  const priceId = tldProduct.stripe_price_id_yearly ?? tldProduct.stripe_price_id;
  if (!priceId) {
    return NextResponse.json({ error: `Pricing not configured for .${tld} domains.` }, { status: 400 });
  }

  // Get or create Stripe customer
  const { data: userProfile } = await sb.from('users')
    .select('stripe_customer_id, email, full_name')
    .eq('id', user.id)
    .single();

  let customerId = userProfile?.stripe_customer_id;
  if (!customerId) {
    const sc = await stripe.customers.create({
      email: userProfile?.email ?? user.email!,
      name: userProfile?.full_name ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    await sb.from('users').update({ stripe_customer_id: sc.id }).eq('id', user.id);
    customerId = sc.id;
  }

  // Create subscription with embedded payment
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId, quantity: 1 }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
    metadata: {
      supabase_user_id: user.id,
      domain_name: domain,
      is_domain_purchase: 'true',
      type: 'domain_renewal',
    },
  });

  const invoice = subscription.latest_invoice as any;
  const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent;

  if (!paymentIntent?.client_secret) {
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }

  const price = ((tldProduct as any).metadata?.registration_price_cad ?? tldProduct.price_cad ?? 0) / 100;

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    subscriptionId: subscription.id,
    price,
  });
  } catch (e: any) {
    console.error('Domain checkout error:', e);
    return NextResponse.json({ error: e.message ?? 'Internal error' }, { status: 500 });
  }
}
