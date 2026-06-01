/**
 * POST /api/admin/transfer-site  — Admin: move a site (with its billing) from
 * one account to another.
 *
 * Body: { siteId, newUserId }
 *
 * Unlike /api/admin/assign-site-owner (which only flips sites.user_id and
 * leaves the OLD owner paying), this moves the billing too:
 *   1. Cap check on the new owner's plan (sites_allowed).
 *   2. ADD the site's line item to the new owner's subscription FIRST
 *      (create the sub if they have none; resume if paused) — so there is
 *      never a window where nobody is paying.
 *   3. Flip sites.user_id + stripe_subscription_item_id to the new owner.
 *   4. REMOVE the old line item from the previous owner's subscription
 *      (pauses their sub if it was their last site).
 *   5. Migrate site-scoped add-ons (decrement old owner's per-type quantity,
 *      increment new owner's) — best-effort, per-add-on isolated.
 *   6. Audit everything.
 *
 * Proration: Stripe `create_prorations` throughout (old owner credited,
 * new owner charged for the remainder of the cycle).
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
import {
  findHostingSubscription,
  addSiteLineItem,
  removeSiteLineItem,
  resumeSubscription,
} from '@/lib/stripe-subscription';
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
    .select('id, user_id, label, product_id, stripe_subscription_item_id')
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

  // ── Cap check on the new owner's plan ──
  const { data: bSites } = await sb
    .from('sites')
    .select('id, product_id')
    .eq('user_id', newUserId)
    .not('status', 'in', '("cancelled","deleted","flagged_for_deletion")');
  const bSitesUsed = bSites?.length ?? 0;
  if (bSitesUsed > 0) {
    const { data: bPlan } = await sb
      .from('products')
      .select('name, metadata')
      .eq('id', bSites![0].product_id)
      .maybeSingle();
    const sitesAllowed = Number((bPlan?.metadata as any)?.sites_allowed ?? 1);
    if (bSitesUsed >= sitesAllowed) {
      return NextResponse.json(
        { error: `New owner's ${bPlan?.name ?? 'current'} plan allows ${sitesAllowed} site(s); they already have ${bSitesUsed}. They must upgrade first.` },
        { status: 409 },
      );
    }
  }

  // ── Resolve the price + billing interval to move ──
  const oldItemId = site.stripe_subscription_item_id as string | null;
  let priceId: string | null = null;
  let interval: 'month' | 'year' = 'month';
  let oldSubId: string | null = null;

  if (oldItemId) {
    try {
      const oldItem = await stripe.subscriptionItems.retrieve(oldItemId);
      priceId = oldItem.price?.id ?? null;
      interval = (oldItem.price?.recurring?.interval as any) === 'year' ? 'year' : 'month';
      oldSubId = typeof oldItem.subscription === 'string' ? oldItem.subscription : null;
    } catch {
      // Stale/missing item (e.g. already orphaned) — fall back to the plan price.
    }
  }
  if (!priceId) {
    const { data: planProduct } = await sb
      .from('products')
      .select('stripe_price_id, stripe_price_id_yearly')
      .eq('id', site.product_id)
      .maybeSingle();
    priceId = (planProduct?.stripe_price_id ?? planProduct?.stripe_price_id_yearly) as string | null;
  }
  if (!priceId) {
    return NextResponse.json({ error: 'Could not resolve a Stripe price for this site (plan not synced?).' }, { status: 400 });
  }

  // ── 1) ADD to the new owner first (no billing gap) ──
  let newItemId: string;
  try {
    const bSub = await findHostingSubscription(sb, newUserId);
    if (bSub?.stripe_subscription_id) {
      if (bSub.status === 'paused') await resumeSubscription(stripe, bSub.stripe_subscription_id);
      const item = await addSiteLineItem(stripe, bSub.stripe_subscription_id, priceId, siteId);
      newItemId = item.id;
    } else {
      const created = await stripe.subscriptions.create({
        customer: newOwner.stripe_customer_id,
        items: [{ price: priceId }],
        payment_settings: { save_default_payment_method: 'on_subscription' },
        metadata: { supabase_user_id: newUserId, subscription_type: 'hosting' },
      });
      newItemId = created.items.data[0].id;
      await stripe.subscriptionItems.update(newItemId, { metadata: { envosta_site_id: siteId } });
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: `Failed to add the site to the new owner's subscription — transfer aborted, nothing changed: ${e?.message ?? e}` },
      { status: 502 },
    );
  }

  // ── 2) Flip ownership on the site row ──
  await sb.from('sites').update({
    user_id: newUserId,
    stripe_subscription_item_id: newItemId,
    updated_at: new Date().toISOString(),
  }).eq('id', siteId);

  // ── 3) Remove the old line item from the previous owner ──
  let oldOwnerPaused = false;
  let oldRemovalError: string | null = null;
  if (oldItemId && oldSubId) {
    try {
      const res = await removeSiteLineItem(stripe, oldSubId, oldItemId);
      oldOwnerPaused = res.subscriptionPaused;
    } catch (e: any) {
      // Site is already on the new owner; the old item lingering is a billing
      // cleanup, not a blocker. Surface it loudly for manual follow-up.
      oldRemovalError = e?.message ?? String(e);
    }
  }

  // ── 4) Migrate site-scoped add-ons (best-effort, per add-on isolated) ──
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
      const oldAddonItemId = (row as any).stripe_subscription_item_id as string | null;
      const addonPriceId = pickAddonPrice(addon, interval);
      if (!addonPriceId) throw new Error('add-on has no synced Stripe price');

      // Decrement / delete on the OLD owner.
      if (oldAddonItemId) {
        const { count } = await sb
          .from('site_addons')
          .select('id', { count: 'exact', head: true })
          .eq('stripe_subscription_item_id', oldAddonItemId)
          .eq('status', 'active')
          .neq('id', (row as any).id);
        if ((count ?? 0) > 0) {
          const it = await stripe.subscriptionItems.retrieve(oldAddonItemId);
          await stripe.subscriptionItems.update(oldAddonItemId, { quantity: Math.max(1, (it.quantity ?? 1) - 1) });
        } else {
          await stripe.subscriptionItems.del(oldAddonItemId);
        }
      }

      // Increment / create on the NEW owner.
      const bSub = await findHostingSubscription(sb, newUserId);
      if (!bSub?.stripe_subscription_id) throw new Error('new owner has no subscription for the add-on');
      const liveB = await stripe.subscriptions.retrieve(bSub.stripe_subscription_id);
      const existing = (liveB.items?.data ?? []).find(i => i.price?.id === addonPriceId);
      let newAddonItemId: string;
      if (existing) {
        const upd = await stripe.subscriptionItems.update(existing.id, { quantity: (existing.quantity ?? 0) + 1 });
        newAddonItemId = upd.id;
      } else {
        const crt = await stripe.subscriptionItems.create({
          subscription: bSub.stripe_subscription_id,
          price: addonPriceId,
          quantity: 1,
          metadata: { envosta_addon_slug: slug, envosta_user_id: newUserId },
        });
        newAddonItemId = crt.id;
      }

      await sb.from('site_addons').update({
        stripe_subscription_item_id: newAddonItemId,
        updated_at: new Date().toISOString(),
      }).eq('id', (row as any).id);

      addonResults.push({ slug, moved: true });
    } catch (e: any) {
      addonResults.push({ slug, moved: false, error: e?.message ?? String(e) });
    }
  }

  // ── 5) Audit ──
  await recordAudit({
    actorId: user.id,
    actorType: 'admin',
    action: 'admin.site_transferred',
    resourceType: 'site',
    resourceId: siteId,
    before: { user_id: oldUserId, stripe_subscription_item_id: oldItemId },
    after: { user_id: newUserId, stripe_subscription_item_id: newItemId },
    metadata: {
      level: oldRemovalError || addonResults.some(a => !a.moved) ? 'warn' : 'info',
      details: `Site "${site.label}" transferred${oldUserId ? ` from ${oldUserId}` : ''} to ${newOwner.email}. Billing moved (proration applied).`,
      old_owner: oldUserId,
      new_owner: newUserId,
      old_owner_subscription_paused: oldOwnerPaused,
      old_removal_error: oldRemovalError,
      addons: addonResults,
    },
  });

  return NextResponse.json({
    ok: true,
    siteId,
    newOwner: { id: newOwner.id, email: newOwner.email },
    oldOwnerSubscriptionPaused: oldOwnerPaused,
    oldRemovalError,
    addons: addonResults,
    warning: oldRemovalError
      ? 'Site moved + new owner billed, but the OLD line item could not be removed — remove it manually in Stripe to stop double-billing the previous owner.'
      : undefined,
  });
}
