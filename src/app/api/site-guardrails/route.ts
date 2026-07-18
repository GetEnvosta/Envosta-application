import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/services/auth';
import { createClient as createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get('siteId');
  if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

  const supabase = await createServerClient();

  const { data: site } = await supabase
    .from('sites')
    .select('id, product_id, max_php_workers, max_ssd_gb, bursting_enabled, config')
    .eq('id', siteId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  const config = (site.config as any) ?? {};

  return NextResponse.json({
    product_id: site.product_id,
    php_workers: config.php_workers ?? 2,
    ssd_gb: config.storage_gb ?? 25,
    bursting_enabled: site.bursting_enabled ?? false,
  });
}

export async function PUT(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { siteId, php_workers, ssd_gb, bursting_enabled } = body;
  if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

  const supabase = await createServerClient();

  // Get current site WITH its plan metadata so we can clamp incoming
  // values to what the plan actually allows. Without this clamp, an
  // authenticated customer could PUT { php_workers: 999 } and we'd
  // happily push it to wp.cloud — a silent plan-cap bypass.
  const { data: site } = await supabase
    .from('sites')
    .select('id, wp_cloud_site_id, config, max_php_workers, max_ssd_gb, bursting_enabled, product_id, products:product_id(metadata)')
    .eq('id', siteId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  const currentConfig = (site.config as any) ?? {};
  const oldWorkers = currentConfig.php_workers ?? 2;
  const oldStorage = currentConfig.storage_gb ?? 25;
  const oldBursting = site.bursting_enabled ?? false;

  // ── Clamp incoming values to the plan's ceiling ─────────────
  const planMeta = ((site as any).products?.metadata ?? {}) as Record<string, any>;
  const planMaxWorkers = Number(planMeta.php_workers_included ?? planMeta.php_workers_default ?? 3);
  const planMaxStorage = Number(planMeta.storage_gb ?? 50);
  // Bursting is the PAID wp.cloud option (+$250/mo per site). Never auto-grant
  // it from plan metadata (e.g. auto_scaling) — that would let a customer
  // self-enable a $250 charge for free. It's enabled only by an admin.
  const planAllowsBursting = planMeta.bursting_enabled === true;

  const reqWorkers = php_workers != null ? Number(php_workers) : oldWorkers;
  const reqStorage = ssd_gb != null ? Number(ssd_gb) : oldStorage;
  const reqBursting = bursting_enabled != null ? Boolean(bursting_enabled) : oldBursting;

  if (!Number.isFinite(reqWorkers) || reqWorkers < 1 || reqWorkers > planMaxWorkers) {
    return NextResponse.json(
      { error: `php_workers must be between 1 and ${planMaxWorkers} for your plan.` },
      { status: 400 },
    );
  }
  if (!Number.isFinite(reqStorage) || reqStorage < 1 || reqStorage > planMaxStorage) {
    return NextResponse.json(
      { error: `ssd_gb must be between 1 and ${planMaxStorage} for your plan.` },
      { status: 400 },
    );
  }
  if (reqBursting && !planAllowsBursting) {
    return NextResponse.json(
      { error: 'Bursting is not available on your plan. Upgrade or add the Bursting add-on.' },
      { status: 400 },
    );
  }

  const newWorkers = reqWorkers;
  const newStorage = reqStorage;
  const newBursting = reqBursting;

  // Update the sites row: config JSONB + guardrail columns
  const newConfig = {
    ...currentConfig,
    php_workers: newWorkers,
    storage_gb: newStorage,
  };

  await supabase
    .from('sites')
    .update({
      config: newConfig,
      max_php_workers: php_workers ?? site.max_php_workers,
      max_ssd_gb: ssd_gb ?? site.max_ssd_gb,
      bursting_enabled: newBursting,
      updated_at: new Date().toISOString(),
    })
    .eq('id', siteId);

  // Push changes to wp.cloud via the Vercel internal route.
  if (site.wp_cloud_site_id) {
    const origin = process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
      : new URL(req.url).origin;

    const wpUpdates: { key: string; value: number | string }[] = [];

    if (newWorkers !== oldWorkers) {
      wpUpdates.push({ key: 'default_php_conns', value: newWorkers });
    }
    if (newBursting !== oldBursting) {
      wpUpdates.push({ key: 'burst_php_conns', value: newBursting ? newWorkers * 2 : 0 });
    }

    for (const update of wpUpdates) {
      try {
        await fetch(`${origin}/api/internal/wpcloud/site-info`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Token': process.env.INTERNAL_API_TOKEN ?? '',
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
  }

  return NextResponse.json({
    php_workers: newWorkers,
    ssd_gb: newStorage,
    max_php_workers: php_workers ?? site.max_php_workers,
    max_ssd_gb: ssd_gb ?? site.max_ssd_gb,
    bursting_enabled: newBursting,
  });
}
