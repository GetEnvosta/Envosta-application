import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

/**
 * User-facing endpoint: create an additional WordPress site on a temporary
 * domain. No checkout — the site is included in the user's existing plan.
 *
 * Plan caps (hard limit on active sites per plan):
 *   - minimum: 2 sites
 *   - growth:  10 sites
 */
const PLAN_SITE_CAPS: Record<string, number> = {
  minimum: 2,
  growth: 10,
};

export async function POST(req: Request) {
  // Verify logged-in user
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { label, region } = await req.json();
  if (!label || typeof label !== 'string') {
    return NextResponse.json({ error: 'Site name is required' }, { status: 400 });
  }

  // Look up user's active hosting plan subscription
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, status, products(slug, type)')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false });

  const hostingSub = (sub ?? []).find((s: any) => s.products?.type === 'hosting_plan');
  if (!hostingSub) {
    return NextResponse.json({
      error: 'No active hosting plan. Please subscribe to a plan first.',
    }, { status: 403 });
  }

  const planSlug = (hostingSub as any).products?.slug as string | undefined;
  const cap: number = (planSlug && PLAN_SITE_CAPS[planSlug]) || 2;

  // Count user's current active sites
  const { count: currentSites } = await supabase
    .from('sites')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .not('status', 'in', '("cancelled","deleted")');

  if ((currentSites ?? 0) >= cap) {
    const planName = planSlug
      ? planSlug.charAt(0).toUpperCase() + planSlug.slice(1)
      : 'your';
    return NextResponse.json({
      error: `Your ${planName} plan is limited to ${cap} site${cap === 1 ? '' : 's'}. Upgrade your plan to add more sites.`,
      limitReached: true,
      cap,
      currentCount: currentSites ?? 0,
    }, { status: 403 });
  }

  // Create the site record (status: provisioning)
  const siteLabel = label.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 40) || 'site';
  const { data: site, error: siteErr } = await supabase.from('sites').insert({
    user_id: user.id,
    subscription_id: hostingSub.id,
    label: siteLabel,
    status: 'provisioning',
    server_region: region || 'dca',
    php_version: '8.4',
    metadata: { self_service: true },
  }).select('id').single();

  if (siteErr) return NextResponse.json({ error: siteErr.message }, { status: 500 });

  // Trigger wp.cloud provisioning via the edge function
  try {
    const provRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/provision-hosting`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        serviceId: site.id,
        label: siteLabel,
        region: region || 'dca',
        phpVersion: '8.4',
        userId: user.id,
      }),
    });

    await supabase.from('logs').insert({
      user_id: user.id,
      site_id: site.id,
      action: 'site.self_created',
      details: `Customer created additional site "${siteLabel}"`,
      level: 'info',
      metadata: { plan: planSlug, provisioned: provRes.ok },
    });

    return NextResponse.json({
      success: true,
      siteId: site.id,
      warning: provRes.ok ? undefined : 'Site created but provisioning may need retry',
    });
  } catch (e: any) {
    return NextResponse.json({
      success: true,
      siteId: site.id,
      warning: 'Site created but provisioning failed — please contact support',
    });
  }
}
