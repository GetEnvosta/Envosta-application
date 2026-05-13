import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import Stripe from 'stripe';
import { updateSiteLineItem, resolvePlanPrice } from '@/lib/stripe-subscription';

export const dynamic = 'force-dynamic';

/**
 * POST — Upgrade or downgrade a site's plan tier.
 *
 * Swaps the Stripe subscription line item from one plan price to another.
 * Stripe handles proration automatically (charges/credits the difference).
 *
 * Body: { siteId: string, newPlanSlug: string }
 */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });

  const { siteId, newPlanSlug } = await req.json();
  if (!siteId || !newPlanSlug) {
    return NextResponse.json({ error: 'siteId and newPlanSlug are required' }, { status: 400 });
  }

  // Fetch the site
  const { data: site } = await supabase
    .from('sites')
    .select('id, user_id, product_id, stripe_subscription_item_id, label, status')
    .eq('id', siteId)
    .single();

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  if (site.user_id !== user.id) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  if (!site.stripe_subscription_item_id) {
    return NextResponse.json({ error: 'This site is not linked to a subscription line item. Contact support.' }, { status: 400 });
  }

  // Resolve the new plan
  const newPlan = await resolvePlanPrice(supabase, newPlanSlug);
  if (!newPlan) {
    return NextResponse.json({ error: `Plan "${newPlanSlug}" not found` }, { status: 400 });
  }

  // Check if it's actually a change
  if (site.product_id === newPlan.productId) {
    return NextResponse.json({ error: 'Site is already on this plan' }, { status: 400 });
  }

  // Get the current plan name for logging
  const { data: currentPlan } = await supabase
    .from('products')
    .select('name, slug')
    .eq('id', site.product_id)
    .single();

  // Get the new plan's resource config
  const { data: newPlanProduct } = await supabase
    .from('products')
    .select('metadata')
    .eq('id', newPlan.productId)
    .single();
  const planMeta = (newPlanProduct?.metadata as any) ?? {};

  try {
    // Swap the line item's price in Stripe
    await updateSiteLineItem(stripe, site.stripe_subscription_item_id, newPlan.priceId);

    // Build new resource config from plan metadata
    const newConfig = {
      storage_gb: planMeta.storage_gb ?? 25,
      php_workers: planMeta.php_workers_default ?? 2,
      php_memory_mb: planMeta.php_memory_mb ?? 512,
      has_backups: planMeta.has_backups ?? true,
      has_cdn: planMeta.has_cdn ?? true,
      has_waf: planMeta.has_waf ?? true,
      has_staging: planMeta.has_staging ?? true,
    };

    // Update the site's product_id + config in our DB
    await supabase.from('sites').update({
      product_id: newPlan.productId,
      config: newConfig,
      max_php_workers: newConfig.php_workers,
      max_ssd_gb: newConfig.storage_gb,
      bursting_enabled: planMeta.bursting_enabled ?? false,
      metadata: {
        plan_slug: newPlanSlug,
        upgraded_at: new Date().toISOString(),
        previous_plan: currentPlan?.slug ?? null,
      },
    }).eq('id', siteId);

    // Push resource changes to wp.cloud
    const { data: siteData } = await supabase
      .from('sites')
      .select('wp_cloud_site_id')
      .eq('id', siteId)
      .single();

    if (siteData?.wp_cloud_site_id) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceKey = process.env.SUPABASE_SECRET_KEY!;

      const wpUpdates = [
        { key: 'default_php_conns', value: newConfig.php_workers },
        { key: 'php_memory_limit', value: newConfig.php_memory_mb },
        { key: 'burst_php_conns', value: planMeta.bursting_enabled ? newConfig.php_workers * 2 : 0 },
        { key: 'jetpack_backup', value: newConfig.has_backups ? '1' : '0' },
        { key: 'page_optimize', value: newConfig.has_cdn ? '1' : '0' },
        { key: 'jetpack_waf', value: newConfig.has_waf ? '1' : '0' },
        { key: 'has_staging', value: newConfig.has_staging ? '1' : '0' },
      ];

      for (const update of wpUpdates) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/site-info`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              action: 'update-site-meta',
              siteId,
              key: update.key,
              value: update.value,
            }),
          });
        } catch (e) {
          console.error(`wp.cloud update failed for ${update.key}:`, e);
        }
      }

      // Update storage quota separately (uses space_quota format)
      try {
        await fetch(`${supabaseUrl}/functions/v1/site-info`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            action: 'update-site-meta',
            siteId,
            key: 'space_quota',
            value: `${newConfig.storage_gb}G`,
          }),
        });
      } catch (e) {
        console.error('wp.cloud storage update failed:', e);
      }
    }

    // Log the change
    await supabase.from('logs').insert({
      user_id: user.id,
      site_id: siteId,
      action: 'site.plan_changed',
      details: `${site.label}: ${currentPlan?.name ?? 'Unknown'} → ${newPlan.planName}`,
      level: 'info',
      metadata: {
        from_plan: currentPlan?.slug,
        to_plan: newPlanSlug,
        resources_applied: newConfig,
      },
    });

    return NextResponse.json({
      success: true,
      site: site.label,
      previousPlan: currentPlan?.name,
      newPlan: newPlan.planName,
      resources: newConfig,
      message: `${site.label} upgraded to ${newPlan.planName}. Resources updated and proration applied.`,
    });
  } catch (e: any) {
    console.error('Upgrade error:', e);
    return NextResponse.json({ error: e.message ?? 'Failed to upgrade' }, { status: 500 });
  }
}
