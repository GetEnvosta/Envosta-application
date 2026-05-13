/**
 * GET /api/internal/wpcloud/site-info
 *
 * Internal read-only route mirroring a subset of
 * supabase/functions/site-info/index.ts. Only the read paths land in
 * Phase 2B — the write actions (create-backup, run-wp-cli, etc.) come
 * once cutover is complete in 2C.
 *
 * Supported `action` query params:
 *   - `get`              → wp.cloud get-site for the site's wp.cloud ID
 *   - `list-backups`     → wp.cloud site-backups-list
 *   - `get-ssl-status`   → wp.cloud SSL info via site-meta (no write)
 *
 * Auth: X-Internal-Token header must match INTERNAL_API_TOKEN env var.
 *
 * Query params:
 *   - action: one of the supported actions above (required)
 *   - siteId: customer-facing sites.id (required)
 *
 * Notes:
 *  - This route does not refresh the `wpcloud_sites` mirror — it's a
 *    pass-through. Mirror refresh happens via the reconciliation cron
 *    (Phase 6).
 *  - Audit_log is only written for the `get-ssl-status` action since
 *    `get` and `list-backups` are pure reads with no state change.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyInternalToken } from '@/lib/internal-auth';
import { createWpCloudClient, WpCloudError } from '@/lib/integrations/wpcloud';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type SiteInfoAction = 'get' | 'list-backups' | 'get-ssl-status';

const ACTIONS: SiteInfoAction[] = ['get', 'list-backups', 'get-ssl-status'];

export async function GET(req: Request) {
  if (!verifyInternalToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action') as SiteInfoAction | null;
  const siteId = url.searchParams.get('siteId');

  if (!action || !ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: `action must be one of: ${ACTIONS.join(', ')}` },
      { status: 400 },
    );
  }
  if (!siteId) {
    return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: site, error: fetchErr } = await sb
    .from('sites')
    .select('id, wp_cloud_site_id, status')
    .eq('id', siteId)
    .single();

  if (fetchErr || !site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }
  if (!site.wp_cloud_site_id) {
    return NextResponse.json(
      { error: 'Site has no wp_cloud_site_id (not yet provisioned)' },
      { status: 409 },
    );
  }

  const client = createWpCloudClient();

  try {
    switch (action) {
      case 'get': {
        const data = await client.getSite(site.wp_cloud_site_id);
        return NextResponse.json({ ok: true, siteId, data });
      }
      case 'list-backups': {
        const data = await client.listBackups(site.wp_cloud_site_id);
        return NextResponse.json({ ok: true, siteId, backups: data.backups });
      }
      case 'get-ssl-status': {
        // wp.cloud doesn't expose a dedicated SSL read endpoint via the
        // typed client surface yet; surface the site row's SSL-related
        // meta via getSite for now. Once Phase 5 adds a dedicated
        // getSslStatus method, swap this in.
        const data = await client.getSite(site.wp_cloud_site_id);
        const sslFields = {
          ssl_status: (data as Record<string, unknown>).ssl_status,
          ssl_expires_at: (data as Record<string, unknown>).ssl_expires_at,
        };
        return NextResponse.json({ ok: true, siteId, ssl: sslFields });
      }
    }
  } catch (e) {
    const isWpErr = e instanceof WpCloudError;
    const status = isWpErr ? e.status : 502;
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status });
  }
}
