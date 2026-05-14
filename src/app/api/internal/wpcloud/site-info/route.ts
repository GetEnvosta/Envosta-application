/**
 * /api/internal/wpcloud/site-info
 *
 * Internal Vercel route that the Stripe webhook, admin tools, and cron
 * jobs use to talk to wp.cloud. All wp.cloud calls originate from a
 * Vercel static IP (whitelisted at wp.cloud).
 *
 * Two transports:
 *   - POST with JSON body `{ action, siteId?, key?, value?, ... }`
 *     (action-based dispatch).
 *   - GET  `?action=<action>&siteId=<id>` (Phase 2B read-only entrypoint).
 *
 * Auth: X-Internal-Token header must match INTERNAL_API_TOKEN env var.
 *
 * Supported actions (subset of the edge function — added as callers
 * are flipped over in Phase 2C):
 *   READ:
 *     - get              ─ wp.cloud get-site for a sites row
 *     - get-site         ─ alias of `get` (edge function naming)
 *     - list-backups
 *     - get-ssl-status   ─ surfaced via getSite() until we add a
 *                          dedicated SSL endpoint
 *     - list-all-sites   ─ raw upstream list for admin sync tooling
 *
 *   WRITE:
 *     - update-meta / update-site-meta ─ allow-listed site-meta keys
 *     - delete-site                    ─ soft-delete (Stripe item
 *                                        removal + flag_for_deletion)
 *     - hard-delete-site               ─ permanent wp.cloud delete
 *     - software-bootstrap             ─ re-run parent-theme/Akismet
 *                                        install + Jetpack/Akismet unlock
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { verifyInternalToken } from '@/lib/internal-auth';
import { createWpCloudClient, WpCloudError } from '@/lib/integrations/wpcloud';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const ENVOSTA_PARENT_THEME_ZIP_URL =
  process.env.ENVOSTA_PARENT_THEME_ZIP_URL ??
  'https://github.com/GetEnvosta/Envosta-Theme/releases/latest/download/envosta.zip';

const ALLOWED_META_KEYS = [
  'default_php_conns',
  'burst_php_conns',
  'php_memory_limit',
  'php_version',
  'jetpack_backup',
  'page_optimize',
  'jetpack_waf',
  'has_staging',
  'space_quota',
];

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}

async function recordLog(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  p: {
    userId?: string | null;
    siteId?: string | null;
    level?: string;
    action: string;
    message?: string;
    res?: unknown;
  },
): Promise<void> {
  try {
    await client.from('logs').insert({
      user_id: p.userId ?? null,
      site_id: p.siteId ?? null,
      level: p.level ?? 'info',
      action: p.action,
      message: p.message ?? null,
      response_payload: p.res ?? null,
    });
  } catch (e) {
    console.error('[site-info] log write failed (non-fatal):', e);
  }
}

// ─── Action handlers ───────────────────────────────────────────

async function handleGetSite(siteId: string) {
  const client = createWpCloudClient();
  const supabase = sb();

  const { data: row, error: fetchErr } = await supabase
    .from('sites')
    .select('id, wp_cloud_site_id, status')
    .eq('id', siteId)
    .single();
  if (fetchErr || !row) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }
  if (!row.wp_cloud_site_id) {
    return NextResponse.json({ error: 'Site has no wp_cloud_site_id' }, { status: 400 });
  }
  try {
    const data = await client.getSite(row.wp_cloud_site_id);
    return NextResponse.json(data);
  } catch (e) {
    return wpErrorResponse(e);
  }
}

async function handleListBackups(siteId: string) {
  const client = createWpCloudClient();
  const supabase = sb();
  const { data: row } = await supabase
    .from('sites')
    .select('id, wp_cloud_site_id')
    .eq('id', siteId)
    .single();
  if (!row?.wp_cloud_site_id) {
    return NextResponse.json({ error: 'Site has no wp_cloud_site_id' }, { status: 400 });
  }
  try {
    const data = await client.listBackups(row.wp_cloud_site_id);
    return NextResponse.json(data);
  } catch (e) {
    return wpErrorResponse(e);
  }
}

async function handleListAllSites() {
  const client = createWpCloudClient();
  try {
    const data = await client.listAllSitesRaw();
    return NextResponse.json(data);
  } catch (e) {
    return wpErrorResponse(e);
  }
}

/**
 * Lightweight connectivity probe. Calls wp.cloud's get-php-versions
 * endpoint (read-only, parameter-light, returns 200 if auth + IP
 * whitelist are correct). Used by the admin Service Status panel to
 * confirm Vercel → wp.cloud reachability.
 */
async function handleHealthCheck() {
  const client = createWpCloudClient();
  try {
    await client.ping();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return wpErrorResponse(e);
  }
}

async function handleUpdateMeta(siteId: string, key: string, value: unknown) {
  if (!ALLOWED_META_KEYS.includes(key)) {
    return NextResponse.json(
      { error: `Invalid key: ${key}. Allowed: ${ALLOWED_META_KEYS.join(', ')}` },
      { status: 400 },
    );
  }
  const client = createWpCloudClient();
  const supabase = sb();
  const { data: row } = await supabase
    .from('sites')
    .select('id, wp_cloud_site_id')
    .eq('id', siteId)
    .single();
  if (!row?.wp_cloud_site_id) {
    return NextResponse.json({ error: 'Site has no wp_cloud_site_id' }, { status: 400 });
  }
  try {
    await client.updateSiteMeta(row.wp_cloud_site_id, key, String(value));
    await recordLog(supabase, {
      siteId: row.id,
      action: `hosting.update-meta.${key}`,
      message: `Set ${key}=${value}`,
    });
    return NextResponse.json({ ok: true, key, value });
  } catch (e) {
    return wpErrorResponse(e);
  }
}

async function handleSoftwareBootstrap(siteId: string) {
  const client = createWpCloudClient();
  const supabase = sb();
  const { data: row } = await supabase.from('sites').select('id, wp_cloud_site_id, user_id').eq('id', siteId).single();
  if (!row?.wp_cloud_site_id) {
    return NextResponse.json({ error: 'Site has no wp_cloud_site_id' }, { status: 400 });
  }

  const results: Record<string, unknown> = {};
  try {
    const r = await client.runWpCli(row.wp_cloud_site_id, [
      'theme', 'install', ENVOSTA_PARENT_THEME_ZIP_URL, '--activate', '--force',
    ]);
    results.parent_theme = { ok: true, task_id: r.task_id };
  } catch (e) {
    results.parent_theme = { ok: false, error: String(e) };
  }
  try {
    const r = await client.runWpCli(row.wp_cloud_site_id, ['plugin', 'install', 'akismet', '--activate']);
    results.akismet = { ok: true, task_id: r.task_id };
  } catch (e) {
    results.akismet = { ok: false, error: String(e) };
  }
  try {
    const r = await client.manageSoftware(row.wp_cloud_site_id, 'unlock', 'plugin', 'jetpack');
    results.jetpack_unlock = { ok: true, message: r.message };
  } catch (e) {
    results.jetpack_unlock = { ok: false, error: String(e) };
  }
  try {
    const r = await client.manageSoftware(row.wp_cloud_site_id, 'unlock', 'plugin', 'akismet');
    results.akismet_unlock = { ok: true, message: r.message };
  } catch (e) {
    results.akismet_unlock = { ok: false, error: String(e) };
  }

  await recordLog(supabase, {
    userId: row.user_id,
    siteId: row.id,
    action: 'site.software.bootstrap',
    message: 'backfill',
    res: results,
  });
  return NextResponse.json(results);
}

async function handleHardDelete(siteId: string, actorId: string | null) {
  const supabase = sb();
  const client = createWpCloudClient();

  const { data: row } = await supabase
    .from('sites')
    .select('id, wp_cloud_site_id, wp_cloud_url, user_id, metadata')
    .eq('id', siteId)
    .single();
  if (!row) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  let deleteResult: unknown = null;
  if (row.wp_cloud_site_id) {
    try {
      await client.deleteSite(row.wp_cloud_site_id);
      deleteResult = { ok: true };
      await recordLog(supabase, {
        userId: actorId ?? null,
        siteId: row.id,
        action: 'hosting.hard_delete',
        message: `Permanently deleted from wp.cloud: ${row.wp_cloud_url ?? row.wp_cloud_site_id}`,
      });
    } catch (e) {
      deleteResult = { ok: false, error: String(e) };
      console.error('[site-info] hard-delete wp.cloud call failed:', e);
    }
  }

  await supabase
    .from('sites')
    .update({
      status: 'cancelled',
      wp_cloud_site_id: null,
      wp_cloud_url: null,
      metadata: {
        ...((row.metadata as any) ?? {}),
        hard_deleted_at: new Date().toISOString(),
        hard_deleted_by: actorId ?? 'service',
      },
    })
    .eq('id', siteId);

  await recordAudit({
    actorType: 'system',
    actorId: actorId ?? undefined,
    action: 'wpcloud.site.hard_deleted',
    resourceType: 'site',
    resourceId: siteId,
    before: { wp_cloud_site_id: row.wp_cloud_site_id, status: 'any' },
    after: { wp_cloud_site_id: null, status: 'cancelled' },
    metadata: { source: 'internal-route', delete_result: deleteResult },
  });

  return NextResponse.json({ deleted: true, permanent: true });
}

async function handleSoftDelete(siteId: string, actorId: string | null) {
  const supabase = sb();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2023-10-16' as any });

  const { data: row } = await supabase
    .from('sites')
    .select('id, wp_cloud_site_id, wp_cloud_url, user_id, stripe_subscription_item_id, product_id, label, config, metadata')
    .eq('id', siteId)
    .single();
  if (!row) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  let subscriptionPaused = false;

  // 1. Remove this site's line item from Stripe.
  // Account-centric: ask Stripe directly for the parent sub via the item.
  // Sync Engine mirrors the resulting pause back into stripe.subscriptions.
  if (row.stripe_subscription_item_id) {
    try {
      const stripeItem = await stripe.subscriptionItems.retrieve(row.stripe_subscription_item_id);
      const parentSubId = stripeItem.subscription;
      if (parentSubId) {
        const stripeSub = await stripe.subscriptions.retrieve(parentSubId);
        const itemCount = stripeSub.items.data.length;
        await stripe.subscriptionItems.del(row.stripe_subscription_item_id, {
          proration_behavior: 'create_prorations',
        });

        if (itemCount <= 1 && stripeSub.status !== 'canceled') {
          await stripe.subscriptions.update(parentSubId, {
            pause_collection: { behavior: 'void' },
          });
          subscriptionPaused = true;
        }
      }
    } catch (stripeErr) {
      console.error('[site-info] failed to remove Stripe line item:', stripeErr);
    }
  }

  // 2. Flag for admin cleanup (don't touch wp.cloud yet).
  const now = new Date().toISOString();
  await supabase
    .from('sites')
    .update({
      status: 'flagged_for_deletion',
      flagged_for_deletion_at: now,
      paused_at: now,
      flag_reason: actorId === row.user_id ? 'deleted_by_owner' : 'deleted_by_service',
      stripe_subscription_item_id: null,
      metadata: {
        ...((row.metadata as any) ?? {}),
        soft_deleted_at: now,
        soft_deleted_by: actorId ?? 'service',
        previous_product_id: row.product_id,
        previous_config: row.config,
        subscription_paused: subscriptionPaused,
      },
    })
    .eq('id', siteId);

  // 3. Unlink domains.
  await supabase.from('domains').update({ site_id: null }).eq('site_id', siteId);

  await recordLog(supabase, {
    userId: row.user_id,
    siteId: row.id,
    action: 'hosting.soft_delete',
    message: `Site "${row.label}" deleted by ${actorId === row.user_id ? 'owner' : 'service'}. ${subscriptionPaused ? 'Subscription paused.' : 'Subscription still active.'}`,
  });

  return NextResponse.json({ deleted: true, queuedForCleanup: true, subscriptionPaused });
}

function wpErrorResponse(e: unknown) {
  const isWp = e instanceof WpCloudError;
  const status = isWp ? e.status : 502;
  const message = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: message }, { status });
}

// ─── Entry points ─────────────────────────────────────────────

export async function POST(req: Request) {
  if (!verifyInternalToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  return dispatch(body.action ?? '', body);
}

export async function GET(req: Request) {
  if (!verifyInternalToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const action = url.searchParams.get('action') ?? '';
  const siteId = url.searchParams.get('siteId') ?? null;
  return dispatch(action, { siteId });
}

async function dispatch(action: string, body: any): Promise<Response> {
  const siteId = body.siteId ?? body.serviceId ?? null;
  const actorId = body.actorId ?? body.userId ?? null;

  switch (action) {
    case 'get':
    case 'get-site':
      if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
      return handleGetSite(siteId);

    case 'list-backups':
      if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
      return handleListBackups(siteId);

    case 'get-ssl-status': {
      if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
      const client = createWpCloudClient();
      const supabase = sb();
      const { data: row } = await supabase.from('sites').select('id, wp_cloud_site_id').eq('id', siteId).single();
      if (!row?.wp_cloud_site_id) return NextResponse.json({ error: 'Site has no wp_cloud_site_id' }, { status: 400 });
      try {
        const data = (await client.getSite(row.wp_cloud_site_id)) as Record<string, unknown>;
        return NextResponse.json({
          ssl_status: data.ssl_status,
          ssl_expires_at: data.ssl_expires_at,
        });
      } catch (e) {
        return wpErrorResponse(e);
      }
    }

    case 'list-all-sites':
      return handleListAllSites();

    case 'health-check':
      return handleHealthCheck();

    case 'update-meta':
    case 'update-site-meta':
      if (!siteId || !body.key || body.value === undefined) {
        return NextResponse.json({ error: 'siteId, key and value are required' }, { status: 400 });
      }
      return handleUpdateMeta(siteId, body.key, body.value);

    case 'software-bootstrap':
      if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
      return handleSoftwareBootstrap(siteId);

    case 'hard-delete-site':
      if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
      return handleHardDelete(siteId, actorId);

    case 'delete-site':
      if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
      return handleSoftDelete(siteId, actorId);

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}
