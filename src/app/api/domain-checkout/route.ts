/**
 * POST /api/domain-checkout
 *
 * Inline-price Stripe Checkout Session (mode='payment') for a one-time
 * domain registration. No persistent Stripe Product/Price — the
 * unit_amount is computed from public.tlds at request time. Renewals
 * are handled by /api/cron/process-domain-renewals (not a Stripe
 * Subscription).
 *
 * Body: { domainName: string, years?: number }
 * Returns: { url: string }   (Stripe Checkout URL — redirect the customer)
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { getTldByName, getRegisterPriceCents } from '@/services/tlds';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // ── Auth ──
    const jar = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { cookies: { getAll: () => jar.getAll(), setAll() {} } },
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { persistSession: false } },
    );
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });

    const body = await req.json();
    const domainName: string = body.domainName ?? '';
    const years: number = Math.max(1, Math.min(10, parseInt(body.years ?? '1', 10) || 1));

    if (!domainName || !domainName.includes('.')) {
      return NextResponse.json({ error: 'Valid domain name required' }, { status: 400 });
    }

    const fullDomain = domainName.toLowerCase().trim();
    const tld = fullDomain.split('.').pop()!;

    // ── Lookup TLD pricing ──
    const tldRow = await getTldByName(tld);
    if (!tldRow || !tldRow.is_active) {
      return NextResponse.json({ error: `Domain extension .${tld} is not available for registration` }, { status: 400 });
    }
    const totalCents = await getRegisterPriceCents(tld, 'cad', years);
    if (!totalCents || totalCents <= 0) {
      return NextResponse.json({ error: `Pricing not configured for .${tld} domains.` }, { status: 400 });
    }

    // ── Resolve / create Stripe customer ──
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

    // ── Build Checkout Session with inline price_data ──
    const origin = new URL(req.url).origin;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [{
        price_data: {
          currency: 'cad',
          product_data: {
            name: `Domain registration: ${fullDomain}`,
            description: `${years}-year registration of ${fullDomain}`,
            metadata: {
              tld: tldRow.tld,
              full_domain: fullDomain,
              years: String(years),
            },
          },
          unit_amount: totalCents,
        },
        quantity: 1,
      }],
      payment_method_types: ['card'],
      // Save the PM so the daily renewal cron can charge off-session later.
      payment_intent_data: {
        setup_future_usage: 'off_session',
      },
      metadata: {
        supabase_user_id: user.id,
        domain_name: fullDomain,
        product_type: 'domain_registration',
        tld: tldRow.tld,
        years: String(years),
      },
      success_url: `${appUrl}/dashboard/domains?registered=${encodeURIComponent(fullDomain)}`,
      cancel_url: `${appUrl}/buy-domain?domain=${encodeURIComponent(fullDomain)}&cancelled=1`,
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      price: totalCents / 100,
    });
  } catch (e: any) {
    console.error('Domain checkout error:', e);
    return NextResponse.json({ error: e.message ?? 'Internal error' }, { status: 500 });
  }
}
