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

  const results: Record<string, any> = {};

  // 1. Run edge function health check
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

  // 2. Sync storage usage from wp.cloud for all active sites
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const { data: sites } = await sb
      .from('sites')
      .select('id, wp_cloud_site_id')
      .in('status', ['active'])
      .not('wp_cloud_site_id', 'is', null);

    let synced = 0;
    const syncErrors: string[] = [];

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

          // wp.cloud returns space_used in bytes or MB depending on the endpoint
          const diskUsageMb = siteData.space_used
            ? Math.round(Number(siteData.space_used) / (1024 * 1024))
            : siteData.disk_space_used
              ? Math.round(Number(siteData.disk_space_used))
              : null;

          if (diskUsageMb !== null) {
            await sb.from('sites').update({
              disk_usage_mb: diskUsageMb,
              updated_at: new Date().toISOString(),
            }).eq('id', site.id);
            synced++;
          }
        }
      } catch (err) {
        syncErrors.push(`${site.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    results.storageSync = {
      total: sites?.length ?? 0,
      synced,
      errors: syncErrors.length > 0 ? syncErrors : undefined,
    };
  } catch (e: any) {
    results.storageSync = { error: e.message };
  }

  return NextResponse.json(results);
}
