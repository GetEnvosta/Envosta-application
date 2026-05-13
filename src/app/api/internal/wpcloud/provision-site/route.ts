/**
 * POST /api/internal/wpcloud/provision-site
 *
 * Internal route called server-to-server (Stripe webhook + admin routes
 * will switch to this in Phase 2C). Mirrors the work currently done by
 * supabase/functions/provision-hosting/index.ts:
 *  - Creates a wp.cloud site via the new direct integration client
 *  - Updates the customer-facing `sites` row (status, wp_cloud_site_id)
 *  - Inserts a row into the `wpcloud_sites` mirror table
 *  - Records the state change to `audit_log`
 *
 * Not yet wired into any caller — this route coexists with the edge
 * function. Cutover happens once wp.cloud whitelists Vercel static IPs.
 *
 * Auth: X-Internal-Token header must match INTERNAL_API_TOKEN env var.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyInternalToken } from '@/lib/internal-auth';
import { createWpCloudClient, WpCloudError } from '@/lib/integrations/wpcloud';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ProvisionSiteBody {
  siteId: string; // existing sites.id row to attach the wp.cloud site to
  label: string;
  region?: string;
  phpVersion?: string;
  planId?: string;
  userId: string;
}

export async function POST(req: Request) {
  if (!verifyInternalToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: ProvisionSiteBody;
  try {
    body = (await req.json()) as ProvisionSiteBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.siteId || !body.label || !body.userId) {
    return NextResponse.json(
      { error: 'siteId, label, and userId are required' },
      { status: 400 },
    );
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  // Snapshot the current row for the audit_log before/after pair.
  const { data: siteBefore, error: fetchErr } = await sb
    .from('sites')
    .select('id, status, wp_cloud_site_id, metadata, config, product_id, server_region')
    .eq('id', body.siteId)
    .single();

  if (fetchErr || !siteBefore) {
    return NextResponse.json({ error: 'Site row not found' }, { status: 404 });
  }
  if (siteBefore.wp_cloud_site_id) {
    return NextResponse.json(
      { error: 'Site already has a wp_cloud_site_id', siteId: body.siteId },
      { status: 409 },
    );
  }

  const client = createWpCloudClient();

  try {
    const result = await client.createSite({
      label: body.label,
      region: body.region ?? siteBefore.server_region ?? 'dca',
      phpVersion: body.phpVersion ?? '8.4',
      planId: body.planId ?? siteBefore.product_id ?? '',
      userId: body.userId,
    });

    const nowIso = new Date().toISOString();

    // Update the customer-facing sites row.
    const updatedMeta = {
      ...((siteBefore.metadata as Record<string, unknown> | null) ?? {}),
      provisioned_at: nowIso,
      provisioned_by: 'internal-route',
    };
    await sb
      .from('sites')
      .update({
        status: 'active',
        wp_cloud_site_id: result.site_id,
        metadata: updatedMeta,
      })
      .eq('id', body.siteId);

    // Upsert into the wpcloud_sites mirror table. The migration
    // (20260506000002_mirror_tables.sql) keys on upstream_id and
    // points back to sites.id via site_id.
    await sb.from('wpcloud_sites').upsert(
      {
        upstream_id: result.site_id,
        upstream_status: result.status,
        upstream_payload: { createSite: result },
        site_id: body.siteId,
        last_synced_at: nowIso,
      },
      { onConflict: 'upstream_id' },
    );

    await recordAudit({
      actorType: 'system',
      actorId: body.userId,
      action: 'wpcloud.site.provisioned',
      resourceType: 'site',
      resourceId: body.siteId,
      before: { status: siteBefore.status, wp_cloud_site_id: siteBefore.wp_cloud_site_id },
      after: { status: 'active', wp_cloud_site_id: result.site_id },
      metadata: { source: 'internal-route', upstream_status: result.status },
    });

    return NextResponse.json({
      ok: true,
      siteId: body.siteId,
      wpCloudSiteId: result.site_id,
      status: result.status,
    });
  } catch (e) {
    const isWpErr = e instanceof WpCloudError;
    const status = isWpErr ? e.status : 502;
    const message = e instanceof Error ? e.message : String(e);

    await sb
      .from('sites')
      .update({
        status: 'failed',
        metadata: {
          ...((siteBefore.metadata as Record<string, unknown> | null) ?? {}),
          error: { message, status, body: isWpErr ? e.body : null },
        },
      })
      .eq('id', body.siteId);

    await recordAudit({
      actorType: 'system',
      actorId: body.userId,
      action: 'wpcloud.site.provision_failed',
      resourceType: 'site',
      resourceId: body.siteId,
      before: { status: siteBefore.status },
      after: { status: 'failed' },
      metadata: { error: message, http_status: status },
    });

    return NextResponse.json({ error: message }, { status });
  }
}
