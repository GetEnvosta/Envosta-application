import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

async function getAuthAndStripe() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: profile } = await sb.from('users').select('stripe_customer_id, metadata').eq('id', user.id).maybeSingle();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });

  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const sc = await stripe.customers.create({ email: user.email!, metadata: { supabase_user_id: user.id } });
    await sb.from('users').update({ stripe_customer_id: sc.id }).eq('id', user.id);
    customerId = sc.id;
  }

  return { user, stripe, sb, customerId, profile };
}

/** GET — List all payment methods + default */
export async function GET() {
  const ctx = await getAuthAndStripe();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { stripe, customerId } = ctx;

  const [methods, customer] = await Promise.all([
    stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 10 }),
    stripe.customers.retrieve(customerId),
  ]);

  let allMethods = methods.data;

  // Also check subscriptions for attached payment methods not on the customer directly
  if (allMethods.length === 0) {
    try {
      const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 });
      for (const sub of subs.data) {
        const pmId = typeof sub.default_payment_method === 'string' ? sub.default_payment_method : sub.default_payment_method?.id;
        if (pmId && !allMethods.find(m => m.id === pmId)) {
          try {
            const pm = await stripe.paymentMethods.retrieve(pmId);
            if (pm.card) allMethods.push(pm);
          } catch { /* PM might be detached */ }
        }
      }
    } catch { /* non-fatal */ }
  }

  const defaultPmId = (customer as Stripe.Customer).invoice_settings?.default_payment_method;

  return NextResponse.json({
    methods: allMethods.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand ?? 'card',
      last4: pm.card?.last4 ?? '****',
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
      isDefault: pm.id === defaultPmId || (allMethods.length === 1),
    })),
    defaultPaymentMethod: defaultPmId ?? null,
  });
}

/** POST — Create SetupIntent to add a new card */
export async function POST() {
  const ctx = await getAuthAndStripe();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const setupIntent = await ctx.stripe.setupIntents.create({
    customer: ctx.customerId,
    payment_method_types: ['card'],
    usage: 'off_session',
  });

  return NextResponse.json({ clientSecret: setupIntent.client_secret });
}

/** PUT — Set default or attach new payment method */
export async function PUT(req: Request) {
  const ctx = await getAuthAndStripe();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { paymentMethodId } = await req.json();
  if (!paymentMethodId) return NextResponse.json({ error: 'paymentMethodId required' }, { status: 400 });

  const { stripe, customerId, sb, user, profile } = ctx;

  // Set as default
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  // Store card details locally
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (pm.card) {
    await sb.from('users').update({
      metadata: {
        ...((profile?.metadata as any) ?? {}),
        card_brand: pm.card.brand,
        card_last4: pm.card.last4,
        card_expiry: `${String(pm.card.exp_month).padStart(2, '0')}/${pm.card.exp_year}`,
      },
    }).eq('id', user.id);
  }

  return NextResponse.json({ success: true });
}

/** DELETE — Remove a payment method */
export async function DELETE(req: Request) {
  const ctx = await getAuthAndStripe();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { paymentMethodId } = await req.json();
  if (!paymentMethodId) return NextResponse.json({ error: 'paymentMethodId required' }, { status: 400 });

  await ctx.stripe.paymentMethods.detach(paymentMethodId);
  return NextResponse.json({ success: true });
}
