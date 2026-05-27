/**
 * POST /api/account/addons/add
 *
 * Attach a plan add-on to a SPECIFIC SITE the caller owns.
 *
 * Body: { siteId: string, addonSlug: string }
 * Auth: regular user session (auth.uid()).
 *
 * Model — site-scoped add-ons:
 *   One Stripe Subscription per account; one Stripe SubscriptionItem per
 *   add-on TYPE with `quantity` = the number of the account's sites
 *   using that add-on; one `site_addons` row per (site, add-on) pairing.
 *   Adding an add-on to a site increments the Stripe item quantity (or
 *   creates the item at quantity 1 if no site uses it yet) and inserts /
 *   reactivates the `site_addons` row for that site.
 *
 * Idempotency: keyed on (site_id, product_id). If an `active` row
 * already exists the call is a no-op success; a previously `cancelled`
 * row is reactivated rather than duplicated.
 */
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { getAccountSubscription } from '@/services/billing';
import { recordAudit } from '@/lib/audit';
import { applySiteAddonEffects } from '@/lib/addon-effects';

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
  const siteId = typeof body.siteId === 'string' ? body.siteId : '';
  const addonSlug = typeof body.addonSlug === 'string' ? body.addonSlug : '';
  if (!siteId) {
    return NextResponse.json({ ok: false, error: 'siteId is required' }, { status: 400 });
  }
  if (!addonSlug) {
    return NextResponse.json({ ok: false, error: 'addonSlug is required' }, { status: 400 });
  }

  const sbService = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  // ── Verify site ownership ───────────────────────────
  const { data: site } = await sbService
    .from('sites')
    .select('id, user_id')
    .eq('id', siteId)
    .maybeSingle();
  if (!site) return NextResponse.json({ ok: false, error: 'Site not found.' }, { status: 404 });
  if (site.user_id !== user.id) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  // ── Lookup the add-on row ───────────────────────────
  const { data: addon } = await sbService
    .from('products')
    .select('id, slug, name, type, is_active, stripe_price_id, stripe_price_id_yearly, stripe_price_id_cad, stripe_price_id_yearly_cad')
    .eq('type', 'plan_addon')
    .eq('slug', addonSlug)
    .maybeSingle();
  if (!addon) return NextResponse.json({ ok: false, error: `Addon "${addonSlug}" not found.` }, { status: 404 });
  if (!addon.is_active) return NextResponse.json({ ok: false, error: `Addon "${addonSlug}" is not available.` }, { status: 400 });

  // ── Idempotency on (site_id, product_id) ────────────
  const { data: existingRow } = await sbService
    .from('site_addons')
    .select('id, status, stripe_subscription_item_id')
    .eq('site_id', siteId)
    .eq('product_id', addon.id)
    .maybeSingle();
  if (existingRow?.status === 'active') {
    return NextResponse.json({
      ok: true,
      already_attached: true,
      site_addon_id: existingRow.id,
      stripe_subscription_item_id: existingRow.stripe_subscription_item_id,
    });
  }

  // ── Lookup user's active sub ────────────────────────
  const sub = await getAccountSubscription(user.id);
  if (!sub?.id) {
    return NextResponse.json({ ok: false, error: 'No active hosting subscription found.' }, { status: 400 });
  }

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

  // ── Stripe item management ──────────────────────────
  // Fetch the live sub (Sync Engine mirror may lag a few seconds) and
  // find the SubscriptionItem for this add-on TYPE (matched by priceId).
  // If found → bump quantity by 1; if not → create it at quantity 1.
  let liveSub: Stripe.Subscription;
  try {
    liveSub = await stripe.subscriptions.retrieve(sub.id);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Subscription not found in Stripe' }, { status: 500 });
  }

  let stripeItemId: string;
  try {
    const existingItem = (liveSub.items?.data ?? []).find(i => i.price?.id === priceId);
    if (existingItem) {
      const updated = await stripe.subscriptionItems.update(existingItem.id, {
        quantity: (existingItem.quantity ?? 0) + 1,
      });
      stripeItemId = updated.id;
    } else {
      const created = await stripe.subscriptionItems.create({
        subscription: sub.id,
        price: priceId,
        quantity: 1,
        metadata: {
          envosta_addon_slug: addonSlug,
          envosta_user_id: user.id,
        },
      });
      stripeItemId = created.id;
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Failed to update Stripe subscription' }, { status: 500 });
  }

  // ── Upsert site_addons on (site_id, product_id) ─────
  // Per-row quantity is always 1 — multiplicity across sites lives in
  // the row count + the Stripe item's quantity, never on the row.
  const nowIso = new Date().toISOString();
  const { data: upserted, error: upsertErr } = await sbService
    .from('site_addons')
    .upsert(
      {
        site_id: siteId,
        product_id: addon.id,
        quantity: 1,
        status: 'active',
        stripe_subscription_item_id: stripeItemId,
        enabled_at: nowIso,
        disabled_at: null,
        updated_at: nowIso,
      },
      { onConflict: 'site_id,product_id' },
    )
    .select('id')
    .single();
  if (upsertErr || !upserted) {
    return NextResponse.json(
      { ok: false, error: upsertErr?.message ?? 'Failed to record add-on' },
      { status: 500 },
    );
  }

  await recordAudit({
    actorId: user.id,
    actorType: 'user',
    action: 'site.addon.added',
    resourceType: 'site',
    resourceId: siteId,
    metadata: {
      addon_slug: addonSlug,
      stripe_subscription_item_id: stripeItemId,
    },
  });

  // Apply any resource effects declared in the addon's metadata.effects
  // (e.g. Power Pack → php_workers: 4). This pushes the new computed
  // config to wp.cloud and updates the local sites row. Failure is
  // audited but never propagated — reconcile-wpcloud catches drift.
  const appliedConfig = await applySiteAddonEffects(siteId, user.id);

  return NextResponse.json({
    ok: true,
    site_addon_id: upserted.id,
    stripe_subscription_item_id: stripeItemId,
    applied_config: appliedConfig,
  });
}
