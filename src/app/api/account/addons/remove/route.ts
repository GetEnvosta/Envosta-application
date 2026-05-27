/**
 * POST /api/account/addons/remove
 *
 * Detach a plan add-on from a SPECIFIC SITE the caller owns.
 *
 * Body: { siteId: string, addonSlug: string }
 * Auth: regular user session (auth.uid()).
 *
 * Model — site-scoped add-ons:
 *   One Stripe SubscriptionItem per add-on TYPE, `quantity` = the number
 *   of the account's sites using it. Removing an add-on from one site
 *   decrements that quantity; when the last site drops it the Stripe
 *   item is deleted outright. The (site, add-on) `site_addons` row is
 *   marked `cancelled` rather than hard-deleted (forensic trail).
 */
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
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
    .select('id, slug, type')
    .eq('type', 'plan_addon')
    .eq('slug', addonSlug)
    .maybeSingle();
  if (!addon) return NextResponse.json({ ok: false, error: `Addon "${addonSlug}" not found.` }, { status: 404 });

  // ── Find the active site_addons row for (site, add-on) ──
  const { data: addonRow } = await sbService
    .from('site_addons')
    .select('id, stripe_subscription_item_id')
    .eq('site_id', siteId)
    .eq('product_id', addon.id)
    .eq('status', 'active')
    .maybeSingle();
  if (!addonRow) {
    return NextResponse.json({ ok: false, error: `Add-on "${addonSlug}" is not active on this site.` }, { status: 404 });
  }

  const stripeItemId = addonRow.stripe_subscription_item_id;

  // ── Count OTHER active rows sharing the same Stripe item ──
  // These are other sites on the account still using this add-on TYPE;
  // they determine whether the Stripe item is decremented or deleted.
  let otherSitesUsing = 0;
  if (stripeItemId) {
    const { count } = await sbService
      .from('site_addons')
      .select('id', { count: 'exact', head: true })
      .eq('stripe_subscription_item_id', stripeItemId)
      .eq('status', 'active')
      .neq('id', addonRow.id);
    otherSitesUsing = count ?? 0;
  }

  // ── Stripe: decrement or delete the SubscriptionItem ──
  if (stripeItemId) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });
    try {
      if (otherSitesUsing > 0) {
        const item = await stripe.subscriptionItems.retrieve(stripeItemId);
        const nextQty = Math.max(1, (item.quantity ?? 1) - 1);
        await stripe.subscriptionItems.update(stripeItemId, { quantity: nextQty });
      } else {
        // Last site using this add-on TYPE → remove the item entirely.
        await stripe.subscriptionItems.del(stripeItemId);
      }
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e?.message ?? 'Failed to update Stripe subscription' }, { status: 500 });
    }
  }

  // ── Mark the row cancelled (kept for the forensic trail) ──
  const nowIso = new Date().toISOString();
  const { error: updErr } = await sbService
    .from('site_addons')
    .update({ status: 'cancelled', disabled_at: nowIso, updated_at: nowIso })
    .eq('id', addonRow.id);
  if (updErr) {
    return NextResponse.json({ ok: false, error: updErr.message ?? 'Failed to record removal' }, { status: 500 });
  }

  await recordAudit({
    actorId: user.id,
    actorType: 'user',
    action: 'site.addon.removed',
    resourceType: 'site',
    resourceId: siteId,
    metadata: {
      addon_slug: addonSlug,
      stripe_subscription_item_id: stripeItemId,
      stripe_item_deleted: otherSitesUsing === 0,
    },
  });

  // Re-apply effective config — since the removed addon is now
  // status='cancelled', the helper recomputes from (plan + remaining
  // active addons). If no other addons contribute the same field, the
  // value falls back to the plan default (e.g. php_workers: 4 → 2).
  const appliedConfig = await applySiteAddonEffects(siteId, user.id);

  return NextResponse.json({ ok: true, applied_config: appliedConfig });
}
