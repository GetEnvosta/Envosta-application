import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getAccountSubscription } from '@/services/billing';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/provision-site
 *
 * Admin-triggered wp.cloud provisioning. Three paths:
 *
 *   1. NEW SITE — no row exists for the user. Create a sites row with
 *      status='provisioning' and fire the wp.cloud provision-hosting
 *      internal route.
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
 * Post Stripe-Sync-Engine cutover: there's no local public.subscriptions
 * to look up. The user's single subscription is fetched from stripe.*
 * via getAccountSubscription(userId) when subscription validation is
 * required for the "new site" path.
 */
export async function POST(req: Request) {
  // Verify admin
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!['admin', 'staff'].includes(profile?.role)) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  const reqBody = await req.json();
  const { userId, planId, label } = reqBody;
  const directSiteId: string | undefined = reqBody.siteId;

  const origin = process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
    : new URL(req.url).origin;
  const internalHeaders = {
    'Content-Type': 'application/json',
    'X-Internal-Token': process.env.INTERNAL_API_TOKEN ?? '',
  };

  // ── Direct-by-siteId path ───────────────────────────────────
  // Used by the admin "Provision" button (provision-button.tsx),
  // which knows the existing sites row and wants to re-fire wp.cloud
  // provisioning for it. This bypasses subscription/plan resolution
  // because the row already carries product_id + user_id + label.
  if (directSiteId) {
    const { data: targetSite } = await supabase
      .from('sites')
      .select('id, user_id, label, product_id, server_region, php_version, status, wp_cloud_site_id, metadata')
      .eq('id', directSiteId)
      .single();
    if (!targetSite) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

    // Reset provision-attempt counters so the auto-retry cron starts
    // fresh if this attempt also fails.
    const existingMeta = (targetSite.metadata as any) ?? {};
    await supabase
      .from('sites')
      .update({
        metadata: {
          ...existingMeta,
          provision_attempts: 0,
          provision_giving_up: false,
          provision_last_attempt_at: new Date().toISOString(),
          provision_manual_retry_at: new Date().toISOString(),
        },
        status: targetSite.wp_cloud_site_id ? targetSite.status : 'provisioning',
      })
      .eq('id', directSiteId);

    try {
      const provRes = await fetch(`${origin}/api/internal/wpcloud/provision-site`, {
        method: 'POST',
        headers: internalHeaders,
        body: JSON.stringify({
          siteId: targetSite.id,
          serviceId: targetSite.id,
          label: targetSite.label ?? 'site',
          region: targetSite.server_region ?? 'dca',
          phpVersion: (targetSite as any).php_version ?? '8.4',
          planId: targetSite.product_id,
          userId: targetSite.user_id,
        }),
      });
      const provData = await provRes.json();
      if (provRes.ok) return NextResponse.json({ success: true, siteId: targetSite.id, ...provData });
      return NextResponse.json({ error: provData.error ?? 'Provisioning failed' }, { status: provRes.status });
    } catch (e: any) {
      return NextResponse.json({ error: e.message ?? 'Provisioning request failed' }, { status: 500 });
    }
  }

  if (!userId) return NextResponse.json({ error: 'userId required (or pass siteId)' }, { status: 400 });

  // Validate the user has an active subscription before spinning up a site.
  const accountSub = await getAccountSubscription(userId);
  if (!accountSub) {
    return NextResponse.json({ error: 'User has no active subscription' }, { status: 400 });
  }
  if (!['active', 'trialing'].includes(accountSub.status)) {
    return NextResponse.json({ error: `Subscription is ${accountSub.status}, must be active or trialing` }, { status: 400 });
  }

  // Check if a site already exists for this user that's stuck/incomplete.
  const { data: existing } = await supabase
    .from('sites')
    .select('id, wp_cloud_site_id, status, product_id')
    .eq('user_id', userId)
    .in('status', ['provisioning', 'failed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    // If the site already has a wp.cloud ID and is active, block
    if (existing.wp_cloud_site_id && existing.status !== 'provisioning') {
      return NextResponse.json({ error: 'Site already exists for this user', siteId: existing.id }, { status: 409 });
    }
    // If the site exists but has no wp.cloud ID (reinstalled/failed), re-provision it
    if (!existing.wp_cloud_site_id || existing.status === 'provisioning') {
      const effectivePlanId = planId || existing.product_id;
      await supabase.from('sites').update({ status: 'provisioning', product_id: effectivePlanId }).eq('id', existing.id);
      try {
        const provRes = await fetch(`${origin}/api/internal/wpcloud/provision-site`, {
          method: 'POST',
          headers: internalHeaders,
          body: JSON.stringify({
            siteId: existing.id,
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

  // Create site record — no subscription_id (account-centric)
  const effectivePlanId = planId || null;
  const { data: site, error: siteErr } = await supabase.from('sites').insert({
    user_id: userId,
    product_id: effectivePlanId,
    label: `${name}-site`,
    status: 'provisioning',
    server_region: 'dca',
    metadata: { manual_provision: true, provisioned_by: user.id },
  }).select('id').single();

  if (siteErr) return NextResponse.json({ error: siteErr.message }, { status: 500 });

  // Trigger wp.cloud provisioning via Vercel internal route
  try {
    const provRes = await fetch(`${origin}/api/internal/wpcloud/provision-site`, {
      method: 'POST',
      headers: internalHeaders,
      body: JSON.stringify({
        siteId: site.id,
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
