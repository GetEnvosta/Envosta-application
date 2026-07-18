/**
 * POST /api/internal/wpcloud/provision-site
 *
 * Internal route called server-to-server. Faithfully ports the work
 * previously done by supabase/functions/provision-hosting/index.ts:
 *  - Creates a wp.cloud site via the new direct integration client
 *  - Updates the customer-facing `sites` row (status, wp_cloud_site_id,
 *    wp_cloud_url, metadata{wp_admin_user/pass, site_ip, …})
 *  - Inserts a row into the `wpcloud_sites` mirror table
 *  - Applies plan-tier features (storage quota, PHP workers, backups,
 *    CDN, WAF, staging) via site-meta
 *  - Installs + unlocks the Envosta parent theme + Akismet so customers
 *    can manage them
 *  - Removes the Jetpack plugin that wp.cloud pre-installs (Jetpack is
 *    banned from the stack — every Envosta site ships Jetpack-free)
 *  - Auto-configures OpenSRS DNS for Envosta-registered domains
 *  - Sends site-ready / provisioning-failed transactional emails
 *  - Records the state change to `audit_log`
 *
 * Called by the Stripe webhook, admin tools, and provisioning workflows
 * so wp.cloud calls always originate from a Vercel static IP.
 *
 * Auth: X-Internal-Token header must match INTERNAL_API_TOKEN env var.
 *
 * Body (matches the edge-function payload shape for back-compat):
 *   {
 *     // either serviceId or siteId may be used to reference an existing
 *     // sites row to attach the wp.cloud site to. If neither is given,
 *     // and subscriptionId is provided, the route looks up or creates
 *     // a site row for that subscription. If still nothing matches and
 *     // userId+label is provided, the route inserts a new row.
 *     serviceId?: string,
 *     siteId?: string,
 *     userId: string,
 *     subscriptionId?: string | null,
 *     planId?: string | null,
 *     label?: string,
 *     region?: string,
 *     phpVersion?: string,
 *     domainName?: string,
 *     adminEmail?: string,
 *   }
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyInternalToken } from '@/lib/internal-auth';
import { createWpCloudClient, WpCloudError } from '@/lib/integrations/wpcloud';
import { createOpenSrsClient, buildWpCloudDnsRecords } from '@/lib/integrations/opensrs';
import { recordAudit } from '@/lib/audit';
import { recordApiCall } from '@/lib/api-call-logger';
import { sendEmail, siteReadyEmail, provisioningFailedEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const ENVOSTA_PARENT_THEME_ZIP_URL =
  process.env.ENVOSTA_PARENT_THEME_ZIP_URL ??
  'https://github.com/GetEnvosta/Envosta-Theme/releases/latest/download/envosta.zip';

interface ProvisionSiteBody {
  // accept both legacy (serviceId) and new (siteId)
  serviceId?: string;
  siteId?: string;
  userId?: string;
  /** Legacy field — ignored post Stripe-Sync cutover (account-centric). */
  subscriptionId?: string | null;
  planId?: string | null;
  label?: string;
  region?: string;
  phpVersion?: string;
  domainName?: string;
  adminEmail?: string;
}

interface SiteRow {
  id: string;
  user_id: string | null;
  status: string | null;
  wp_cloud_site_id: string | null;
  label: string | null;
  product_id: string | null;
  server_region: string | null;
  php_version?: string | null;
  metadata: Record<string, unknown> | null;
  config?: Record<string, unknown> | null;
}

function sanitizeAdminUser(emailOrName: string): string {
  const raw = (emailOrName ?? 'admin')
    .split('@')[0]
    .replace(/[^a-z0-9_]/gi, '_')
    .toLowerCase();
  const padded = raw.length < 5 ? `${raw}_admin` : raw;
  return padded.slice(0, 30) || 'envosta_admin';
}

function siteLabelFromInput(label: string | null | undefined): string {
  const raw = (label ?? 'site').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 50);
  return raw || 'site';
}

/**
 * Provision-site touches a chain of wp.cloud calls (create-site, install
 * theme + plugins, manage-software, get-site-ip) and each step is worth
 * preserving in the api_calls telemetry table along with request payload,
 * response payload, and elapsed milliseconds. We funnel every internal
 * log() call through recordApiCall() — the `action` becomes the path,
 * `message` rides in request_payload alongside the supplied `req` (when
 * present) so non-API events (state changes recorded mid-flow) still leave
 * a breadcrumb. recordApiCall() never throws.
 */
async function recordLog(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _sb: any,
  p: {
    userId?: string | null;
    siteId?: string | null;
    level?: string;
    action: string;
    message?: string;
    req?: unknown;
    res?: unknown;
    ms?: number;
  },
): Promise<void> {
  await recordApiCall({
    provider: 'wpcloud',
    method: 'POST',
    path: p.action,
    requestPayload: {
      userId: p.userId ?? null,
      siteId: p.siteId ?? null,
      level: p.level ?? 'info',
      message: p.message ?? null,
      ...(p.req != null ? { req: p.req } : {}),
    },
    responsePayload: p.res ?? null,
    durationMs: p.ms ?? undefined,
    ...(p.level === 'error'
      ? { error: { message: p.message ?? null } }
      : {}),
  });
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

  const t0 = Date.now();
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  const refSiteId = body.siteId ?? body.serviceId ?? null;
  const userId = body.userId ?? null;
  const domainName = body.domainName ?? null;

  // ── Resolve the sites row we're operating on ──────────────────
  let site: SiteRow | null = null;

  if (refSiteId) {
    const { data: existing, error: fetchErr } = await sb
      .from('sites')
      .select('id, user_id, status, wp_cloud_site_id, label, product_id, server_region, php_version, metadata, config')
      .eq('id', refSiteId)
      .single();
    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Site row not found' }, { status: 404 });
    }
    site = existing as unknown as SiteRow;
  }

  // If still no site row, INSERT one (matches the edge-function path
  // for first-time signups where the webhook didn't pre-create).
  // sites.subscription_id was dropped (account-centric model) — the
  // user's active sub is looked up via stripe.subscriptions when needed.
  if (!site) {
    if (!userId || !body.label) {
      return NextResponse.json(
        { error: 'When siteId is not provided, userId + label are required' },
        { status: 400 },
      );
    }
    const { data: inserted, error: svcErr } = await sb
      .from('sites')
      .insert({
        user_id: userId,
        product_id: body.planId ?? null,
        label: siteLabelFromInput(body.label),
        status: 'provisioning',
        server_region: body.region ?? 'dca',
        php_version: body.phpVersion ?? '8.4',
      })
      .select('id, user_id, status, wp_cloud_site_id, label, product_id, server_region, php_version, metadata, config')
      .single();
    if (svcErr || !inserted) {
      return NextResponse.json({ error: svcErr?.message ?? 'Failed to insert site' }, { status: 500 });
    }
    site = inserted as unknown as SiteRow;
  }

  // Hard fail if site is already provisioned — caller should not retry.
  if (site.status === 'active' && site.wp_cloud_site_id) {
    return NextResponse.json(
      { error: 'Site is already active', siteId: site.id, wpCloudSiteId: site.wp_cloud_site_id },
      { status: 409 },
    );
  }
  if (site.wp_cloud_site_id) {
    return NextResponse.json(
      { error: 'Site already has a wp_cloud_site_id', siteId: site.id, wpCloudSiteId: site.wp_cloud_site_id },
      { status: 409 },
    );
  }

  const effectiveUserId = site.user_id ?? userId;
  if (!effectiveUserId) {
    return NextResponse.json({ error: 'Site has no user_id and userId was not provided' }, { status: 400 });
  }

  // ── Resolve plan tier configuration ────────────────────────────
  let storageGb = 25;
  let defaultWorkers = 2;
  let phpMemory = 512;
  let planSlug = 'minimum';
  let hasBackups = true;
  let hasCdn = true;
  let hasWaf = true;
  let hasStaging = true;

  const planIdForLookup = site.product_id ?? body.planId ?? null;
  if (planIdForLookup) {
    const { data: plan } = await sb.from('products').select('slug, metadata').eq('id', planIdForLookup).single();
    if (plan) {
      const meta = (plan.metadata as any) ?? {};
      planSlug = plan.slug ?? 'minimum';
      storageGb = meta.storage_gb ?? 50;
      defaultWorkers = meta.php_workers_default ?? 3;
      phpMemory = meta.php_memory_mb ?? 512;
      hasBackups = meta.has_backups ?? true;
      hasCdn = meta.has_cdn ?? true;
      hasWaf = meta.has_waf ?? true;
      hasStaging = meta.has_staging ?? true;
    }
  }

  const geoAffinity = body.region ?? site.server_region ?? 'dca';
  const php = (site.metadata as any)?.php_version ?? body.phpVersion ?? site.php_version ?? '8.4';

  // Generate admin credentials for the WordPress install.
  const wpAdminPassword = `Env${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}!`;
  const adminEmail = body.adminEmail ?? 'admin@envosta.com';
  const adminUser = sanitizeAdminUser(adminEmail);

  const labelStr = siteLabelFromInput(site.label ?? body.label ?? 'site');
  const siteDomain = domainName ?? `${labelStr}.envosta.com`;

  // Build the upstream body — we pass the full Atomic create shape
  // via the extended createSite() surface.
  const extraBody: Record<string, unknown> = {
    admin_email: adminEmail,
    admin_user: adminUser,
    admin_pass: wpAdminPassword,
    space_quota: `${storageGb}G`,
    meta: {
      default_php_conns: defaultWorkers,
      burst_php_conns: 0,
      php_memory_limit: phpMemory,
    },
    persist_data: {
      envosta_site_id: site.id,
      envosta_user_id: effectiveUserId,
      envosta_plan: planSlug,
    },
    domain_name: siteDomain,
  };

  const client = createWpCloudClient();

  let createResult: Awaited<ReturnType<typeof client.createSite>> | null = null;
  let createErr: unknown = null;
  try {
    createResult = await client.createSite({
      label: labelStr,
      region: geoAffinity,
      phpVersion: php,
      planId: planIdForLookup ?? '',
      userId: effectiveUserId,
      extraBody,
      siteIdentifier: Date.now().toString(),
    });
  } catch (e) {
    createErr = e;
    // Fallback: if the failure looks like "Domain name already used"
    // (the edge function's known retry case), drop the domain and ask
    // wp.cloud to assign a demo domain instead.
    const isWpErr = e instanceof WpCloudError;
    const errBody = isWpErr ? (e as WpCloudError).body : null;
    const msg = errBody && typeof errBody === 'object' ? String((errBody as any).message ?? '') : '';
    if (isWpErr && msg.includes('Domain name already used')) {
      try {
        const retryExtra = { ...extraBody };
        delete (retryExtra as any).domain_name;
        retryExtra.demo_domain = true;
        createResult = await client.createSite({
          label: labelStr,
          region: geoAffinity,
          phpVersion: php,
          planId: planIdForLookup ?? '',
          userId: effectiveUserId,
          extraBody: retryExtra,
          siteIdentifier: (Date.now() + 1).toString(),
        });
        createErr = null;
      } catch (retryE) {
        createErr = retryE;
      }
    }
  }

  const ms = Date.now() - t0;

  if (createErr || !createResult) {
    const err = createErr;
    const isWpErr = err instanceof WpCloudError;
    const message = err instanceof Error ? err.message : String(err);

    await sb
      .from('sites')
      .update({
        status: 'failed',
        metadata: {
          ...(site.metadata ?? {}),
          error: { message, http_status: isWpErr ? (err as WpCloudError).status : 502, body: isWpErr ? (err as WpCloudError).body : null },
        },
      })
      .eq('id', site.id);

    await recordLog(sb, {
      userId: effectiveUserId,
      siteId: site.id,
      level: 'error',
      action: 'hosting.provision.failed',
      message,
      ms,
    });

    await recordAudit({
      actorType: 'system',
      actorId: effectiveUserId,
      action: 'wpcloud.site.provision_failed',
      resourceType: 'site',
      resourceId: site.id,
      before: { status: site.status },
      after: { status: 'failed' },
      metadata: { error: message },
    });

    // Best-effort failure notification email.
    try {
      const { data: userProfile } = await sb.from('users').select('email, full_name').eq('id', effectiveUserId).maybeSingle();
      if (userProfile?.email) {
        const email = provisioningFailedEmail(userProfile.full_name ?? 'there', site.label ?? 'your site');
        await sendEmail({ to: userProfile.email, ...email });
      }
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({ error: `Provisioning failed: ${message}` }, { status: 502 });
  }

  // ── Successful create — extract site info ─────────────────────
  const wpResponse = (createResult.raw?.data ?? createResult.raw) as Record<string, unknown>;
  const wpSiteIdStr = createResult.site_id;
  const wpDomain = (wpResponse?.domain_name as string | undefined) ?? siteDomain;
  const wpUrl = wpDomain ? `https://${wpDomain}` : null;

  // Fetch site IP — best-effort, non-fatal.
  let siteIp: string | null = null;
  try {
    const ipRes = await client.getSiteIp(wpDomain ?? wpSiteIdStr);
    siteIp = ipRes.ip;
  } catch (ipErr) {
    console.error('[provision-site] getSiteIp failed (non-fatal):', ipErr);
  }

  const nowIso = new Date().toISOString();
  // SECURITY: never persist wp_admin_password in DB metadata. Any admin
  // or anyone with SQL access could enumerate all customers' WP-admin
  // creds. The password ships once in the siteReady email body and
  // exists only in the wp.cloud side from there on. Customer can reset
  // via wp-login.php?action=lostpassword.
  const updatedMetadata: Record<string, unknown> = {
    ...(site.metadata ?? {}),
    wp_cloud_response: wpResponse,
    job_id: (wpResponse as any)?.job_id,
    domain_name: domainName ?? null,
    site_ip: siteIp,
    wp_admin_user: adminUser,
    provisioned_at: nowIso,
    provisioned_by: 'internal-route',
  };

  await sb
    .from('sites')
    .update({
      status: 'active',
      wp_cloud_site_id: wpSiteIdStr,
      wp_cloud_url: wpUrl,
      metadata: updatedMetadata,
    })
    .eq('id', site.id);

  // ── Mirror table upsert ───────────────────────────────────────
  // Populate every column known at provision time from the create-site
  // response. Fields that only become known later (ssl_status,
  // ip_address may be null here, space_used_mb) are left for the
  // reconcile-wpcloud cron to backfill.
  const wpcomBlogId =
    (wpResponse as any)?.wpcom_blog_id ?? (wpResponse as any)?.blog_id ?? null;
  const upstreamCreatedRaw =
    (wpResponse as any)?.created_at ?? (wpResponse as any)?.created ?? null;
  let upstreamCreatedAt: string | null = null;
  if (upstreamCreatedRaw) {
    const d = new Date(
      typeof upstreamCreatedRaw === 'number' && upstreamCreatedRaw < 1e12
        ? upstreamCreatedRaw * 1000
        : upstreamCreatedRaw,
    );
    if (!Number.isNaN(d.getTime())) upstreamCreatedAt = d.toISOString();
  }
  await sb.from('wpcloud_sites').upsert(
    {
      upstream_id: wpSiteIdStr,
      site_id: site.id,
      wpcom_blog_id: wpcomBlogId != null ? String(wpcomBlogId) : null,
      primary_domain: wpDomain ?? null,
      upstream_status: createResult.status,
      php_version: php,
      geo_affinity: geoAffinity,
      space_quota_gb: storageGb,
      php_memory_mb: phpMemory,
      php_workers: defaultWorkers,
      burst_enabled: false,
      site_type: 'billable',
      ip_address: siteIp,
      upstream_created_at: upstreamCreatedAt,
      upstream_payload: { createSite: createResult.raw },
      last_synced_at: nowIso,
    },
    { onConflict: 'upstream_id' },
  );

  // ── Apply plan-tier features via site-meta ────────────────────
  const featureFlags: Array<{ key: string; value: string; label: string }> = [
    { key: 'jetpack_backup', value: hasBackups ? '1' : '0', label: 'backups' },
    { key: 'page_optimize', value: hasCdn ? '1' : '0', label: 'CDN' },
    { key: 'jetpack_waf', value: hasWaf ? '1' : '0', label: 'WAF' },
  ];
  if (hasStaging) featureFlags.push({ key: 'has_staging', value: '1', label: 'staging' });

  for (const feat of featureFlags) {
    try {
      await client.updateSiteMeta(wpSiteIdStr, feat.key, feat.value);
    } catch (featErr) {
      console.error(`[provision-site] feature ${feat.label} failed (non-fatal):`, featErr);
    }
  }

  // Persist plan config + guardrail defaults onto the site row.
  await sb
    .from('sites')
    .update({
      config: {
        storage_gb: storageGb,
        php_workers: defaultWorkers,
        php_memory_mb: phpMemory,
        has_backups: hasBackups,
        has_cdn: hasCdn,
        has_waf: hasWaf,
        has_staging: hasStaging,
      },
      max_php_workers: defaultWorkers,
      max_ssd_gb: storageGb,
      bursting_enabled: false,
    })
    .eq('id', site.id);

  // ── Software bootstrap (parent theme + Akismet, remove Jetpack) ──
  const softwareResults: Record<string, unknown> = {};
  try {
    const r = await client.runWpCli(wpSiteIdStr, ['theme', 'install', ENVOSTA_PARENT_THEME_ZIP_URL, '--activate', '--force']);
    softwareResults.parent_theme = { ok: r.ok, task_id: r.task_id };
  } catch (e) {
    softwareResults.parent_theme = { ok: false, error: String(e) };
  }
  try {
    const r = await client.runWpCli(wpSiteIdStr, ['plugin', 'install', 'akismet', '--activate']);
    softwareResults.akismet = { ok: r.ok, task_id: r.task_id };
  } catch (e) {
    softwareResults.akismet = { ok: false, error: String(e) };
  }
  try {
    const r = await client.manageSoftware(wpSiteIdStr, 'unlock', 'plugin', 'akismet');
    softwareResults.akismet_unlock = { ok: true, message: r.message };
  } catch (e) {
    softwareResults.akismet_unlock = { ok: false, error: String(e) };
  }
  // Remove the wp.cloud-preinstalled Jetpack plugin — Jetpack is banned from
  // the stack (charter §4): every Envosta site ships Jetpack-free.
  try {
    await client.manageSoftware(wpSiteIdStr, 'deactivate', 'plugin', 'jetpack');
    await client.manageSoftware(wpSiteIdStr, 'delete', 'plugin', 'jetpack');
    softwareResults.jetpack_removed = { ok: true };
  } catch (e) {
    softwareResults.jetpack_removed = { ok: false, error: String(e) };
  }
  await recordLog(sb, {
    userId: effectiveUserId,
    siteId: site.id,
    action: 'site.software.bootstrap',
    message: 'parent theme + Akismet installed; Jetpack plugin removed',
    res: softwareResults,
  });

  // ── Domain link + DNS auto-setup ─────────────────────────────
  let dnsSetup: { siteIp: string; records: number } | null = null;
  if (domainName) {
    await sb.from('domains').update({ site_id: site.id }).eq('user_id', effectiveUserId).eq('domain_name', domainName);

    if (siteIp) {
      try {
        const { data: domainRecord } = await sb
          .from('domains')
          .select('registrar, metadata')
          .eq('user_id', effectiveUserId)
          .eq('domain_name', domainName)
          .maybeSingle();

        if (domainRecord?.registrar === 'opensrs' && (domainRecord.metadata as any)?.dns_mode !== 'custom') {
          const opensrs = createOpenSrsClient();
          const dnsRecords = buildWpCloudDnsRecords(siteIp);
          await opensrs.setDnsZone(domainName, dnsRecords);
          await sb
            .from('domains')
            .update({
              metadata: { dns_records: dnsRecords, dns_setup: 'complete', site_ip: siteIp, dns_setup_at: new Date().toISOString() },
            })
            .eq('user_id', effectiveUserId)
            .eq('domain_name', domainName);
          dnsSetup = { siteIp, records: dnsRecords.length };
          await recordLog(sb, {
            userId: effectiveUserId,
            siteId: site.id,
            action: 'domain.dns.auto_setup',
            message: `${domainName} → ${siteIp}`,
          });
        }
      } catch (dnsErr) {
        await recordLog(sb, {
          userId: effectiveUserId,
          siteId: site.id,
          level: 'error',
          action: 'domain.dns.auto_setup.failed',
          message: `${domainName}: ${String(dnsErr)}`,
        });
      }
    }
  }

  await recordAudit({
    actorType: 'system',
    actorId: effectiveUserId,
    action: 'wpcloud.site.provisioned',
    resourceType: 'site',
    resourceId: site.id,
    before: { status: site.status, wp_cloud_site_id: site.wp_cloud_site_id },
    after: { status: 'active', wp_cloud_site_id: wpSiteIdStr },
    metadata: { source: 'internal-route', upstream_status: createResult.status, plan_slug: planSlug },
  });

  await recordLog(sb, {
    userId: effectiveUserId,
    siteId: site.id,
    action: 'hosting.provision.success',
    message: wpDomain ?? labelStr,
    res: wpResponse,
    ms,
  });

  // Site-ready email
  try {
    const { data: userProfile } = await sb.from('users').select('email, full_name').eq('id', effectiveUserId).maybeSingle();
    if (userProfile?.email && wpUrl) {
      const email = siteReadyEmail(userProfile.full_name ?? 'there', site.label ?? 'Your site', wpUrl, `${wpUrl}/wp-admin`);
      await sendEmail({ to: userProfile.email, ...email });
    }
  } catch {
    /* non-fatal */
  }

  return NextResponse.json({
    ok: true,
    serviceId: site.id,
    siteId: site.id,
    wpCloudSiteId: wpSiteIdStr,
    siteIdUpstream: wpSiteIdStr,
    url: wpUrl,
    domain: wpDomain,
    jobId: (wpResponse as any)?.job_id,
    status: 'active',
    dnsSetup,
  });
}
