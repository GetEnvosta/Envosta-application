export const revalidate = 5;

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { PlansTable } from './plans-table';
import { SyncAllPlansButton } from './sync-all-button';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}

export default async function PlansSettingsPage() {
  const sb = getSupabase();

  const { data: rows } = await sb
    .from('products')
    .select('*')
    .eq('type', 'hosting_plan')
    .order('sort_order', { ascending: true })
    .order('price_cad', { ascending: true });

  const plans = rows ?? [];
  const synced = plans.filter(p => p.stripe_product_id && p.stripe_price_id).length;
  const active = plans.filter(p => p.is_active).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Hosting Plans</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {plans.length} plan{plans.length === 1 ? '' : 's'} · {synced}/{plans.length} synced to Stripe · {active} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SyncAllPlansButton />
          <Link href="/admin/settings/plans/new" className="btn-admin text-sm py-2 px-3.5 inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> New Plan
          </Link>
        </div>
      </div>

      <PlansTable plans={plans as any} />

      <p className="text-xs text-gray-400 mt-4">
        Tip: click a price to edit. Enter saves, Esc cancels. Stripe is not updated automatically —
        use the per-row <span className="font-medium text-gray-600">Sync</span> button after price changes
        (Stripe Prices are immutable, so syncing creates a new Price and deactivates the old one).
      </p>
    </div>
  );
}
