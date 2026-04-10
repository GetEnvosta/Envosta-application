import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { quantity } = await req.json();
  if (!quantity || quantity < 10 || quantity > 10000) {
    return NextResponse.json({ error: 'Quantity must be between 10 and 10,000' }, { status: 400 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: profile } = await sb
    .from('users')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });

  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const sc = await stripe.customers.create({
      email: user.email!,
      metadata: { supabase_user_id: user.id },
    });
    await sb.from('users').update({ stripe_customer_id: sc.id }).eq('id', user.id);
    customerId = sc.id;
  }

  // Look up the credits product for its Stripe price ID
  const { data: creditProduct } = await sb
    .from('products')
    .select('stripe_price_id')
    .eq('slug', 'credits')
    .single();

  if (!creditProduct?.stripe_price_id) {
    return NextResponse.json({ error: 'Credits product not configured in Stripe' }, { status: 503 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    line_items: [{ price: creditProduct.stripe_price_id, quantity }],
    metadata: {
      type: 'credit_purchase',
      supabase_user_id: user.id,
      quantity: String(quantity),
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/billing?credits=purchased`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/billing`,
  });

  return NextResponse.json({ url: session.url });
}
