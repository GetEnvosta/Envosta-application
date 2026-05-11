import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/provision-site
 *
 * Admin-triggered wp.cloud provisioning. Three paths:
 *
 *   1. NEW SITE — no row exists for the subscription. Create a sites
 *      row with status='provisioning' and fire the wp.cloud
 *      provision-hosting edge function.
 *
 *   2. RE-PROVISION — sites row exists but wp_cloud_site_id is null
 *      (initial provisioning failed) OR status='provisioning' (stuck).
 *      Updates the existing row to status='provisioning' and re-fires
 *      provision-hosting. Used by the retry-stuck-provisions cron and
 *      by the admin "Retry" button.
 *
 *   3. BLOCK DUPLICATE — sites row exists, has wp_cloud_site_id, AND
 *      status is anything other than 'provisioning'. Returns 409 to
 *      prevent admins from accidentally clobbering a working site.
 *
 * State invariants:
 *   - sites.wp_cloud_site_id != null  →  the site exists on wp.cloud
 *   - sites.status='provisioning'     →  call to wp.cloud is in flight
 *                                        OR was lost; retry is safe
 *   - sites.status='active'           →  fully live; do not re-fire
 *
 * Subscription must be active or trialing — we don't provision against
 * cancelled / paused / unpaid subs.
 */
export async function POST(req: Request) {
  // Verify admin
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    { auth: { persistSession: false } },
  );

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!['admin', 'staff'].includes(profile?.role)) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  const { subscriptionId, userId, planId, label } = await req.json();
  if (!subscriptionId || !userId) return NextResponse.json({ error: 'subscriptionId and userId required' }, { status: 400 });

  // Check subscription exists and is active
  const { data: sub } = await supabase.from('subscriptions').select('*').eq('id', subscriptionId).single();
  if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  if (!['active', 'trialing'].includes(sub.status)) {
    return NextResponse.json({ error: `Subscription is ${sub.status}, must be active or trialing` }, { status: 400 });
  }

  // Check if site already exists for this subscription
  const { data: existing } = await supabase.from('sites').select('id, wp_cloud_site_id, status').eq('subscription_id', subscriptionId).maybeSingle();
  if (existing) {
    // If the site already has a wp.cloud ID and is active, block
    if (existing.wp_cloud_site_id && existing.status !== 'provisioning') {
      return NextResponse.json({ error: 'Site already exists for this subscription', siteId: existing.id }, { status: 409 });
    }
    // If the site exists but has no wp.cloud ID (reinstalled/failed), re-provision it
    if (!existing.wp_cloud_site_id || existing.status === 'provisioning') {
      const effectivePlanId = planId || sub.product_id;
      await supabase.from('sites').update({ status: 'provisioning', product_id: effectivePlanId }).eq('id', existing.id);
      try {
        const provRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/provision-hosting`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            serviceId: existing.id,
            label: label || 'reprovisioned-site',
            region: 'dca',
            phpVersion: '8.4',
            planId: effectivePlanId,
            userId,
          }),
        });
        const provData = await provRes.json();
        if (provRes.ok) {
          return NextResponse.json({ success: true, siteId: existing.id, provisioning: provData });
        } else {
          return NextResponse.json({ success: true, siteId: existing.id, warning: 'Re-provision failed — retry from admin', provisionError: provData.error });
        }
      } catch (e: any) {
        return NextResponse.json({ success: true, siteId: existing.id, warning: 'Re-provision failed', provisionError: e.message });
      }
    }
  }

  // Get user info for label
  const { data: userProfile } = await supabase.from('users').select('full_name, email').eq('id', userId).single();
  const name = label || userProfile?.full_name?.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30) || 'my-site';

  // Create site record
  const effectivePlanId = planId || sub.product_id;
  const { data: site, error: siteErr } = await supabase.from('sites').insert({
    user_id: userId,
    subscription_id: subscriptionId,
    product_id: effectivePlanId,
    label: `${name}-site`,
    status: 'provisioning',
    server_region: 'dca',
    metadata: { manual_provision: true, provisioned_by: user.id },
  }).select('id').single();

  if (siteErr) return NextResponse.json({ error: siteErr.message }, { status: 500 });

  // Trigger wp.cloud provisioning via Edge Function
  try {
    const provRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/provision-hosting`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        serviceId: site.id,
        label: `${name}-site`,
        region: 'dca',
        phpVersion: '8.4',
        planId: effectivePlanId,
        userId,
      }),
    });
    const provData = await provRes.json();

    if (provRes.ok) {
      return NextResponse.json({ success: true, siteId: site.id, provisioning: provData });
    } else {
      return NextResponse.json({
        success: true,
        siteId: site.id,
        warning: 'Site created but provisioning failed — can retry from admin',
        provisionError: provData.error,
      });
    }
  } catch (e: any) {
    return NextResponse.json({
      success: true,
      siteId: site.id,
      warning: 'Site created but provisioning failed — can retry from admin',
      provisionError: e.message,
    });
  }
}
