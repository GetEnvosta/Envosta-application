import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { isStaffRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * Re-run the software bootstrap (parent theme + Akismet install/unlock, and
 * removal of the pre-installed Jetpack plugin) on one or all existing sites.
 * Useful for backfilling sites provisioned before these steps were wired into
 * provision-hosting.
 *
 * POST /api/admin/site-bootstrap  { siteId }  or  { all: true }
 */
export async function POST(req: Request) {
  const jar = await cookies();
  const authed = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => jar.getAll(), setAll() {} } },
  );
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: profile } = await sb.from('users').select('role').eq('id', user.id).single();
  if (!isStaffRole(profile?.role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { siteId, all } = await req.json().catch(() => ({}));

  let q = sb.from('sites').select('id, wp_cloud_url').eq('status', 'active').not('wp_cloud_site_id', 'is', null);
  if (!all) {
    if (!siteId) return NextResponse.json({ error: 'siteId required (or pass { all: true })' }, { status: 400 });
    q = q.eq('id', siteId);
  }
  const { data: sites, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!sites?.length) return NextResponse.json({ error: 'No matching sites' }, { status: 404 });

  const origin = process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
    : new URL(req.url).origin;

  const results: any[] = [];
  for (const site of sites) {
    try {
      const res = await fetch(`${origin}/api/internal/wpcloud/site-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': process.env.INTERNAL_API_TOKEN ?? '',
        },
        body: JSON.stringify({ action: 'software-bootstrap', siteId: site.id, actorId: user.id }),
      });
      const body = await res.json();
      results.push({ siteId: site.id, url: site.wp_cloud_url, ok: res.ok, ...body });
    } catch (e: any) {
      results.push({ siteId: site.id, url: site.wp_cloud_url, ok: false, error: e.message });
    }
  }

  return NextResponse.json({ count: results.length, results });
}
