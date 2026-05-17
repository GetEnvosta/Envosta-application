/**
 * POST /api/account/addons/add
 *
 * Attach a plan add-on (Jetpack, bursting capacity, etc.) to the
 * caller's active hosting subscription as a new Stripe SubscriptionItem.
 * Stripe handles proration automatically.
 *
 * Body: { addonSlug: string, quantity?: number }
 * Auth: regular user session (auth.uid()).
 *
 * Idempotency: if the add-on's Stripe Price is already a line item on
 * the user's sub, returns success with the existing item ID instead of
 * creating a duplicate. The match is exact-priceId — same add-on at a
 * different billing period is treated as a different item.
 */
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { getAccountSubscription } from '@/services/billing';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  const addonSlug = typeof body.addonSlug === 'string' ? body.addonSlug : '';
  const quantity = Math.max(1, Math.min(100, parseInt(String(body.quantity ?? 1), 10) || 1));
  if (!addonSlug) {
    return NextResponse.json({ ok: false, error: 'addonSlug is required' }, { status: 400 });
  }

  const sbService = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  // ── Lookup user's active sub ────────────────────────
  const sub = await getAccountSubscription(user.id);
  if (!sub?.id) {
    return NextResponse.json({ ok: false, error: 'No active hosting subscription found.' }, { status: 400 });
  }

  // ── Lookup the add-on row ───────────────────────────
  const { data: addon } = await sbService
    .from('products')
    .select('id, slug, type, is_active, stripe_price_id, stripe_price_id_yearly, stripe_price_id_cad, stripe_price_id_yearly_cad')
    .eq('type', 'plan_addon')
    .eq('slug', addonSlug)
    .maybeSingle();
  if (!addon) return NextResponse.json({ ok: false, error: `Addon "${addonSlug}" not found.` }, { status: 404 });
  if (!addon.is_active) return NextResponse.json({ ok: false, error: `Addon "${addonSlug}" is not available.` }, { status: 400 });

  // Pick the price ID matching the sub's billing period.
  const subMeta: any = sub.metadata ?? {};
  const wantYearly = subMeta.billing_period === 'yearly';
  const priceId = wantYearly
    ? (addon.stripe_price_id_yearly ?? addon.stripe_price_id ?? addon.stripe_price_id_yearly_cad ?? addon.stripe_price_id_cad)
    : (addon.stripe_price_id ?? addon.stripe_price_id_cad ?? addon.stripe_price_id_yearly ?? addon.stripe_price_id_yearly_cad);
  if (!priceId) {
    return NextResponse.json(
      { ok: false, error: `Addon "${addonSlug}" has no Stripe price. Admin should sync it first.` },
      { status: 400 },
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });

  // ── Idempotency check ───────────────────────────────
  // Fetch the latest sub from Stripe (Sync Engine mirror may lag a
  // few seconds) so the price match is fresh.
  let liveSub: Stripe.Subscription;
  try {
    liveSub = await stripe.subscriptions.retrieve(sub.id);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Subscription not found in Stripe' }, { status: 500 });
  }

  const existing = (liveSub.items?.data ?? []).find(i => i.price?.id === priceId);
  if (existing) {
    return NextResponse.json({
      ok: true,
      subscription_item_id: existing.id,
      already_attached: true,
    });
  }

  // ── Create the new sub item ─────────────────────────
  try {
    const created = await stripe.subscriptionItems.create({
      subscription: sub.id,
      price: priceId,
      quantity,
      metadata: {
        envosta_addon_slug: addonSlug,
        envosta_user_id: user.id,
      },
    });

    await recordAudit({
      actorId: user.id,
      actorType: 'user',
      action: 'subscription.addon.added',
      resourceType: 'subscription',
      resourceId: sub.id,
      metadata: {
        stripe_subscription_id: sub.id,
        stripe_subscription_item_id: created.id,
        addon_slug: addonSlug,
        quantity,
        price_id: priceId,
      },
    });

    return NextResponse.json({ ok: true, subscription_item_id: created.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Failed to add addon' }, { status: 500 });
  }
}
