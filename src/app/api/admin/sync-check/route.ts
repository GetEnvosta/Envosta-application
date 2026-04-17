import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return null;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  return profile?.role === 'admin' ? { supabase, userId: user.id } : null;
}

export async function POST() {
  const auth = await verifyAdmin();
  if (!auth) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { supabase: sb, userId } = auth;

  try {
    // 1. Fetch wp.cloud sites via site-info edge function (list-all-sites)
    let wpCloudSites: string[] = [];
    let wpCloudError = '';
    try {
      const wpRes = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/site-info`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({ action: 'list-all-sites' }),
        }
      );
      const wpData = await wpRes.json();
      if (Array.isArray(wpData)) {
        wpCloudSites = wpData.map((s: any) => String(s.blog_id ?? s.id ?? s));
      } else if (wpData?.error) {
        wpCloudError = wpData.error;
      }
    } catch (e: any) {
      wpCloudError = e.message;
    }

    // Get all DB sites with wp.cloud IDs
    const { data: dbSites } = await sb.from('sites')
      .select('id, wp_cloud_site_id, wp_cloud_url, label, status, user_id')
      .not('wp_cloud_site_id', 'is', null);

    const dbSiteIds = new Set((dbSites ?? []).map((s: any) => String(s.wp_cloud_site_id)));

    // Compare: in wp.cloud but not in DB
    const inApiNotDb = wpCloudSites.filter(id => !dbSiteIds.has(id));

    // Compare: in DB but not in wp.cloud (only if we got wp.cloud data)
    const wpCloudSet = new Set(wpCloudSites);
    const inDbNotApi = wpCloudSites.length > 0
      ? (dbSites ?? []).filter((s: any) => s.status === 'active' && !wpCloudSet.has(String(s.wp_cloud_site_id)))
      : [];

    // Check for sites in DB with no user or deleted user
    const sitesNoUser = (dbSites ?? []).filter((s: any) => !s.user_id);
    const userIds = [...new Set((dbSites ?? []).map((s: any) => s.user_id).filter(Boolean))];
    const { data: existingUsers } = userIds.length > 0
      ? await sb.from('users').select('id').in('id', userIds)
      : { data: [] };
    const validUserIds = new Set((existingUsers ?? []).map((u: any) => u.id));
    const sitesOrphanedUser = (dbSites ?? []).filter((s: any) => s.user_id && !validUserIds.has(s.user_id));

    // 2. Check domains
    const { data: dbDomains } = await sb.from('domains')
      .select('id, domain_name, user_id, status');

    const domainsNoUser = (dbDomains ?? []).filter((d: any) => !d.user_id);
    const domainUserIds = [...new Set((dbDomains ?? []).map((d: any) => d.user_id).filter(Boolean))];
    const { data: domainUsers } = domainUserIds.length > 0
      ? await sb.from('users').select('id').in('id', domainUserIds)
      : { data: [] };
    const validDomainUserIds = new Set((domainUsers ?? []).map((u: any) => u.id));
    const domainsOrphanedUser = (dbDomains ?? []).filter((d: any) => d.user_id && !validDomainUserIds.has(d.user_id));

    const matched = (dbSites ?? []).length - inDbNotApi.length - sitesOrphanedUser.length - sitesNoUser.length;

    return NextResponse.json({
      checkedAt: new Date().toISOString(),
      wpcloud: {
        apiCount: wpCloudSites.length,
        dbCount: (dbSites ?? []).length,
        matched: Math.max(0, matched),
        inApiNotDb,
        inDbNotApi: [
          ...inDbNotApi.map((s: any) => `${s.label} (${s.wp_cloud_site_id}) — not in wp.cloud`),
          ...sitesOrphanedUser.map((s: any) => `${s.label} (${s.wp_cloud_site_id}) — user deleted`),
        ],
        sitesNoUser: sitesNoUser.map((s: any) => `${s.label} (${s.wp_cloud_site_id})`),
        error: wpCloudError || undefined,
      },
      domains: {
        total: (dbDomains ?? []).length,
        noUser: domainsNoUser.map((d: any) => d.domain_name),
        orphanedUser: domainsOrphanedUser.map((d: any) => `${d.domain_name} — user deleted`),
      },
    });
  } catch (e: any) {
    console.error('Sync check error:', e);
    return NextResponse.json({ error: e.message ?? 'Check failed' }, { status: 500 });
  }
}
