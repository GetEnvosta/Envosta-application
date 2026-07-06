/**
 * POST /api/signup-checkout — create the Stripe Checkout Session for the
 * signup flow (rebuild brief Phase 3.1/3.5).
 *
 * Gate: logged-in staff (rep-assisted) OR SELF_SERVE_ENABLED=true. Public
 * callers additionally pass Turnstile once configured.
 *
 * Pricing truth: config/pricing — charged via inline price_data so the
 * amounts can never drift from config. When Phase 6's Stripe bootstrap
 * creates catalog Prices, this route swaps to price IDs (one resolver).
 * Setup fees are never waived, discounted, or split (offer spec Call 2) —
 * there is no code path that omits them. Annual prepay = 12× monthly
 * billed yearly (the 13th-month-free bonus framing; handoff bootstrap
 * definition).
 *
 * On payment completion the Stripe webhook (envosta_flow='signup_v2')
 * writes the structured intake job + fires the internal notification.
 */
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient as createServerSupabase } from '@/lib/supabase-server';
import { isStaffRole } from '@/lib/roles';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { verifyTurnstile } from '@/lib/turnstile';
import { selfServeEnabled } from '@/config/flags';
import { getPlan, publicPlans, annualPrepayCents, CURRENCY, type PlanKey } from '@/config/pricing';
import { getIndustry, citySpotStatus, spotsRemaining } from '@/config/industries';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`signup:${ip}`, 10, 300_000);
  if (!allowed) return NextResponse.json({ error: 'Too many attempts. Please wait.' }, { status: 429 });

  // ── Gate: staff session or the self-serve flag ─────────────────
  let repUserId: string | null = null;
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
      if (isStaffRole(profile?.role)) repUserId = user.id;
    }
  } catch { /* treated as public */ }

  if (!repUserId && !selfServeEnabled()) {
    return NextResponse.json(
      { error: 'Signup is rep-assisted right now — start with the free scorecard and we will set you up.' },
      { status: 403 },
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Public (self-serve) callers pass Turnstile once keys are configured.
  if (!repUserId) {
    const ok = await verifyTurnstile(typeof body.turnstileToken === 'string' ? body.turnstileToken : '', ip);
    if (!ok) return NextResponse.json({ error: 'Verification failed — please retry.' }, { status: 400 });
  }

  // ── Validate the payload against config ───────────────────────
  const planKey = String(body.planKey ?? '') as PlanKey;
  const billing = body.billing === 'annual' ? 'annual' : 'monthly';
  const industrySlug = String(body.industry ?? '').trim();
  const city = String(body.city ?? '').trim().slice(0, 120);
  const business = String(body.business ?? '').trim().slice(0, 200);
  const contactName = String(body.contactName ?? '').trim().slice(0, 200);
  const email = String(body.email ?? '').trim().toLowerCase().slice(0, 320);
  const phone = String(body.phone ?? '').trim().slice(0, 40);
  const domainPref = ['need_domain', 'have_domain', 'not_sure'].includes(body.domainPref)
    ? (body.domainPref as string)
    : 'not_sure';
  const existingDomain = String(body.existingDomain ?? '').trim().toLowerCase().slice(0, 253);

  if (!publicPlans().some((p) => p.key === planKey)) {
    return NextResponse.json({ error: 'Pick a plan.' }, { status: 400 });
  }
  const plan = getPlan(planKey);
  const industry = getIndustry(industrySlug);
  if (!industry) return NextResponse.json({ error: 'Pick an industry we host.' }, { status: 400 });
  if (city.length < 2) return NextResponse.json({ error: 'City is required.' }, { status: 400 });
  if (business.length < 2 || contactName.length < 2) {
    return NextResponse.json({ error: 'Business and contact name are required.' }, { status: 400 });
  }
  if (!/.+@.+\..+/.test(email)) return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  if (phone.length < 7) return NextResponse.json({ error: 'A phone number is required.' }, { status: 400 });

  // Growth: enforce real per-industry, per-city exclusivity.
  if (planKey === 'growth') {
    if (citySpotStatus(industry.slug, city) !== 'open' || spotsRemaining(industry.slug) < 1) {
      return NextResponse.json(
        { error: `Growth is not available for ${industry.name} in ${city} — the spot is taken. Business is available.` },
        { status: 409 },
      );
    }
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Payments are not configured on this deploy.' }, { status: 503 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' as any });

  const currency = CURRENCY.toLowerCase();
  const recurring =
    billing === 'annual'
      ? { unit_amount: annualPrepayCents(plan), interval: 'year' as const }
      : { unit_amount: plan.monthlyCents, interval: 'month' as const };

  const intake: Record<string, string> = {
    envosta_flow: 'signup_v2',
    plan_key: plan.key,
    billing,
    industry: industry.slug,
    city,
    business,
    contact_name: contactName,
    email,
    phone,
    domain_pref: domainPref,
    existing_domain: existingDomain,
    rep_user_id: repUserId ?? '',
  };

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    new URL(req.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: recurring.unit_amount,
          recurring: { interval: recurring.interval },
          product_data: {
            name: `${plan.name} — industry-specialized managed hosting (${industry.name} · ${city})`,
          },
        },
      },
      // Setup fee — one-time, on the first invoice, never waived (Call 2).
      ...(plan.setupCents > 0
        ? [{
            quantity: 1,
            price_data: {
              currency,
              unit_amount: plan.setupCents,
              product_data: { name: `${plan.name} setup — white-glove onboarding` },
            },
          }]
        : []),
    ],
    subscription_data: { metadata: intake },
    metadata: intake,
    success_url: `${origin}/signup/complete?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/signup`,
  });

  if (repUserId) {
    await recordAudit({
      actorId: repUserId,
      actorType: 'admin',
      action: 'signup.checkout.created',
      resourceType: 'checkout_session',
      resourceId: session.id,
      metadata: { plan: plan.key, billing, industry: industry.slug, city, business, email },
    });
  }

  return NextResponse.json({ url: session.url, sessionId: session.id });
}
