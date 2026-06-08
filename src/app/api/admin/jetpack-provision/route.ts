/**
 * POST /api/admin/jetpack-provision — Admin: provision the site's plan
 * Jetpack tier on wp.cloud via the Jetpack Start partner API.
 *
 * Reads the site's plan metadata.jetpack_plan_slug and calls
 * jetpackPartnerProvision. Non-fatal: the result (ok/error) is stamped on
 * sites.metadata.jetpack_attribution and audited, and a failed slug is
 * surfaced so it can be corrected in the plan metadata.
 *
 * Body: { siteId }
 * Auth: admin only. Must run on a deploy with JETPACK_PARTNER_* env set.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { isAdminRole } from '@/lib/roles';
import { recordAudit } from '@/lib/audit';
import { jetpackPartnerProvision } from '@/lib/integrations/jetpack';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const jar = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => jar.getAll(), setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: profile } = await sb.from('users').select('role').eq('id', user.id).maybeSingle();
  if (!isAdminRole(profile?.role)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const siteId = typeof body?.siteId === 'string' ? body.siteId : '';
  if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

  const { data: site } = await sb
    .from('sites')
    .select('id, user_id, wp_cloud_url, product_id, metadata')
    .eq('id', siteId)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  if (!site.wp_cloud_url) {
    return NextResponse.json({ error: 'Site is not provisioned on wp.cloud yet (no URL)' }, { status: 400 });
  }

  const { data: plan } = await sb.from('products').select('slug, metadata').eq('id', site.product_id).maybeSingle();
  const planSlug = (plan?.metadata as any)?.jetpack_plan_slug as string | undefined;
  if (!planSlug) {
    return NextResponse.json(
      { error: `Plan "${plan?.slug ?? '?'}" has no jetpack_plan_slug configured. Set products.metadata.jetpack_plan_slug first.` },
      { status: 400 },
    );
  }

  // local_user: the WP admin user created at provision, else the owner email.
  let localUser = (site.metadata as any)?.wp_admin_user as string | undefined;
  if (!localUser && site.user_id) {
    const { data: u } = await sb.from('users').select('email').eq('id', site.user_id).maybeSingle();
    localUser = u?.email ?? undefined;
  }
  if (!localUser) {
    return NextResponse.json({ error: 'No local_user (wp_admin_user or owner email) available for the site' }, { status: 400 });
  }

  const result = await jetpackPartnerProvision({ siteUrl: site.wp_cloud_url, localUser, plan: planSlug });

  await sb.from('sites').update({
    metadata: {
      ...((site.metadata as any) ?? {}),
      jetpack_attribution: { plan: planSlug, ok: result.ok, error: result.error ?? null, at: new Date().toISOString() },
    },
  }).eq('id', site.id);

  await recordAudit({
    actorId: user.id,
    actorType: 'admin',
    action: result.ok ? 'jetpack.partner.provisioned' : 'jetpack.partner.failed',
    resourceType: 'site',
    resourceId: site.id,
    metadata: { plan: planSlug, ok: result.ok, error: result.error ?? null },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, plan: planSlug }, { status: 502 });
  }
  return NextResponse.json({ ok: true, plan: planSlug });
}
