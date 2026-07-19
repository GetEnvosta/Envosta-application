import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * GET — Returns the PUBLIC sellable hosting plans with their resource
 * configs (customer-facing plan selectors). Minimum (hidden internal) and
 * Enterprise (sales-only) never appear here; admin tools query products
 * directly. Prices are USD — the currency every charge actually uses.
 */
export async function GET() {
  const supabase = await createClient();

  const { data: products } = await supabase
    .from('products')
    .select('id, slug, name, price_usd, metadata')
    .eq('type', 'hosting_plan')
    .eq('is_active', true)
    .not('slug', 'in', '("minimum","enterprise")')
    .order('price_usd', { ascending: true });

  const plans = (products ?? []).map((p: any) => {
    const meta = (p.metadata as any) ?? {};
    return {
      slug: p.slug,
      name: p.name,
      price: p.price_usd ? p.price_usd / 100 : 0,
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
