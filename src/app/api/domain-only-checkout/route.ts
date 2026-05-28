/**
 * POST /api/domain-only-checkout
 *
 * Domain-only flow for new customers. Creates the user account, then
 * redirects to a Stripe Checkout Session (mode='payment') with inline
 * price_data computed from public.tlds. No persistent Stripe Product/Price.
 *
 * On checkout success Stripe calls webhooks/stripe → registers the domain
 * via /api/internal/opensrs/register-domain and stamps domains.auto_renew
 * so the daily renewal cron picks it up.
 *
 * Body: { name, email, password, domainName, years? }
 * Returns: { url, userId }
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { getTldByName, getRegisterPriceCents } from '@/services/tlds';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`domain-checkout:${ip}`, 10, 300_000);
  if (!allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

  try {
    const body = await req.json();
    const { name, email, password, domainName } = body;
    const years: number = Math.max(1, Math.min(10, parseInt(body.years ?? '1', 10) || 1));

    if (!email || !password || !name) return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    if (!domainName || !domainName.includes('.')) return NextResponse.json({ error: 'Valid domain name required' }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });

    // ── 1. Resolve TLD pricing up front (cheap fail before any auth writes) ──
    const fullDomain = String(domainName).toLowerCase().trim();
    const tld = fullDomain.split('.').pop()!;
    const tldRow = await getTldByName(tld);
    if (!tldRow || !tldRow.is_active) {
      return NextResponse.json({ error: `Domain extension .${tld} is not available` }, { status: 400 });
    }
    const totalCents = await getRegisterPriceCents(tld, 'cad', years);
    if (!totalCents || totalCents <= 0) {
      return NextResponse.json({ error: `Pricing not configured for .${tld}` }, { status: 400 });
    }

    // ── 2. Create or find user ──
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

    // ── 3. Resolve / create Stripe customer ──
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

    // ── 4. Build Stripe Checkout Session with inline price_data ──
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
      payment_intent_data: {
        setup_future_usage: 'off_session',
      },
      metadata: {
        supabase_user_id: userId!,
        domain_name: fullDomain,
        product_type: 'domain_registration',
        tld: tldRow.tld,
        years: String(years),
      },
      success_url: `${appUrl}/buy-domain?domain=${encodeURIComponent(fullDomain)}&success=1`,
      cancel_url: `${appUrl}/buy-domain?domain=${encodeURIComponent(fullDomain)}&cancelled=1`,
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      userId,
      price: totalCents / 100,
    });
  } catch (e: any) {
    console.error('Domain checkout error:', e);
    return NextResponse.json({ error: e.message ?? 'Internal error' }, { status: 500 });
  }
}
