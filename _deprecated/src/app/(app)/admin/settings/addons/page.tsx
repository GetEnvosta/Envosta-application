export const revalidate = 5;

/**
 * Settings → Add-ons.
 *
 * Per-site recurring add-ons (bursting, WAF, premium SSL, etc.) that
 * customers can buy on top of their hosting plan. type = 'plan_addon'.
 *
 * Inline-editable monthly + yearly CAD pricing via the shared
 * ProductsTable + /api/admin/products/[id]/update-pricing.
 */
import { createClient } from '@supabase/supabase-js';
import { ProductsTable } from '../products-table';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}

export default async function AddonsSettingsPage() {
  const sb = getSupabase();
  const { data: rows } = await sb
    .from('products')
    .select('id, name, slug, price_cad, price_yearly_cad, billing, is_active, stripe_product_id, stripe_price_id')
    .eq('type', 'plan_addon')
    .order('sort_order', { ascending: true });

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900">Add-ons</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Recurring extras customers can attach to their hosting plan — bursting capacity,
          premium WAF rules, dedicated SSL, that kind of thing.
        </p>
      </div>

      <ProductsTable
        rows={(rows ?? []) as any[]}
        emptyLabel="No add-ons yet. Click + New Add-on to create one."
        newHref="/admin/settings/plans/new?type=plan_addon"
        newLabel="New Add-on"
        showYearly
      />
    </div>
  );
}
