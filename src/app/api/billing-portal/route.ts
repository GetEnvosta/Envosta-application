import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

/**
 * POST — Create a Stripe SetupIntent for updating payment method in-app.
 * Returns the client_secret for Stripe Elements.
 */
export async function POST() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  const { data: profile } = await sb.from('users').select('stripe_customer_id, email, full_name').eq('id', user.id).maybeSingle();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });

  // Get or create Stripe customer
  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const sc = await stripe.customers.create({
      email: profile?.email ?? user.email!,
      name: profile?.full_name ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    await sb.from('users').update({ stripe_customer_id: sc.id }).eq('id', user.id);
    customerId = sc.id;
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    usage: 'off_session',
  });

  return NextResponse.json({ clientSecret: setupIntent.client_secret });
}

/**
 * PUT — After SetupIntent succeeds, set the new payment method as default for all subscriptions.
 */
export async function PUT(req: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { paymentMethodId } = await req.json();
  if (!paymentMethodId) return NextResponse.json({ error: 'paymentMethodId required' }, { status: 400 });

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  const { data: profile } = await sb.from('users').select('stripe_customer_id, metadata').eq('id', user.id).maybeSingle();
  if (!profile?.stripe_customer_id) return NextResponse.json({ error: 'No billing account' }, { status: 404 });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });

  // Set as default payment method on customer
  await stripe.customers.update(profile.stripe_customer_id, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  // Get card details to store locally
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  const card = pm.card;

  if (card) {
    await sb.from('users').update({
      metadata: {
        ...((profile.metadata as any) ?? {}),
        card_brand: card.brand,
        card_last4: card.last4,
        card_expiry: `${String(card.exp_month).padStart(2, '0')}/${card.exp_year}`,
      },
    }).eq('id', user.id);
  }

  return NextResponse.json({ success: true });
}
