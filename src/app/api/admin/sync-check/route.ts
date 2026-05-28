import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return null;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  return profile?.role === 'admin' ? { supabase, userId: user.id } : null;
}

export async function POST(req: Request) {
  const auth = await verifyAdmin();
  if (!auth) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { supabase: sb, userId } = auth;

  const origin = process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
    : new URL(req.url).origin;
  const internalHeaders = {
    'Content-Type': 'application/json',
    'X-Internal-Token': process.env.INTERNAL_API_TOKEN ?? '',
  };

  try {
    // 1. Fetch wp.cloud sites via Vercel internal route (list-all-sites)
    let wpCloudRaw: any[] = [];
    let wpCloudError = '';
    try {
      const wpRes = await fetch(`${origin}/api/internal/wpcloud/site-info`, {
        method: 'POST',
        headers: internalHeaders,
        body: JSON.stringify({ action: 'list-all-sites' }),
      });
      const wpData = await wpRes.json();
      if (Array.isArray(wpData)) {
        wpCloudRaw = wpData;
      } else if (wpData?.error) {
        wpCloudError = wpData.error;
      }
    } catch (e: any) {
      wpCloudError = e.message;
    }

    // Build a set of ALL possible identifiers from each wp.cloud site
    // wp.cloud may return blog_id, id, atomic_site_id, wpcom_blog_id, domain_name, etc.
    const wpCloudAllIds = new Set<string>();
    const wpCloudDomains = new Set<string>();
    for (const s of wpCloudRaw) {
      if (typeof s === 'object' && s !== null) {
        for (const key of ['blog_id', 'id', 'atomic_site_id', 'wpcom_blog_id']) {
          if (s[key]) wpCloudAllIds.add(String(s[key]));
        }
        if (s.domain_name) wpCloudDomains.add(s.domain_name.toLowerCase());
      } else {
        wpCloudAllIds.add(String(s));
      }
    }

    // Get all DB sites with wp.cloud IDs
    const { data: dbSites } = await sb.from('sites')
      .select('id, wp_cloud_site_id, wp_cloud_url, label, status, user_id')
      .not('wp_cloud_site_id', 'is', null);

    // Match DB sites against wp.cloud by ID or domain
    const matchedDbIds = new Set<string>();
    const matchedWpIds = new Set<string>();
    for (const dbSite of dbSites ?? []) {
      const siteId = String(dbSite.wp_cloud_site_id);
      const domain = dbSite.wp_cloud_url?.replace('https://', '').replace('http://', '').toLowerCase();
      if (wpCloudAllIds.has(siteId) || (domain && wpCloudDomains.has(domain))) {
        matchedDbIds.add(dbSite.id);
        matchedWpIds.add(siteId);
        if (domain) matchedWpIds.add(domain);
      }
    }

    // In wp.cloud but not matched to any DB site
    const inApiNotDb: string[] = [];
    for (const s of wpCloudRaw) {
      if (typeof s === 'object' && s !== null) {
        const ids = ['blog_id', 'id', 'atomic_site_id', 'wpcom_blog_id'].map(k => s[k] ? String(s[k]) : null).filter(Boolean);
        const dom = s.domain_name?.toLowerCase();
        const isMatched = ids.some(id => matchedWpIds.has(id!)) || (dom && matchedWpIds.has(dom));
        if (!isMatched) inApiNotDb.push(s.domain_name || ids[0] || 'unknown');
      }
    }

    // In DB but not matched to any wp.cloud site (only if we got wp.cloud data)
    const inDbNotApi = wpCloudRaw.length > 0
      ? (dbSites ?? []).filter((s: any) => s.status === 'active' && !matchedDbIds.has(s.id))
      : [];

    // Check for sites in DB with no user or deleted user
    const sitesNoUser = (dbSites ?? []).filter((s: any) => !s.user_id);
    const userIds = [...new Set((dbSites ?? []).map((s: any) => s.user_id).filter(Boolean))];
    const { data: existingUsers } = userIds.length > 0
      ? await sb.from('users').select('id').in('id', userIds)
      : { data: [] };
    const validUserIds = new Set((existingUsers ?? []).map((u: any) => u.id));
    const sitesOrphanedUser = (dbSites ?? []).filter((s: any) => s.user_id && !validUserIds.has(s.user_id));

    // 2. Check domains — compare DB vs OpenSRS
    const { data: dbDomains } = await sb.from('domains')
      .select('id, domain_name, user_id, status');

    const domainsNoUser = (dbDomains ?? []).filter((d: any) => !d.user_id);
    const domainUserIds = [...new Set((dbDomains ?? []).map((d: any) => d.user_id).filter(Boolean))];
    const { data: domainUsers } = domainUserIds.length > 0
      ? await sb.from('users').select('id').in('id', domainUserIds)
      : { data: [] };
    const validDomainUserIds = new Set((domainUsers ?? []).map((u: any) => u.id));
    const domainsOrphanedUser = (dbDomains ?? []).filter((d: any) => d.user_id && !validDomainUserIds.has(d.user_id));

    // OpenSRS bulk list — not yet ported to the Vercel internal client.
    // The legacy edge function used GET_DOMAINS_BY_EXPIREDATE; that
    // capability needs to be re-added to src/lib/integrations/opensrs.ts.
    // For now we skip the OpenSRS comparison and rely on the DB-side
    // checks below.
    const opensrsDomains: string[] = [];
    const opensrsError = 'OpenSRS bulk listing not yet ported';

    // Compare DB domains vs OpenSRS domains
    const dbDomainNames = new Set((dbDomains ?? []).map((d: any) => d.domain_name?.toLowerCase()).filter(Boolean));
    const opensrsDomainSet = new Set(opensrsDomains.map(d => d.toLowerCase()));

    // Matched: in both DB and OpenSRS
    const domainMatched = new Set<string>();
    for (const d of dbDomainNames) {
      if (opensrsDomainSet.has(d)) domainMatched.add(d);
    }

    // In OpenSRS but not in DB
    const inOpenSrsNotDb = opensrsDomains.filter(d => !dbDomainNames.has(d.toLowerCase()));
    // In DB but not in OpenSRS (only check active/registered domains, skip pending/failed)
    const activeDomains = (dbDomains ?? []).filter((d: any) => ['active', 'registered'].includes(d.status));
    const inDbNotOpenSrs = opensrsDomains.length > 0
      ? activeDomains.filter((d: any) => !opensrsDomainSet.has(d.domain_name?.toLowerCase()))
      : [];

    const matched = matchedDbIds.size;

    return NextResponse.json({
      checkedAt: new Date().toISOString(),
      wpcloud: {
        apiCount: wpCloudRaw.length,
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
        opensrsCount: opensrsDomains.length,
        matched: domainMatched.size,
        inOpenSrsNotDb: inOpenSrsNotDb,
        inDbNotOpenSrs: inDbNotOpenSrs.map((d: any) => d.domain_name),
        noUser: domainsNoUser.map((d: any) => d.domain_name),
        orphanedUser: domainsOrphanedUser.map((d: any) => `${d.domain_name} — user deleted`),
        error: opensrsError || undefined,
      },
    });
  } catch (e: any) {
    console.error('Sync check error:', e);
    return NextResponse.json({ error: e.message ?? 'Check failed' }, { status: 500 });
  }
}
