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

  // Get current site with wp_cloud_site_id
  const { data: site } = await supabase
    .from('sites')
    .select('id, wp_cloud_site_id, config, max_php_workers, max_ssd_gb, bursting_enabled')
    .eq('id', siteId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  const currentConfig = (site.config as any) ?? {};
  const oldWorkers = currentConfig.php_workers ?? 2;
  const oldStorage = currentConfig.storage_gb ?? 25;
  const oldBursting = site.bursting_enabled ?? false;

  // Determine new values (use current if not provided)
  const newWorkers = php_workers ?? oldWorkers;
  const newStorage = ssd_gb ?? oldStorage;
  const newBursting = bursting_enabled ?? oldBursting;

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

  // Push changes to wp.cloud via edge function
  if (site.wp_cloud_site_id) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const wpUpdates: { key: string; value: number | string }[] = [];

    if (newWorkers !== oldWorkers) {
      wpUpdates.push({ key: 'default_php_conns', value: newWorkers });
    }
    if (newBursting !== oldBursting) {
      wpUpdates.push({ key: 'burst_php_conns', value: newBursting ? newWorkers * 2 : 0 });
    }

    // Apply each wp.cloud update
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
  }

  return NextResponse.json({
    php_workers: newWorkers,
    ssd_gb: newStorage,
    max_php_workers: php_workers ?? site.max_php_workers,
    max_ssd_gb: ssd_gb ?? site.max_ssd_gb,
    bursting_enabled: newBursting,
  });
}
