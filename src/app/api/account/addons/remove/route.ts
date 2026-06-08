/**
 * POST /api/account/addons/remove
 *
 * Detach a plan add-on from a SPECIFIC SITE the caller owns.
 *
 * Body: { siteId: string, addonSlug: string }
 * Auth: regular user session (auth.uid()).
 *
 * Model — site-scoped add-ons (per-site subscription):
 *   Each site has its own Stripe subscription; an add-on is a
 *   SubscriptionItem on it (quantity 1). Removing the add-on deletes that
 *   SubscriptionItem outright. The (site, add-on) `site_addons` row is
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
    .select('id, user_id, wp_cloud_url, metadata')
    .eq('id', siteId)
    .maybeSingle();
  if (!site) return NextResponse.json({ ok: false, error: 'Site not found.' }, { status: 404 });
  if (site.user_id !== user.id) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  // ── Lookup the add-on row ───────────────────────────
  const { data: addon } = await sbService
    .from('products')
    .select('id, slug, type, metadata')
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

  // ── Stripe: delete the SubscriptionItem from this site's sub ──
  // Per-site model: the item is exclusive to this site's subscription, so
  // it's removed outright (the plan item keeps the subscription alive).
  if (stripeItemId) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });
    try {
      await stripe.subscriptionItems.del(stripeItemId);
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
      stripe_item_deleted: !!stripeItemId,
    },
  });

  // Re-apply effective config — since the removed addon is now
  // status='cancelled', the helper recomputes from (plan + remaining
  // active addons). If no other addons contribute the same field, the
  // value falls back to the plan default (e.g. php_workers: 4 → 2).
  const appliedConfig = await applySiteAddonEffects(siteId, user.id);

  // Jetpack add-on removed: revert the site's Jetpack tier to the add-on's
  // baseline (e.g. back to `free`). Best-effort + non-fatal.
  const addonMeta = (addon as any).metadata ?? {};
  if (addonMeta.jetpack_plan_slug && (site as any).wp_cloud_url) {
    try {
      const { jetpackPartnerProvision } = await import('@/lib/integrations/jetpack');
      const localUser = ((site as any).metadata?.wp_admin_user as string | undefined) ?? user.email ?? '';
      const revertSlug = (addonMeta.revert_slug as string | undefined) ?? 'free';
      if (localUser) {
        await jetpackPartnerProvision({ siteUrl: (site as any).wp_cloud_url, localUser, plan: revertSlug });
      }
    } catch (e) {
      console.error('[addons/remove] jetpack revert failed (non-fatal):', e);
    }
  }

  return NextResponse.json({ ok: true, applied_config: appliedConfig });
}
