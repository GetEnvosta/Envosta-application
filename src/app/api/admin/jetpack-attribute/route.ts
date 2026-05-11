import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

const JETPACK_PARTNER_ID = process.env.JETPACK_PARTNER_ID ?? '';
const JETPACK_PARTNER_SECRET = process.env.JETPACK_PARTNER_SECRET ?? '';
const JETPACK_DEFAULT_PLAN = process.env.JETPACK_DEFAULT_PLAN ?? 'free';

const WPCOM_OAUTH_URL = 'https://public-api.wordpress.com/oauth2/token';
const WPCOM_PROVISION_URL = 'https://public-api.wordpress.com/rest/v1.3/jpphp/provision';

async function getPartnerToken(): Promise<string | null> {
  if (!JETPACK_PARTNER_ID || !JETPACK_PARTNER_SECRET) return null;
  const form = new FormData();
  form.append('client_id', JETPACK_PARTNER_ID);
  form.append('client_secret', JETPACK_PARTNER_SECRET);
  form.append('grant_type', 'client_credentials');
  form.append('scope', 'jetpack-partner');
  const res = await fetch(WPCOM_OAUTH_URL, { method: 'POST', headers: { 'cache-control': 'no-cache' }, body: form });
  if (!res.ok) return null;
  const json = await res.json();
  return json.access_token ?? null;
}

async function provisionOne(token: string, siteUrl: string, localUser: string, plan: string) {
  const form = new FormData();
  form.append('siteurl', siteUrl);
  form.append('local_user', localUser);
  form.append('plan', plan);
  form.append('force_register', '1');
  const res = await fetch(WPCOM_PROVISION_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'cache-control': 'no-cache' },
    body: form,
  });
  const text = await res.text();
  let parsed: any = null;
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  return { ok: res.ok && parsed?.success !== false, status: res.status, body: parsed };
}

export async function POST(req: Request) {
  const jar = await cookies();
  const authed = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    { cookies: { getAll: () => jar.getAll(), setAll() {} } },
  );
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    { auth: { persistSession: false } },
  );
  const { data: profile } = await sb.from('users').select('role').eq('id', user.id).single();
  if (!['admin', 'staff'].includes(profile?.role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  if (!JETPACK_PARTNER_ID || !JETPACK_PARTNER_SECRET) {
    return NextResponse.json({ error: 'JETPACK_PARTNER_ID and JETPACK_PARTNER_SECRET env vars are not set' }, { status: 500 });
  }

  const { siteId, all, plan } = await req.json().catch(() => ({}));
  const planSlug = plan ?? JETPACK_DEFAULT_PLAN;

  const token = await getPartnerToken();
  if (!token) return NextResponse.json({ error: 'Failed to obtain Jetpack partner token — check credentials' }, { status: 502 });

  // Select target sites
  let q = sb.from('sites').select('id, wp_cloud_url, wp_cloud_site_id, metadata').eq('status', 'active').not('wp_cloud_url', 'is', null);
  if (!all) {
    if (!siteId) return NextResponse.json({ error: 'siteId required (or pass { all: true })' }, { status: 400 });
    q = q.eq('id', siteId);
  }
  const { data: sites, error: sitesErr } = await q;
  if (sitesErr) return NextResponse.json({ error: sitesErr.message }, { status: 500 });
  if (!sites?.length) return NextResponse.json({ error: 'No matching sites' }, { status: 404 });

  const results: any[] = [];
  for (const site of sites) {
    const wpUrl = site.wp_cloud_url;
    const localUser = (site.metadata as any)?.wp_admin_user ?? 'envosta_admin';
    if (!wpUrl) { results.push({ siteId: site.id, skipped: 'no wp_cloud_url' }); continue; }

    const r = await provisionOne(token, wpUrl, localUser, planSlug);
    const attribution = {
      ok: r.ok,
      status: r.status,
      success: r.body?.success,
      error_code: r.body?.error_code,
      error_message: r.body?.error_message,
      attributed_at: new Date().toISOString(),
    };
    await sb.from('sites').update({
      metadata: { ...(site.metadata as any ?? {}), jetpack_attribution: attribution },
    }).eq('id', site.id);
    await sb.from('logs').insert({
      user_id: user.id,
      site_id: site.id,
      level: r.ok ? 'info' : 'warn',
      action: r.ok ? 'jetpack.partner.attributed' : 'jetpack.partner.failed',
      message: r.body?.error_message ?? `${wpUrl} → partner`,
      response_payload: r.body,
    });
    results.push({ siteId: site.id, url: wpUrl, ...attribution });
  }

  return NextResponse.json({ count: results.length, results });
}
