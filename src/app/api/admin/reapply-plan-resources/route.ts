/**
 * POST /api/admin/reapply-plan-resources
 *
 * Re-applies a site's CURRENT plan resources (PHP workers, memory, storage,
 * bursting) to wp.cloud + the local DB. Use after changing a plan's metadata
 * so existing sites pick up the new ceilings — plan-metadata edits don't
 * retro-apply on their own (they only take effect on provision / upgrade).
 *
 * Body: { siteId?: string }  — one site, or omit for ALL active sites that
 *                              have a wp_cloud_site_id.
 * Auth: admin only.
 *
 * Bursting: only enabled when the plan's bursting_enabled === true (it's the
 * paid wp.cloud option). All current plans have it off, so burst stays 0.
 *
 * Must run on Vercel — the wp.cloud push goes through the internal route,
 * which calls wp.cloud from a whitelisted static IP.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { isAdminRole } from '@/lib/roles';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

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
  const siteId = typeof body?.siteId === 'string' ? body.siteId : null;

  // Target site(s): one, or all active sites that exist on wp.cloud.
  let query = sb
    .from('sites')
    .select('id, label, product_id, wp_cloud_site_id, config')
    .not('wp_cloud_site_id', 'is', null);
  query = siteId ? query.eq('id', siteId) : query.eq('status', 'active');
  const { data: sites, error: sitesErr } = await query;
  if (sitesErr) return NextResponse.json({ error: sitesErr.message }, { status: 500 });
  if (!sites || sites.length === 0) {
    return NextResponse.json({ error: 'No matching provisioned site(s) found.' }, { status: 404 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
    : new URL(req.url).origin;
  const headers = {
    'Content-Type': 'application/json',
    'X-Internal-Token': process.env.INTERNAL_API_TOKEN ?? '',
  };

  const results: any[] = [];
  for (const site of sites) {
    if (!site.product_id) {
      results.push({ siteId: site.id, label: site.label, ok: false, error: 'site has no plan' });
      continue;
    }
    const { data: plan } = await sb.from('products').select('slug, metadata').eq('id', site.product_id).maybeSingle();
    const meta = (plan?.metadata as Record<string, any> | null) ?? {};
    const workers = Number(meta.php_workers_default ?? 2);
    const memory = Number(meta.php_memory_mb ?? 512);
    const storage = Number(meta.storage_gb ?? 25);
    const bursting = meta.bursting_enabled === true; // paid option — off unless the plan says so

    // 1. Mirror to our DB.
    await sb.from('sites').update({
      config: { ...((site.config as any) ?? {}), php_workers: workers, php_memory_mb: memory, storage_gb: storage },
      max_php_workers: workers,
      max_ssd_gb: storage,
      bursting_enabled: bursting,
      updated_at: new Date().toISOString(),
    }).eq('id', site.id);

    // 2. Push to wp.cloud (via the internal route → static IP).
    const updates: Array<{ key: string; value: string | number }> = [
      { key: 'default_php_conns', value: workers },
      { key: 'php_memory_limit', value: memory },
      { key: 'burst_php_conns', value: bursting ? workers * 2 : 0 },
      { key: 'space_quota', value: `${storage}G` },
    ];
    let pushed = 0;
    const failed: string[] = [];
    for (const u of updates) {
      try {
        const r = await fetch(`${origin}/api/internal/wpcloud/site-info`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'update-site-meta', siteId: site.id, key: u.key, value: u.value }),
        });
        if (r.ok) pushed++; else failed.push(u.key);
      } catch {
        failed.push(u.key);
      }
    }

    results.push({ siteId: site.id, label: site.label, plan: plan?.slug, ok: failed.length === 0, workers, memory, storage, bursting, pushed, failed });
  }

  await recordAudit({
    actorId: user.id,
    actorType: 'admin',
    action: 'admin.reapply_plan_resources',
    resourceType: 'site',
    resourceId: siteId ?? undefined,
    metadata: { scope: siteId ? 'single' : 'all_active', count: results.length, results },
  });

  return NextResponse.json({ ok: true, results });
}
