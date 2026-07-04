/**
 * POST /api/admin/custom-subscription
 *
 * Creates a bespoke Stripe Subscription for a customer at a custom price.
 * Used to onboard bespoke Enterprise-priced customers — one Stripe Product,
 * N per-customer Prices.
 *
 * Body: {
 *   userId:         string,            // target customer's public.users.id
 *   planSlug:       'enterprise',
 *   monthlyCents:   number,            // custom monthly price in cents
 *   yearlyCents?:   number,            // optional yearly price
 *   currency?:      'usd' | 'cad',     // default 'usd'
 *   sitesOverride?: number,            // optional per-customer site cap
 *                                      //   stored in users.metadata.custom_plan_sites_override
 *   immediate?:     boolean,           // default true — bills immediately, prorated
 * }
 *
 * Flow:
 *   1. Verify caller is admin.
 *   2. Lookup the plan row (enterprise) to get its
 *      stripe_product_id. If absent, error — admin must sync the plan
 *      to Stripe first via /admin/settings/plans first.
 *   3. Lookup the customer's stripe_customer_id. Create one if missing.
 *   4. Create a NEW Stripe Price under the plan's Product at the
 *      entered amounts (one per customer — Stripe Prices are immutable).
 *   5. Create the Stripe Subscription attaching that Price.
 *   6. Stamp users.metadata.custom_plan_* with the linkage so the
 *      dashboard's "what plan am I on" lookup can find the bespoke price.
 *   7. Audit the action.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { recordAudit } from '@/lib/audit';
import { isAdminRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });
}

export async function POST(req: Request) {
  // ── Auth: admin only ─────────────────────────────────────
  const jar = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => jar.getAll(), setAll() {} } },
  );
  const { data: { user: caller } } = await supabaseAuth.auth.getUser();
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: callerProfile } = await sb.from('users').select('role').eq('id', caller.id).maybeSingle();
  if (!isAdminRole(callerProfile?.role)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  // ── Body parsing ─────────────────────────────────────────
  let body: any = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const userId = typeof body.userId === 'string' ? body.userId : '';
  const planSlug = typeof body.planSlug === 'string' ? body.planSlug : '';
  const monthlyCents = Number(body.monthlyCents);
  const yearlyCents = body.yearlyCents != null ? Number(body.yearlyCents) : null;
  const currency = (body.currency === 'cad' ? 'cad' : 'usd') as 'cad' | 'usd';
  const sitesOverride = body.sitesOverride != null ? Number(body.sitesOverride) : null;
  const immediate = body.immediate !== false; // default true

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
  if (!['enterprise'].includes(planSlug)) {
    return NextResponse.json({ error: 'planSlug must be "enterprise"' }, { status: 400 });
  }
  if (!Number.isFinite(monthlyCents) || monthlyCents < 100) {
    return NextResponse.json({ error: 'monthlyCents must be >= 100' }, { status: 400 });
  }
  if (yearlyCents != null && (!Number.isFinite(yearlyCents) || yearlyCents < 100)) {
    return NextResponse.json({ error: 'yearlyCents must be >= 100 if provided' }, { status: 400 });
  }

  // ── Lookup plan + customer ───────────────────────────────
  const { data: plan } = await sb
    .from('products')
    .select('id, slug, name, stripe_product_id, metadata')
    .eq('slug', planSlug)
    .eq('type', 'hosting_plan')
    .maybeSingle();

  if (!plan) {
    return NextResponse.json({ error: `Plan "${planSlug}" not found` }, { status: 404 });
  }
  if (!plan.stripe_product_id) {
    return NextResponse.json(
      { error: `Plan "${planSlug}" has no Stripe Product yet. Sync it first via /admin/settings/plans.` },
      { status: 400 },
    );
  }

  const { data: targetUser } = await sb
    .from('users')
    .select('id, email, full_name, stripe_customer_id, metadata')
    .eq('id', userId)
    .maybeSingle();

  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (!targetUser.email) return NextResponse.json({ error: 'User has no email' }, { status: 400 });

  // ── Stripe: ensure customer + create Price + create Subscription ──
  const stripe = getStripe();

  let stripeCustomerId = targetUser.stripe_customer_id as string | null;
  if (!stripeCustomerId) {
    try {
      const created = await stripe.customers.create({
        email: targetUser.email,
        name: targetUser.full_name ?? undefined,
        metadata: { envosta_user_id: targetUser.id },
      });
      stripeCustomerId = created.id;
      await sb.from('users').update({ stripe_customer_id: stripeCustomerId }).eq('id', userId);
    } catch (e: any) {
      return NextResponse.json({ error: `Stripe customer create failed: ${e?.message ?? 'unknown'}` }, { status: 502 });
    }
  }

  // Create the per-customer monthly Price under the plan's Stripe Product.
  // (Yearly is optional and used only if caller provided it.)
  let monthlyPriceId: string;
  let yearlyPriceId: string | null = null;
  try {
    const mp = await stripe.prices.create({
      product: plan.stripe_product_id,
      unit_amount: monthlyCents,
      currency,
      recurring: { interval: 'month' },
      metadata: {
        envosta_custom: 'true',
        envosta_customer_id: targetUser.id,
        envosta_plan_slug: planSlug,
      },
    });
    monthlyPriceId = mp.id;

    if (yearlyCents != null) {
      const yp = await stripe.prices.create({
        product: plan.stripe_product_id,
        unit_amount: yearlyCents,
        currency,
        recurring: { interval: 'year' },
        metadata: {
          envosta_custom: 'true',
          envosta_customer_id: targetUser.id,
          envosta_plan_slug: planSlug,
        },
      });
      yearlyPriceId = yp.id;
    }
  } catch (e: any) {
    return NextResponse.json({ error: `Stripe price create failed: ${e?.message ?? 'unknown'}` }, { status: 502 });
  }

  // Create the Subscription attaching the monthly Price. The customer can
  // be switched to yearly later via the Stripe Dashboard or a separate
  // update call — they all live under the same Product.
  let subscription: Stripe.Subscription;
  try {
    subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: monthlyPriceId, quantity: 1 }],
      proration_behavior: immediate ? 'create_prorations' : 'none',
      metadata: {
        envosta_user_id: targetUser.id,
        envosta_plan_slug: planSlug,
        envosta_custom_pricing: 'true',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: `Stripe subscription create failed: ${e?.message ?? 'unknown'}` }, { status: 502 });
  }

  // ── DB: stamp custom-plan linkage on the user ────────────
  const meta = (targetUser.metadata as Record<string, unknown> | null) ?? {};
  const newMeta = {
    ...meta,
    custom_plan_slug: planSlug,
    custom_plan_monthly_price_id: monthlyPriceId,
    custom_plan_yearly_price_id: yearlyPriceId,
    custom_plan_sites_override: sitesOverride,
    custom_plan_subscription_id: subscription.id,
    custom_plan_assigned_at: new Date().toISOString(),
    custom_plan_assigned_by: caller.id,
  };
  await sb.from('users').update({ metadata: newMeta }).eq('id', userId);

  // ── Audit ────────────────────────────────────────────────
  await recordAudit({
    actorId: caller.id,
    actorType: 'admin',
    action: 'admin.custom_subscription.created',
    resourceType: 'user',
    resourceId: targetUser.id,
    metadata: {
      plan_slug: planSlug,
      monthly_cents: monthlyCents,
      yearly_cents: yearlyCents,
      currency,
      sites_override: sitesOverride,
      stripe_subscription_id: subscription.id,
      stripe_monthly_price_id: monthlyPriceId,
      stripe_yearly_price_id: yearlyPriceId,
    },
  });

  return NextResponse.json({
    ok: true,
    subscriptionId: subscription.id,
    monthlyPriceId,
    yearlyPriceId,
    stripeCustomerId,
  });
}
