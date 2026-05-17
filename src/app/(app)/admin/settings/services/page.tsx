export const revalidate = 5;

/**
 * Settings → Services.
 *
 * One-time services Envosta sells (migrations, Studio design packages,
 * custom development blocks, etc.). type = 'one_time_service'.
 *
 * Inline-editable CAD pricing via the shared ProductsTable +
 * /api/admin/products/[id]/update-pricing. Yearly column is hidden
 * since one-time services don't have an annual rate.
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

export default async function ServicesSettingsPage() {
  const sb = getSupabase();
  const { data: rows } = await sb
    .from('products')
    .select('id, name, slug, price_cad, price_yearly_cad, billing, is_active, stripe_product_id, stripe_price_id')
    .eq('type', 'one_time_service')
    .order('sort_order', { ascending: true });

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900">Services</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          One-time services — site migrations, Studio packages, custom dev work.
          Billed once, not recurring.
        </p>
      </div>

      <ProductsTable
        rows={(rows ?? []) as any[]}
        emptyLabel="No services yet. Click + New Service to create one."
        newHref="/admin/settings/plans/new?type=one_time_service"
        newLabel="New Service"
        showYearly={false}
      />
    </div>
  );
}
