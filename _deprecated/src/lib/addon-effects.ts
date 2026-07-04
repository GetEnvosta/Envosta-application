/**
 * Apply / revert site-addon resource effects to wp.cloud + DB.
 *
 * Addons can declaratively override site resources via their
 * `products.metadata.effects` JSONB. Example:
 *
 *   { effects: { php_workers: 4 } }
 *
 * This module computes the EFFECTIVE site config as the max() of the
 * plan defaults and every active addon's effects, then pushes that to
 * wp.cloud and updates the local `sites` row. It is the single source
 * of truth for "what resources should this site have right now."
 *
 * Called by:
 *   - /api/account/addons/add    after the Stripe item update succeeds
 *   - /api/account/addons/remove after the Stripe item update succeeds
 *   - workflows/update-site-plan after the plan change (so addons that
 *     bump on top of the new plan recompute correctly)
 *
 * Semantics:
 *   Numeric effects use Math.max() — addons never DOWNGRADE the site.
 *   Boolean effects OR — any addon turning a feature on wins.
 *
 *   Removing the last addon contributing an effect causes the field
 *   to fall back to the plan default (or the global fallback if the
 *   plan doesn't specify one).
 *
 * Failure handling:
 *   wp.cloud call failures are caught + logged to audit_log. The DB
 *   may be ahead of wp.cloud state until the next reconcile-wpcloud
 *   cron run catches the drift. We DO NOT throw — callers (add/remove
 *   routes) have already committed Stripe + DB state and shouldn't
 *   unwind on a transient wp.cloud hiccup.
 */
import { createClient } from '@supabase/supabase-js';
import { createWpCloudClient } from '@/lib/integrations/wpcloud';
import { recordAudit } from '@/lib/audit';

/**
 * Declarative effects an addon can apply. Extend this shape as new
 * resource fields become addon-controllable.
 */
export interface AddonEffects {
  /** Steady-state PHP workers (default_php_conns). Plan default if absent. */
  php_workers?: number;
  /** Burst PHP workers (burst_php_conns). Computed from php_workers ×2 if absent. */
  burst_php_workers?: number;
  /** PHP memory limit in MB. Plan default if absent. */
  php_memory_mb?: number;
  /** Bursting enabled flag. Plan default if absent. */
  bursting_enabled?: boolean;
  /** Jetpack backup flag (wp.cloud site-meta `jetpack_backup`). */
  jetpack_backup_enabled?: boolean;
  /** Jetpack CDN / page-optimize flag (wp.cloud site-meta `page_optimize`). */
  jetpack_cdn_enabled?: boolean;
  /** Jetpack WAF flag (wp.cloud site-meta `jetpack_waf`). */
  jetpack_waf_enabled?: boolean;
}

/**
 * Effective site config — the materialized result of plan defaults +
 * all active addons' effects.
 */
export interface EffectiveSiteConfig {
  php_workers: number;
  burst_php_workers: number;
  php_memory_mb: number;
  bursting_enabled: boolean;
  jetpack_backup_enabled: boolean;
  jetpack_cdn_enabled: boolean;
  jetpack_waf_enabled: boolean;
}

const FALLBACK: EffectiveSiteConfig = {
  php_workers: 2,
  burst_php_workers: 4,
  php_memory_mb: 512,
  bursting_enabled: false,
  jetpack_backup_enabled: false,
  jetpack_cdn_enabled: false,
  jetpack_waf_enabled: false,
};

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}

/**
 * Compute the effective config for a site = plan defaults overlaid with
 * the MAX of all currently-active addon effects. Pure function-ish:
 * reads the DB but never writes.
 */
export async function computeEffectiveSiteConfig(siteId: string): Promise<EffectiveSiteConfig> {
  const sb = svc();

  // Load site + its hosting plan defaults.
  const { data: site } = await sb
    .from('sites')
    .select('id, product_id, products:product_id(metadata)')
    .eq('id', siteId)
    .maybeSingle();

  const planMeta = ((site as any)?.products?.metadata ?? {}) as Record<string, unknown>;
  const planResources = (planMeta.resources ?? {}) as Record<string, unknown>;

  // Plan defaults (with global fallback when plan doesn't specify).
  const planPhpWorkers = num(planMeta.php_workers_default) ?? num(planResources.php_workers) ?? FALLBACK.php_workers;
  const planPhpMemory = num(planMeta.php_memory_default) ?? num(planResources.php_memory_mb) ?? FALLBACK.php_memory_mb;
  const planBursting = bool(planMeta.bursting_enabled) ?? bool(planResources.bursting_enabled) ?? FALLBACK.bursting_enabled;
  // Existing plan-level Jetpack feature flags (has_backups / has_cdn / has_waf).
  const planJetpackBackup = bool(planMeta.has_backups) ?? FALLBACK.jetpack_backup_enabled;
  const planJetpackCdn = bool(planMeta.has_cdn) ?? FALLBACK.jetpack_cdn_enabled;
  const planJetpackWaf = bool(planMeta.has_waf) ?? FALLBACK.jetpack_waf_enabled;

  // Load all ACTIVE addons on this site + their effects.
  const { data: activeAddons } = await sb
    .from('site_addons')
    .select('product_id, products:product_id(metadata)')
    .eq('site_id', siteId)
    .eq('status', 'active');

  // Start from plan defaults, then max() each active addon's effects.
  let phpWorkers = planPhpWorkers;
  let phpMemory = planPhpMemory;
  let bursting = planBursting;
  let jpBackup = planJetpackBackup;
  let jpCdn = planJetpackCdn;
  let jpWaf = planJetpackWaf;

  for (const row of (activeAddons ?? [])) {
    const meta = ((row as any).products?.metadata ?? {}) as Record<string, unknown>;
    const effects = (meta.effects ?? {}) as AddonEffects;
    if (effects.php_workers && effects.php_workers > phpWorkers) phpWorkers = effects.php_workers;
    if (effects.php_memory_mb && effects.php_memory_mb > phpMemory) phpMemory = effects.php_memory_mb;
    if (effects.bursting_enabled === true) bursting = true;
    if (effects.jetpack_backup_enabled === true) jpBackup = true;
    if (effects.jetpack_cdn_enabled === true) jpCdn = true;
    if (effects.jetpack_waf_enabled === true) jpWaf = true;
  }

  // burst_php_workers: explicit addon override > computed (php_workers ×2 if bursting)
  let burstPhpWorkers = bursting ? phpWorkers * 2 : 0;
  for (const row of (activeAddons ?? [])) {
    const meta = ((row as any).products?.metadata ?? {}) as Record<string, unknown>;
    const effects = (meta.effects ?? {}) as AddonEffects;
    if (effects.burst_php_workers && effects.burst_php_workers > burstPhpWorkers) {
      burstPhpWorkers = effects.burst_php_workers;
    }
  }

  return {
    php_workers: phpWorkers,
    burst_php_workers: burstPhpWorkers,
    php_memory_mb: phpMemory,
    bursting_enabled: bursting,
    jetpack_backup_enabled: jpBackup,
    jetpack_cdn_enabled: jpCdn,
    jetpack_waf_enabled: jpWaf,
  };
}

/**
 * Recompute + push the effective config to wp.cloud and update the
 * local sites row. Safe to call after EVERY add/remove/plan-change —
 * it's idempotent (no-op if computed config matches current state).
 *
 * Returns the applied config. Never throws on upstream failure —
 * failures are audited.
 */
export async function applySiteAddonEffects(siteId: string, actorId?: string): Promise<EffectiveSiteConfig | null> {
  const sb = svc();

  // Load site for wp_cloud_site_id + current config (so we can diff).
  const { data: site } = await sb
    .from('sites')
    .select('id, wp_cloud_site_id, config, max_php_workers')
    .eq('id', siteId)
    .maybeSingle();

  if (!site) {
    await recordAudit({
      actorId,
      actorType: actorId ? 'user' : 'system',
      action: 'site.addon_effects.skipped',
      resourceType: 'site',
      resourceId: siteId,
      metadata: { reason: 'site_not_found' },
    });
    return null;
  }
  if (!site.wp_cloud_site_id) {
    // Site not yet provisioned — provision-site reads from products.metadata
    // and applies addon effects at creation time via this same helper.
    await recordAudit({
      actorId,
      actorType: actorId ? 'user' : 'system',
      action: 'site.addon_effects.deferred',
      resourceType: 'site',
      resourceId: siteId,
      metadata: { reason: 'not_yet_provisioned' },
    });
    return null;
  }

  const computed = await computeEffectiveSiteConfig(siteId);

  // No-op if nothing changed (saves a round trip to wp.cloud).
  const currentConfig = ((site.config as any) ?? {}) as Record<string, unknown>;
  const noChange =
    num(currentConfig.php_workers) === computed.php_workers &&
    num(currentConfig.php_memory_mb) === computed.php_memory_mb &&
    bool(currentConfig.bursting_enabled) === computed.bursting_enabled &&
    bool(currentConfig.jetpack_backup_enabled) === computed.jetpack_backup_enabled &&
    bool(currentConfig.jetpack_cdn_enabled) === computed.jetpack_cdn_enabled &&
    bool(currentConfig.jetpack_waf_enabled) === computed.jetpack_waf_enabled;

  if (noChange) return computed;

  // Push to wp.cloud. Each setMeta is a separate HTTP call — we serialize
  // for safety. If any fails, the rest skip and we audit.
  try {
    const client = createWpCloudClient();
    await client.updateSiteMeta(site.wp_cloud_site_id, 'default_php_conns', String(computed.php_workers));
    await client.updateSiteMeta(site.wp_cloud_site_id, 'burst_php_conns', String(computed.burst_php_workers));
    await client.updateSiteMeta(site.wp_cloud_site_id, 'php_memory_limit', String(computed.php_memory_mb));
    // Jetpack platform-feature toggles (wp.cloud handles these natively,
    // no Jetpack plugin install required).
    await client.updateSiteMeta(site.wp_cloud_site_id, 'jetpack_backup', computed.jetpack_backup_enabled ? '1' : '0');
    await client.updateSiteMeta(site.wp_cloud_site_id, 'page_optimize',  computed.jetpack_cdn_enabled    ? '1' : '0');
    await client.updateSiteMeta(site.wp_cloud_site_id, 'jetpack_waf',    computed.jetpack_waf_enabled    ? '1' : '0');
  } catch (e: any) {
    await recordAudit({
      actorId,
      actorType: actorId ? 'user' : 'system',
      action: 'site.addon_effects.upstream_failed',
      resourceType: 'site',
      resourceId: siteId,
      before: currentConfig,
      after: computed as any,
      metadata: { error: e?.message ?? String(e) },
    });
    // Don't throw — reconcile-wpcloud will catch the drift and surface it.
    return null;
  }

  // Update local DB to reflect what we just pushed upstream.
  await sb
    .from('sites')
    .update({
      config: {
        ...currentConfig,
        php_workers: computed.php_workers,
        burst_php_workers: computed.burst_php_workers,
        php_memory_mb: computed.php_memory_mb,
        bursting_enabled: computed.bursting_enabled,
        jetpack_backup_enabled: computed.jetpack_backup_enabled,
        jetpack_cdn_enabled: computed.jetpack_cdn_enabled,
        jetpack_waf_enabled: computed.jetpack_waf_enabled,
      },
      max_php_workers: computed.php_workers,
    })
    .eq('id', siteId);

  await recordAudit({
    actorId,
    actorType: actorId ? 'user' : 'system',
    action: 'site.addon_effects.applied',
    resourceType: 'site',
    resourceId: siteId,
    before: currentConfig,
    after: computed as any,
  });

  return computed;
}

// ─── Tiny helpers ────────────────────────────────────────────────────
function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}
function bool(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v === 'true';
  return undefined;
}
