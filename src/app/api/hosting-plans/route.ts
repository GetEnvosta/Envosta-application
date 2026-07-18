import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * GET — Returns all active hosting plan tiers with their resource configs.
 * Used by the site plan selector to show available plans and features.
 */
export async function GET() {
  const supabase = await createClient();

  const { data: products } = await supabase
    .from('products')
    .select('id, slug, name, price_cad, metadata')
    .eq('type', 'hosting_plan')
    .eq('is_active', true)
    .order('price_cad', { ascending: true });

  const plans = (products ?? []).map((p: any) => {
    const meta = (p.metadata as any) ?? {};
    return {
      slug: p.slug,
      name: p.name,
      price: p.price_cad ? p.price_cad / 100 : 0,
      productId: p.id,
      features: {
        storage_gb: meta.storage_gb ?? 50,
        php_workers: meta.php_workers_default ?? 3,
        php_memory_mb: meta.php_memory_mb ?? 512,
        has_backups: meta.has_backups ?? true,
        has_cdn: meta.has_cdn ?? true,
        has_waf: meta.has_waf ?? true,
        has_staging: meta.has_staging ?? false,
        bursting_enabled: meta.bursting_enabled ?? false,
      },
    };
  });

  return NextResponse.json({ plans });
}
