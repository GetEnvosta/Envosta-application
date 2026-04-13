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
    // 1. Fetch wp.cloud sites via site-info edge function
    const wpRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/site-info`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ action: 'datacenters' }),
      }
    );

    // Get all DB sites with wp.cloud IDs
    const { data: dbSites } = await sb.from('sites')
      .select('id, wp_cloud_site_id, wp_cloud_url, label, status, user_id')
      .not('wp_cloud_site_id', 'is', null);

    const dbSiteIds = new Set((dbSites ?? []).map((s: any) => s.wp_cloud_site_id));

    // Check for sites in DB with no user
    const sitesNoUser = (dbSites ?? []).filter((s: any) => !s.user_id);

    // Check for sites marked active but user doesn't exist
    const userIds = [...new Set((dbSites ?? []).map((s: any) => s.user_id).filter(Boolean))];
    const { data: existingUsers } = userIds.length > 0
      ? await sb.from('users').select('id').in('id', userIds)
      : { data: [] };
    const validUserIds = new Set((existingUsers ?? []).map((u: any) => u.id));
    const sitesOrphanedUser = (dbSites ?? []).filter((s: any) => s.user_id && !validUserIds.has(s.user_id));

    // 2. Check domains — find any without a user
    const { data: dbDomains } = await sb.from('domains')
      .select('id, domain_name, user_id, status');

    const domainsNoUser = (dbDomains ?? []).filter((d: any) => !d.user_id);

    // Check domain users exist
    const domainUserIds = [...new Set((dbDomains ?? []).map((d: any) => d.user_id).filter(Boolean))];
    const { data: domainUsers } = domainUserIds.length > 0
      ? await sb.from('users').select('id').in('id', domainUserIds)
      : { data: [] };
    const validDomainUserIds = new Set((domainUsers ?? []).map((u: any) => u.id));
    const domainsOrphanedUser = (dbDomains ?? []).filter((d: any) => d.user_id && !validDomainUserIds.has(d.user_id));

    return NextResponse.json({
      wpcloud: {
        inApiNotDb: [], // Would need wp.cloud list-sites API which we don't have a good endpoint for
        inDbNotApi: sitesOrphanedUser.map((s: any) => `${s.label} (${s.wp_cloud_site_id}) — user deleted`),
        sitesNoUser: sitesNoUser.map((s: any) => `${s.label} (${s.wp_cloud_site_id})`),
        matched: (dbSites ?? []).length - sitesOrphanedUser.length - sitesNoUser.length,
      },
      domains: {
        total: (dbDomains ?? []).length,
        noUser: domainsNoUser.map((d: any) => d.domain_name),
        orphanedUser: domainsOrphanedUser.map((d: any) => `${d.domain_name} — user deleted`),
      },
      opensrs: {
        checked: false,
        error: 'OpenSRS does not have a list-all-domains API. Domains are verified individually.',
      },
    });
  } catch (e: any) {
    console.error('Sync check error:', e);
    return NextResponse.json({ error: e.message ?? 'Check failed' }, { status: 500 });
  }
}
