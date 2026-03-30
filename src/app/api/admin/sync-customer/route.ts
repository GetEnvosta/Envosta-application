import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

async function getUser(req: Request) {
  const jar = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => jar.getAll() } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const sb = getSupabaseAdmin();
  const { data: profile } = await sb.from('users').select('role').eq('id', user.id).single();
  return profile?.role === 'admin' ? user : null;
}

export async function POST(req: Request) {
  const admin = await getUser(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

  const sb = getSupabaseAdmin();
  const stripe = getStripe();

  // Get user's Stripe customer ID
  const { data: user } = await sb.from('users').select('stripe_customer_id, email').eq('id', userId).single();
  if (!user?.stripe_customer_id) {
    return NextResponse.json({ error: 'No Stripe customer ID on this user' }, { status: 400 });
  }

  const customerId = user.stripe_customer_id;
  let subsCount = 0;
  let invoicesCount = 0;

  // 1. Sync subscriptions
  const subs = await stripe.subscriptions.list({ customer: customerId, limit: 100, status: 'all' });
  for (const sub of subs.data) {
    const planPriceId = sub.items.data[0]?.price?.id;
    // Find matching product by any Stripe price ID
    let productId: string | null = null;
    if (planPriceId) {
      const { data: product } = await sb.from('products')
        .select('id')
        .or(`stripe_price_id.eq.${planPriceId},stripe_price_id_yearly.eq.${planPriceId},stripe_price_id_2yr.eq.${planPriceId},stripe_price_id_3yr.eq.${planPriceId}`)
        .maybeSingle();
      productId = product?.id ?? null;
    }

    // Map Stripe status to our status
    let status = sub.status;
    if (status === 'incomplete_expired' || status === 'incomplete') status = 'past_due';

    await sb.from('subscriptions').upsert({
      stripe_subscription_id: sub.id,
      user_id: userId,
      product_id: productId,
      status,
      current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
      ...(sub.trial_end && { trial_end: new Date(sub.trial_end * 1000).toISOString() }),
      ...(sub.canceled_at && { cancelled_at: new Date(sub.canceled_at * 1000).toISOString() }),
    }, { onConflict: 'stripe_subscription_id' });
    subsCount++;
  }

  // 2. Sync invoices (last 50)
  const invoices = await stripe.invoices.list({ customer: customerId, limit: 50 });
  for (const inv of invoices.data) {
    let status: string = inv.status ?? 'draft';
    if (status === 'open') status = 'pending';

    await sb.from('invoices').upsert({
      stripe_invoice_id: inv.id,
      user_id: userId,
      amount_due: inv.amount_due,
      amount_paid: inv.amount_paid,
      currency: inv.currency,
      status,
      invoice_url: inv.hosted_invoice_url ?? null,
      invoice_pdf: inv.invoice_pdf ?? null,
      period_start: new Date(inv.period_start * 1000).toISOString(),
      period_end: new Date(inv.period_end * 1000).toISOString(),
    }, { onConflict: 'stripe_invoice_id' });
    invoicesCount++;
  }

  // 3. Sync default payment method
  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
  if (customer.invoice_settings?.default_payment_method) {
    const pm = await stripe.paymentMethods.retrieve(
      customer.invoice_settings.default_payment_method as string
    );
    await sb.from('users').update({
      metadata: {
        payment_method: {
          brand: pm.card?.brand ?? null,
          last4: pm.card?.last4 ?? null,
          exp_month: pm.card?.exp_month ?? null,
          exp_year: pm.card?.exp_year ?? null,
        },
      },
    }).eq('id', userId);
  }

  return NextResponse.json({ subscriptions: subsCount, invoices: invoicesCount });
}
