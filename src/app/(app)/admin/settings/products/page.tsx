export const revalidate = 5;

import Link from 'next/link';
import { CheckCircle, AlertTriangle, Pencil } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { formatCents } from '@/lib/utils';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}

const TYPE_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  plan_addon: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Add-on' },
  one_time_service: { bg: 'bg-cyan-50', text: 'text-cyan-700', label: 'Service' },
};

export default async function AddonsAndServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const sb = getSupabase();

  const { data: rows } = await sb
    .from('products')
    .select('*')
    .in('type', ['plan_addon', 'one_time_service'])
    .order('type')
    .order('sort_order', { ascending: true });

  const all = rows ?? [];
  const counts = {
    plan_addon: all.filter(p => p.type === 'plan_addon').length,
    one_time_service: all.filter(p => p.type === 'one_time_service').length,
  };
  const activeType: 'all' | 'plan_addon' | 'one_time_service' =
    type === 'plan_addon' || type === 'one_time_service' ? type : 'all';
  const filtered = activeType === 'all' ? all : all.filter(p => p.type === activeType);

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900">Add-ons & Services</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Per-site recurring add-ons and one-time services (migrations, studio packages, etc).
          Add or remove via the action menu on the legacy products page.
        </p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { key: 'all',              label: `All (${all.length})` },
          { key: 'plan_addon',       label: `Add-ons (${counts.plan_addon})` },
          { key: 'one_time_service', label: `One-time Services (${counts.one_time_service})` },
        ].map(tab => (
          <Link
            key={tab.key}
            href={tab.key === 'all' ? '/admin/settings/products' : `/admin/settings/products?type=${tab.key}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeType === tab.key
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price (CAD)</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billing</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stripe</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-sm text-gray-400">No products in this category.</td></tr>
            ) : filtered.map((product: any) => {
              const badge = TYPE_BADGES[product.type] ?? { bg: 'bg-gray-50', text: 'text-gray-700', label: product.type };
              return (
                <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{product.slug}</p>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-gray-700">
                    {product.price_cad > 0 ? formatCents(product.price_cad, 'cad') : <span className="text-gray-300">—</span>}
                    {product.price_yearly_cad > 0 && product.billing === 'monthly' && (
                      <span className="text-xs text-gray-400 ml-1">/ {formatCents(product.price_yearly_cad, 'cad')}/yr</span>
                    )}
                  </td>
                  <td className="px-3 py-3.5 text-gray-500 capitalize text-xs">{product.billing?.replace('_', ' ')}</td>
                  <td className="px-3 py-3.5">
                    <span className={product.is_active ? 'badge-green' : 'badge-gray'}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    {product.stripe_product_id
                      ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                      : <AlertTriangle className="w-4 h-4 text-amber-400" />}
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <Link
                      href={`/admin/settings/plans/${product.id}`}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" /> Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Add-ons and services share the same deep-edit form as hosting plans. Inline pricing edits aren&apos;t
        wired here yet — open a row to change price, slug, or wp.cloud config.
      </p>
    </div>
  );
}
