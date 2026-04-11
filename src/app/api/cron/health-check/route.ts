import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const results: Record<string, any> = {};

  // 1. Edge function health check
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/health-check`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: '{}',
      }
    );
    results.healthCheck = await res.json();
  } catch (e: any) {
    results.healthCheck = { error: e.message };
  }

  // 2. Sync storage usage from wp.cloud
  try {
    const { data: sites } = await sb
      .from('sites')
      .select('id, wp_cloud_site_id')
      .in('status', ['active'])
      .not('wp_cloud_site_id', 'is', null);

    let synced = 0;
    for (const site of sites ?? []) {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/site-info`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ action: 'get-site', siteId: site.id }),
          },
        );
        if (res.ok) {
          const siteData = await res.json();
          const diskUsageMb = siteData.space_used
            ? Math.round(Number(siteData.space_used) / (1024 * 1024))
            : siteData.disk_space_used ? Math.round(Number(siteData.disk_space_used)) : null;

          if (diskUsageMb !== null) {
            await sb.from('sites').update({ disk_usage_mb: diskUsageMb, updated_at: new Date().toISOString() }).eq('id', site.id);
            synced++;
          }
        }
      } catch {}
    }
    results.storageSync = { total: sites?.length ?? 0, synced };
  } catch (e: any) {
    results.storageSync = { error: e.message };
  }

  // 3. wp.cloud ↔ Envosta site sync check
  // Pull all sites from wp.cloud, compare against our sites table
  try {
    const wpcloudRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/site-info`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ action: 'list-all-sites' }),
      },
    );

    if (wpcloudRes.ok) {
      const wpSites = await wpcloudRes.json();
      const wpSiteIds = new Set((wpSites ?? []).map((s: any) => String(s.atomic_site_id ?? s.id ?? s.blog_id)));

      // Get all our tracked wp_cloud_site_ids
      const { data: ourSites } = await sb
        .from('sites')
        .select('id, wp_cloud_site_id, user_id, label, status')
        .not('wp_cloud_site_id', 'is', null);

      const ourWpIds = new Set((ourSites ?? []).map((s: any) => s.wp_cloud_site_id));

      // Find orphans: in wp.cloud but not in our DB — auto-create site rows
      const orphanedInWpCloud: any[] = [];
      for (const wpSite of wpSites ?? []) {
        const wpId = String(wpSite.atomic_site_id ?? wpSite.id ?? wpSite.blog_id);
        if (!ourWpIds.has(wpId)) {
          const domain = wpSite.domain ?? wpSite.home_url ?? 'unknown';
          orphanedInWpCloud.push({ wp_cloud_id: wpId, domain });

          // Auto-create an unlinked site row so it shows up in admin Sites tab
          await sb.from('sites').insert({
            wp_cloud_site_id: wpId,
            wp_cloud_url: domain.startsWith('http') ? domain : `https://${domain}`,
            label: domain.replace(/^https?:\/\//, '').split('.')[0] || 'orphaned-site',
            status: 'active',
            user_id: null,
            server_region: wpSite.geo_affinity ?? 'dca',
            config: { php_workers: 2, storage_gb: 25, php_memory_mb: 512 },
            metadata: { orphaned: true, discovered_at: new Date().toISOString(), source: 'wp_cloud_sync' },
          });
        }
      }

      // Find orphans: in our DB but not in wp.cloud (site deleted externally)
      const missingFromWpCloud: any[] = [];
      for (const site of ourSites ?? []) {
        if (site.wp_cloud_site_id && !wpSiteIds.has(site.wp_cloud_site_id) && site.status === 'active') {
          missingFromWpCloud.push({
            envosta_id: site.id,
            wp_cloud_id: site.wp_cloud_site_id,
            label: site.label,
            user_id: site.user_id,
          });
        }
      }

      // Find unlinked: in our DB with no user attached
      const unlinked = (ourSites ?? []).filter((s: any) => !s.user_id && s.status !== 'deleted');

      // Log issues
      if (orphanedInWpCloud.length > 0 || missingFromWpCloud.length > 0 || unlinked.length > 0) {
        await sb.from('logs').insert({
          action: 'health.site_sync',
          details: `Site sync: ${orphanedInWpCloud.length} orphaned in wp.cloud, ${missingFromWpCloud.length} missing from wp.cloud, ${unlinked.length} unlinked`,
          level: orphanedInWpCloud.length > 0 || missingFromWpCloud.length > 0 ? 'warn' : 'info',
          metadata: { orphanedInWpCloud, missingFromWpCloud, unlinked },
        });

        // Email admin if issues found
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey && (orphanedInWpCloud.length > 0 || missingFromWpCloud.length > 0)) {
          const issues: string[] = [];
          if (orphanedInWpCloud.length > 0) issues.push(`${orphanedInWpCloud.length} site(s) in wp.cloud not tracked in Envosta`);
          if (missingFromWpCloud.length > 0) issues.push(`${missingFromWpCloud.length} site(s) in Envosta missing from wp.cloud`);
          if (unlinked.length > 0) issues.push(`${unlinked.length} site(s) with no user account attached`);

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Envosta <noreply@email.envosta.com>',
              to: 'admin@envosta.com',
              subject: `[Health] Site sync issues detected`,
              html: `<p>Daily site sync found issues:</p><ul>${issues.map(i => `<li>${i}</li>`).join('')}</ul><p><a href="https://my.envosta.com/admin/services">View Sites</a> · <a href="https://my.envosta.com/admin/logs">View Logs</a></p>`,
            }),
          });
        }
      }

      results.siteSync = {
        wpCloudTotal: wpSiteIds.size,
        envostaTotal: ourSites?.length ?? 0,
        orphanedInWpCloud: orphanedInWpCloud.length,
        missingFromWpCloud: missingFromWpCloud.length,
        unlinked: unlinked.length,
        healthy: orphanedInWpCloud.length === 0 && missingFromWpCloud.length === 0 && unlinked.length === 0,
      };
    } else {
      results.siteSync = { error: 'Failed to fetch wp.cloud sites' };
    }
  } catch (e: any) {
    results.siteSync = { error: e.message };
  }

  return NextResponse.json(results);
}
