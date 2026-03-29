export const revalidate = 5;
import { formatCents } from '@/lib/utils';
import { CheckCircle, AlertTriangle, Pencil } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { ProductsClient } from './products-client';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const typeFilter = params.type ?? 'hosting_plan';

  const { data: allProducts } = await getSupabase()
    .from('products')
    .select('*')
    .order('type')
    .order('sort_order', { ascending: true });

  const products = allProducts ?? [];

  const counts: Record<string, number> = {
    all: products.length,
    hosting_plan: products.filter(p => p.type === 'hosting_plan').length,
    domain_tld: products.filter(p => p.type === 'domain_tld').length,
    plan_addon: products.filter(p => p.type === 'plan_addon').length,
    one_time_service: products.filter(p => p.type === 'one_time_service').length,
  };

  const filtered = typeFilter === 'all' ? products : products.filter(p => p.type === typeFilter);
  const synced = products.filter(p => p.stripe_product_id && p.stripe_price_id).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {synced}/{products.length} synced to Stripe · {products.filter(p => p.is_active).length} active
          </p>
        </div>
        <ProductsClient />
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'hosting_plan', label: 'Hosting Plans' },
          { key: 'plan_addon', label: 'Plan Add-ons' },
          { key: 'domain_tld', label: 'Domain TLDs' },
          { key: 'one_time_service', label: 'One-Time Services' },
        ].map(tab => (
          <Link
            key={tab.key}
            href={tab.key === 'all' ? '/admin/products' : `/admin/products?type=${tab.key}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              typeFilter === tab.key
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label} <span className="ml-1 opacity-60">{counts[tab.key] ?? 0}</span>
          </Link>
        ))}
      </div>

      {/* Products table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billing</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stripe</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-sm text-gray-400">No products found.</td>
              </tr>
            ) : filtered.map((product: any) => {
              const typeBadge: Record<string, { bg: string; text: string; label: string }> = {
                hosting_plan: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Plan' },
                domain_tld: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Domain' },
                plan_addon: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Add-on' },
                one_time_service: { bg: 'bg-cyan-50', text: 'text-cyan-700', label: 'Service' },
              };
              const badge = typeBadge[product.type] ?? typeBadge.hosting_plan;
              const meta = product.metadata ?? {};

              return (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{product.slug}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-700">
                    {product.price_cad > 0 ? formatCents(product.price_cad) : product.type === 'hosting_plan' ? 'Custom' : '—'}
                    {product.price_yearly_cad > 0 && product.billing === 'monthly' && (
                      <span className="text-xs text-gray-400 ml-1">/ {formatCents(product.price_yearly_cad)}/yr</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 capitalize text-xs">{product.billing?.replace('_', ' ')}</td>
                  <td className="px-5 py-3.5">
                    <span className={product.is_active ? 'badge-green' : 'badge-gray'}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {product.stripe_product_id ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/admin/products/plans/${product.id}`}
                      className="text-xs text-admin-600 hover:text-admin-700 font-medium inline-flex items-center gap-1"
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
    </div>
  );
}
