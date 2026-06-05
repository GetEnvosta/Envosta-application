/**
 * POST /api/admin/transfer-site  — Admin: move a site (with its billing) from
 * one account to another.
 *
 * Body: { siteId, newUserId }
 *
 * PER-SITE model: each site has its OWN Stripe subscription. Transferring a
 * site means:
 *   1. CREATE a new subscription for the site under the NEW owner (charged
 *      immediately) — so there is never a window where nobody is paying.
 *      Aborts cleanly if the new owner's payment can't complete.
 *   2. Recreate the site's active add-ons as items on the new subscription.
 *   3. Flip sites.user_id + stripe_subscription_id + stripe_subscription_item_id
 *      and repoint each site_addons row to its new Stripe item.
 *   4. CANCEL the OLD subscription (prorated — the previous owner is credited
 *      for the unused portion of the cycle); this also removes its add-on items.
 *   5. Audit everything.
 *
 * The wp.cloud site itself is untouched — only ownership + billing move.
 * Admin-only. Cannot be exercised from local dev (no live Stripe) — verify
 * on deploy with a low-stakes site first.
 */
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { isAdminRole } from '@/lib/roles';
import { resellerCouponForUser } from '@/lib/reseller';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

function pickAddonPrice(addon: any, interval: 'month' | 'year'): string | null {
  const yearly = interval === 'year';
  return yearly
    ? (addon.stripe_price_id_yearly ?? addon.stripe_price_id ?? addon.stripe_price_id_yearly_cad ?? addon.stripe_price_id_cad ?? null)
    : (addon.stripe_price_id ?? addon.stripe_price_id_cad ?? addon.stripe_price_id_yearly ?? addon.stripe_price_id_yearly_cad ?? null);
}

export async function POST(req: Request) {
  // ── Admin auth ──
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: actor } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!isAdminRole(actor?.role)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const siteId = String(body?.siteId ?? '');
  const newUserId = String(body?.newUserId ?? '');
  if (!siteId || !newUserId) {
    return NextResponse.json({ error: 'siteId and newUserId are required' }, { status: 400 });
  }

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });

  // ── Load the site ──
  const { data: site } = await sb
    .from('sites')
    .select('id, user_id, label, product_id, stripe_subscription_id, stripe_subscription_item_id')
    .eq('id', siteId)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  const oldUserId = site.user_id as string | null;
  if (oldUserId === newUserId) {
    return NextResponse.json({ error: 'Site already belongs to that account' }, { status: 400 });
  }

  // ── Validate the new owner ──
  const { data: newOwner } = await sb
    .from('users')
    .select('id, email, full_name, stripe_customer_id')
    .eq('id', newUserId)
    .maybeSingle();
  if (!newOwner) return NextResponse.json({ error: 'New owner not found' }, { status: 404 });
  if (!newOwner.stripe_customer_id) {
    return NextResponse.json(
      { error: 'New owner has no payment method on file. They must add one before a site can be transferred to them.' },
      { status: 400 },
    );
  }

  // ── Resolve the price + billing interval to move ──
  // Prefer the site's current plan item (carries the exact price + interval);
  // fall back to the plan product's price if the item is stale/missing.
  const oldSubId = site.stripe_subscription_id as string | null;
  const oldItemId = site.stripe_subscription_item_id as string | null;
  let priceId: string | null = null;
  let interval: 'month' | 'year' = 'month';

  if (oldItemId) {
    try {
      const oldItem = await stripe.subscriptionItems.retrieve(oldItemId);
      priceId = oldItem.price?.id ?? null;
      interval = (oldItem.price?.recurring?.interval as any) === 'year' ? 'year' : 'month';
    } catch {
      // Stale/missing item — fall back to the plan price below.
    }
  }
  if (!priceId) {
    const { data: planProduct } = await sb
      .from('products')
      .select('stripe_price_id, stripe_price_id_yearly')
      .eq('id', site.product_id)
      .maybeSingle();
    priceId = (planProduct?.stripe_price_id ?? planProduct?.stripe_price_id_yearly) as string | null;
    if (planProduct?.stripe_price_id_yearly && !planProduct?.stripe_price_id) interval = 'year';
  }
  if (!priceId) {
    return NextResponse.json({ error: 'Could not resolve a Stripe price for this site (plan not synced?).' }, { status: 400 });
  }

  // ── 1) Create the site's NEW subscription under the new owner ──
  // (Charged immediately — there is never a window where nobody is paying.)
  // Resellers get the flat platform discount on the new subscription too.
  const resellerCoupon = await resellerCouponForUser(sb, stripe, newUserId);
  let newSub: Stripe.Subscription;
  try {
    newSub = await stripe.subscriptions.create({
      customer: newOwner.stripe_customer_id,
      items: [{ price: priceId, metadata: { envosta_site_id: siteId } }],
      payment_settings: { save_default_payment_method: 'on_subscription' },
      ...(resellerCoupon ? { coupon: resellerCoupon } : {}),
      metadata: {
        supabase_user_id: newUserId,
        envosta_site_id: siteId,
        subscription_type: 'hosting',
        billing_period: interval === 'year' ? 'yearly' : 'monthly',
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: `Failed to create the site's subscription under the new owner — transfer aborted, nothing changed: ${e?.message ?? e}` },
      { status: 502 },
    );
  }
  const newSubId = newSub.id;

  // If the new owner's immediate charge couldn't complete, abort cleanly
  // BEFORE flipping anything — the old owner keeps the site + billing.
  if (newSub.status !== 'active' && newSub.status !== 'trialing') {
    try { await stripe.subscriptions.cancel(newSubId); } catch { /* best-effort */ }
    return NextResponse.json(
      { error: `New owner's payment could not be completed (subscription ${newSub.status}). Transfer aborted, nothing changed.` },
      { status: 402 },
    );
  }
  const newItemId = newSub.items.data[0]?.id ?? null;

  // ── 2) Recreate active add-ons as items on the NEW subscription ──
  const { data: addonRows } = await sb
    .from('site_addons')
    .select('id, product_id, stripe_subscription_item_id, products:product_id(slug, name, stripe_price_id, stripe_price_id_yearly, stripe_price_id_cad, stripe_price_id_yearly_cad)')
    .eq('site_id', siteId)
    .eq('status', 'active');

  const addonResults: { slug: string; moved: boolean; error?: string }[] = [];
  for (const row of addonRows ?? []) {
    const addon: any = (row as any).products ?? {};
    const slug = addon.slug ?? '(unknown)';
    try {
      const addonPriceId = pickAddonPrice(addon, interval);
      if (!addonPriceId) throw new Error('add-on has no synced Stripe price');

      const created = await stripe.subscriptionItems.create({
        subscription: newSubId,
        price: addonPriceId,
        quantity: 1,
        metadata: { envosta_addon_slug: slug, envosta_user_id: newUserId, envosta_site_id: siteId },
      });

      await sb.from('site_addons').update({
        stripe_subscription_item_id: created.id,
        updated_at: new Date().toISOString(),
      }).eq('id', (row as any).id);

      addonResults.push({ slug, moved: true });
    } catch (e: any) {
      addonResults.push({ slug, moved: false, error: e?.message ?? String(e) });
    }
  }

  // ── 3) Flip ownership + per-site billing link on the site row ──
  await sb.from('sites').update({
    user_id: newUserId,
    stripe_subscription_id: newSubId,
    stripe_subscription_item_id: newItemId,
    updated_at: new Date().toISOString(),
  }).eq('id', siteId);

  // ── 4) Cancel the OLD subscription (prorated credit to the old owner) ──
  // Cancelling removes its plan item AND any lingering add-on items in one
  // shot. Best-effort — the site is already on the new owner, so a failure
  // here is a billing-cleanup follow-up, not a blocker.
  let oldCancelError: string | null = null;
  if (oldSubId) {
    try {
      await stripe.subscriptions.cancel(oldSubId, { prorate: true, invoice_now: true } as any);
    } catch (e: any) {
      oldCancelError = e?.message ?? String(e);
    }
  }

  // ── 5) Audit ──
  await recordAudit({
    actorId: user.id,
    actorType: 'admin',
    action: 'admin.site_transferred',
    resourceType: 'site',
    resourceId: siteId,
    before: { user_id: oldUserId, stripe_subscription_id: oldSubId, stripe_subscription_item_id: oldItemId },
    after: { user_id: newUserId, stripe_subscription_id: newSubId, stripe_subscription_item_id: newItemId },
    metadata: {
      level: oldCancelError || addonResults.some(a => !a.moved) ? 'warn' : 'info',
      details: `Site "${site.label}" transferred${oldUserId ? ` from ${oldUserId}` : ''} to ${newOwner.email}. New per-site subscription created; old subscription cancelled (prorated).`,
      old_owner: oldUserId,
      new_owner: newUserId,
      old_subscription_cancelled: !oldCancelError && !!oldSubId,
      old_cancel_error: oldCancelError,
      addons: addonResults,
    },
  });

  return NextResponse.json({
    ok: true,
    siteId,
    newOwner: { id: newOwner.id, email: newOwner.email },
    newSubscriptionId: newSubId,
    oldSubscriptionCancelled: !oldCancelError && !!oldSubId,
    oldCancelError,
    addons: addonResults,
    warning: oldCancelError
      ? 'Site moved + new owner billed, but the OLD subscription could not be cancelled — cancel it manually in Stripe to stop billing the previous owner.'
      : undefined,
  });
}
