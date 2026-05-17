/**
 * POST /api/account/addons/remove
 *
 * Detach a plan add-on from the caller's hosting subscription by
 * deleting the Stripe SubscriptionItem. Stripe prorates automatically.
 *
 * Body: { subscriptionItemId: string }
 * Auth: regular user session (auth.uid()).
 *
 * Ownership check: the SubscriptionItem must belong to a subscription
 * whose customer matches the caller's stripe_customer_id — prevents
 * one user from removing items off another user's sub.
 */
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
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
  const subscriptionItemId = typeof body.subscriptionItemId === 'string' ? body.subscriptionItemId : '';
  if (!subscriptionItemId) {
    return NextResponse.json({ ok: false, error: 'subscriptionItemId is required' }, { status: 400 });
  }

  const sbService = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  // Caller's Stripe customer ID — required for ownership check.
  const { data: profile } = await sbService
    .from('users').select('stripe_customer_id').eq('id', user.id).maybeSingle();
  const callerCustomerId = profile?.stripe_customer_id;
  if (!callerCustomerId) {
    return NextResponse.json({ ok: false, error: 'No Stripe customer on file.' }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });

  // ── Ownership verification ──────────────────────────
  let item: Stripe.SubscriptionItem;
  try {
    item = await stripe.subscriptionItems.retrieve(subscriptionItemId);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Subscription item not found' }, { status: 404 });
  }

  let parentSub: Stripe.Subscription;
  try {
    parentSub = await stripe.subscriptions.retrieve(item.subscription as string);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Parent subscription not found' }, { status: 404 });
  }

  const subCustomerId = typeof parentSub.customer === 'string' ? parentSub.customer : parentSub.customer.id;
  if (subCustomerId !== callerCustomerId) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  // Disallow removing the LAST item — Stripe rejects this anyway, but
  // surface a cleaner error message before the API call.
  if ((parentSub.items?.data ?? []).length <= 1) {
    return NextResponse.json(
      { ok: false, error: 'Cannot remove the last item from a subscription.' },
      { status: 400 },
    );
  }

  // ── Delete with proration ───────────────────────────
  try {
    await stripe.subscriptionItems.del(subscriptionItemId);

    await recordAudit({
      actorId: user.id,
      actorType: 'user',
      action: 'subscription.addon.removed',
      resourceType: 'subscription',
      resourceId: parentSub.id,
      metadata: {
        stripe_subscription_id: parentSub.id,
        stripe_subscription_item_id: subscriptionItemId,
        addon_slug: (item.metadata as any)?.envosta_addon_slug ?? null,
        price_id: item.price?.id ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Failed to remove addon' }, { status: 500 });
  }
}
