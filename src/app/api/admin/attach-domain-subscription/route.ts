import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return null;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  return ['admin', 'staff'].includes(profile?.role) ? supabase : null;
}

export async function POST(req: Request) {
  const sb = await verifyAdmin();
  if (!sb) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  try {
    const { domainName, domainId, userId } = await req.json();
    if (!domainName || !userId) return NextResponse.json({ error: 'domainName and userId required' }, { status: 400 });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });

    // Get customer's Stripe ID
    const { data: user } = await sb.from('users').select('stripe_customer_id, email, full_name').eq('id', userId).single();
    if (!user?.stripe_customer_id) return NextResponse.json({ error: 'Customer has no Stripe account' }, { status: 400 });

    // Get TLD product
    const tld = domainName.split('.').pop()!.toLowerCase();
    const { data: tldProduct } = await sb.from('products')
      .select('stripe_price_id').eq('slug', `tld-${tld}`).eq('type', 'domain_tld').eq('is_active', true).single();
    if (!tldProduct?.stripe_price_id) return NextResponse.json({ error: `No pricing for .${tld}` }, { status: 400 });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: user.stripe_customer_id,
      items: [{ price: tldProduct.stripe_price_id }],
      metadata: {
        supabase_user_id: userId,
        domain_name: domainName,
        type: 'domain_renewal',
        created_by: 'admin',
      },
    });

    // Link to domain
    const { data: domRec } = await sb.from('domains').select('metadata').eq('domain_name', domainName).maybeSingle();
    await sb.from('domains').update({
      metadata: { ...((domRec?.metadata as any) ?? {}), renewal_stripe_subscription_id: subscription.id },
    }).eq('domain_name', domainName);

    return NextResponse.json({ subscriptionId: subscription.id, success: true });
  } catch (e: any) {
    console.error('Attach domain subscription error:', e);
    return NextResponse.json({ error: e.message ?? 'Internal error' }, { status: 500 });
  }
}
