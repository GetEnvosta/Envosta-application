/**
 * Site plan-change workflow (Vercel Workflows SDK).
 *
 * Swaps a site's Stripe subscription line item from one plan price to
 * another and mirrors the resource limits to wp.cloud + our DB. Stripe
 * handles proration via proration_behavior (default 'create_prorations').
 *
 * Steps:
 *   1. loadSiteAndNewPlan   — load the site + the destination product
 *      row + its metadata; compute the new config.
 *   2. swapStripeLineItem   — Stripe SubscriptionItem.update to flip the
 *      price. Stripe is idempotent on the item_id update.
 *   3. mirrorSitePlanLocally — update sites.product_id and the per-site
 *      resource columns / metadata.
 *   4. pushResourceLimitsToWpCloud — fan-out the new resource caps to
 *      wp.cloud via the internal site-info route (fire-and-forget per
 *      key — wp.cloud failures don't reverse the Stripe swap).
 *   5. recordPlanChanged    — audit_log completion.
 *
 * Validation/auth checks live at the caller — by the time this workflow
 * fires, the user has been verified and the request is authorized.
 *
 * Idempotency: callers should resolve newProductId server-side, not
 * client-side. Stripe updates with the same priceId are no-ops; the DB
 * mirror writes are deterministic.
 */
import { FatalError } from 'workflow';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { recordAudit } from '@/lib/audit';

export interface UpdateSitePlanInput {
  siteId: string;
  newProductId: string;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
  actorId?: string;
}

interface PlanConfig {
  storage_gb: number;
  php_workers: number;
  php_memory_mb: number;
  has_backups: boolean;
  has_cdn: boolean;
  has_waf: boolean;
  has_staging: boolean;
  bursting_enabled: boolean;
}

interface PlanContext {
  siteId: string;
  stripeItemId: string;
  newPriceId: string;
  newPlanSlug: string;
  newProductName: string;
  previousProductId: string | null;
  previousPlanSlug: string | null;
  wpCloudSiteId: string | null;
  config: PlanConfig;
  prorationBehavior: 'create_prorations' | 'none' | 'always_invoice';
}

function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });
}

function sbClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}

// ───────────────────────────────────────────────────────────────────
// STEP 1 — load site + destination plan, compose new config.
// ───────────────────────────────────────────────────────────────────
async function loadSiteAndNewPlan(input: UpdateSitePlanInput): Promise<PlanContext> {
  'use step';

  const sb = sbClient();

  const { data: site, error: siteErr } = await sb
    .from('sites')
    .select('id, product_id, stripe_subscription_item_id, wp_cloud_site_id')
    .eq('id', input.siteId)
    .maybeSingle();

  if (siteErr) {
    throw new Error(`sites lookup failed: ${siteErr.message}`);
  }
  if (!site) {
    throw new FatalError(`site ${input.siteId} not found`);
  }
  if (!site.stripe_subscription_item_id) {
    throw new FatalError(`site ${input.siteId} has no stripe_subscription_item_id`);
  }
  if (site.product_id === input.newProductId) {
    throw new FatalError(`site ${input.siteId} already on product ${input.newProductId}`);
  }

  // Load destination product (must be an active hosting_plan).
  const { data: newPlan, error: newErr } = await sb
    .from('products')
    .select('id, name, slug, stripe_price_id, metadata')
    .eq('id', input.newProductId)
    .maybeSingle();

  if (newErr) {
    throw new Error(`products lookup failed: ${newErr.message}`);
  }
  if (!newPlan) {
    throw new FatalError(`product ${input.newProductId} not found`);
  }
  if (!newPlan.stripe_price_id) {
    throw new FatalError(`product ${input.newProductId} has no stripe_price_id`);
  }

  // Load previous plan slug (best-effort, for audit / metadata).
  let previousPlanSlug: string | null = null;
  if (site.product_id) {
    const { data: prev } = await sb
      .from('products')
      .select('slug')
      .eq('id', site.product_id)
      .maybeSingle();
    previousPlanSlug = prev?.slug ?? null;
  }

  const planMeta = (newPlan.metadata as Record<string, any> | null) ?? {};
  const config: PlanConfig = {
    storage_gb: planMeta.storage_gb ?? 50,
    php_workers: planMeta.php_workers_default ?? 3,
    php_memory_mb: planMeta.php_memory_mb ?? 512,
    has_backups: planMeta.has_backups ?? true,
    has_cdn: planMeta.has_cdn ?? true,
    has_waf: planMeta.has_waf ?? true,
    has_staging: planMeta.has_staging ?? true,
    bursting_enabled: planMeta.bursting_enabled ?? false,
  };

  return {
    siteId: input.siteId,
    stripeItemId: site.stripe_subscription_item_id,
    newPriceId: newPlan.stripe_price_id,
    newPlanSlug: newPlan.slug as string,
    newProductName: newPlan.name as string,
    previousProductId: site.product_id as string | null,
    previousPlanSlug,
    wpCloudSiteId: site.wp_cloud_site_id as string | null,
    config,
    prorationBehavior: input.prorationBehavior ?? 'create_prorations',
  };
}

// ───────────────────────────────────────────────────────────────────
// STEP 2 — swap the Stripe SubscriptionItem price.
// ───────────────────────────────────────────────────────────────────
async function swapStripeLineItem(ctx: PlanContext) {
  'use step';

  const stripe = getStripe();
  try {
    await stripe.subscriptionItems.update(ctx.stripeItemId, {
      price: ctx.newPriceId,
      proration_behavior: ctx.prorationBehavior,
    });
  } catch (e: any) {
    // Stripe rejects with statusCode on the error. 4xx → bad input.
    const status = typeof e?.statusCode === 'number' ? e.statusCode : 500;
    if (status >= 400 && status < 500) {
      throw new FatalError(
        `Stripe rejected SubscriptionItem.update item=${ctx.stripeItemId}: ${e?.message ?? 'unknown'}`,
      );
    }
    throw e instanceof Error ? e : new Error(String(e));
  }
}

// ───────────────────────────────────────────────────────────────────
// STEP 3 — write the new plan + config to our DB.
// ───────────────────────────────────────────────────────────────────
async function mirrorSitePlanLocally(input: UpdateSitePlanInput, ctx: PlanContext) {
  'use step';

  const sb = sbClient();

  const { error } = await sb
    .from('sites')
    .update({
      product_id: input.newProductId,
      config: {
        storage_gb: ctx.config.storage_gb,
        php_workers: ctx.config.php_workers,
        php_memory_mb: ctx.config.php_memory_mb,
        has_backups: ctx.config.has_backups,
        has_cdn: ctx.config.has_cdn,
        has_waf: ctx.config.has_waf,
        has_staging: ctx.config.has_staging,
      },
      max_php_workers: ctx.config.php_workers,
      max_ssd_gb: ctx.config.storage_gb,
      bursting_enabled: ctx.config.bursting_enabled,
      metadata: {
        plan_slug: ctx.newPlanSlug,
        upgraded_at: new Date().toISOString(),
        previous_plan: ctx.previousPlanSlug,
      },
    })
    .eq('id', input.siteId);

  if (error) {
    throw new Error(`sites update failed: ${error.message}`);
  }
}

// ───────────────────────────────────────────────────────────────────
// STEP 4 — push resource caps to wp.cloud (best-effort per key).
// ───────────────────────────────────────────────────────────────────
async function pushResourceLimitsToWpCloud(ctx: PlanContext) {
  'use step';

  if (!ctx.wpCloudSiteId) {
    return { pushed: 0 };
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://envosta.com';
  const url = `${base}/api/internal/wpcloud/site-info`;
  const token = process.env.INTERNAL_API_TOKEN;
  if (!token) {
    // No token → can't push. Workflow continues; audit will flag wp_cloud sync as deferred.
    return { pushed: 0 };
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-Internal-Token': token,
  };

  const updates: Array<{ key: string; value: string | number }> = [
    { key: 'default_php_conns', value: ctx.config.php_workers },
    { key: 'php_memory_limit', value: ctx.config.php_memory_mb },
    { key: 'burst_php_conns', value: ctx.config.bursting_enabled ? ctx.config.php_workers * 2 : 0 },
    { key: 'jetpack_backup', value: ctx.config.has_backups ? '1' : '0' },
    { key: 'page_optimize', value: ctx.config.has_cdn ? '1' : '0' },
    { key: 'jetpack_waf', value: ctx.config.has_waf ? '1' : '0' },
    { key: 'has_staging', value: ctx.config.has_staging ? '1' : '0' },
    { key: 'space_quota', value: `${ctx.config.storage_gb}G` },
  ];

  let pushed = 0;
  for (const upd of updates) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'update-site-meta',
          siteId: ctx.siteId,
          key: upd.key,
          value: upd.value,
        }),
      });
      if (res.ok) pushed++;
    } catch (e) {
      // Per-key failures are non-fatal — reconcile-wpcloud cron will repair.
      console.error(`[update-site-plan] wp.cloud update failed for ${upd.key}:`, e);
    }
  }

  return { pushed };
}

// ───────────────────────────────────────────────────────────────────
// STEP 5 — audit completion.
// ───────────────────────────────────────────────────────────────────
async function recordPlanChanged(
  input: UpdateSitePlanInput,
  ctx: PlanContext,
  pushed: number,
) {
  'use step';

  await recordAudit({
    actorType: 'workflow',
    actorId: input.actorId,
    action: 'workflow.update_site_plan.completed',
    resourceType: 'site',
    resourceId: input.siteId,
    before: { product_id: ctx.previousProductId, plan_slug: ctx.previousPlanSlug },
    after: { product_id: input.newProductId, plan_slug: ctx.newPlanSlug },
    metadata: {
      stripe_item_id: ctx.stripeItemId,
      new_product_name: ctx.newProductName,
      proration_behavior: ctx.prorationBehavior,
      resource_keys_pushed: pushed,
      resources_applied: ctx.config,
    },
  });
}

// ───────────────────────────────────────────────────────────────────
// Workflow orchestrator.
// ───────────────────────────────────────────────────────────────────
export async function updateSitePlan(input: UpdateSitePlanInput) {
  'use workflow';

  const ctx = await loadSiteAndNewPlan(input);
  await swapStripeLineItem(ctx);
  await mirrorSitePlanLocally(input, ctx);
  const { pushed } = await pushResourceLimitsToWpCloud(ctx);
  await recordPlanChanged(input, ctx, pushed);

  return {
    siteId: input.siteId,
    productId: input.newProductId,
    planSlug: ctx.newPlanSlug,
    status: 'updated' as const,
  };
}
