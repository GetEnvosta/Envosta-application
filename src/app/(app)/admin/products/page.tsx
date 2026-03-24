import { getAllPlans, getDomainPricing } from '@/services/plans';
import { formatCents } from '@/lib/utils';
import { Settings, Package, Globe, FileText, Pencil, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default async function ProductsPage() {
  const [plans, tlds] = await Promise.all([
    getAllPlans(),
    getDomainPricing(),
  ]);

  const syncedPlans = plans.filter((p: any) => p.stripe_price_id_monthly).length;
  const syncedTlds = tlds.filter((t: any) => t.stripe_price_id_yearly).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Products</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage all products, pricing, and Stripe sync.</p>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">

        {/* Hosting Plans */}
        <Link href="/admin/products/plans" className="card p-6 hover:border-admin-300 transition-colors group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-admin-500" />
              <h2 className="text-base font-semibold text-gray-900">Hosting Plans</h2>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-admin-500 transition-colors" />
          </div>
          <p className="text-sm text-gray-500 mb-4">Manage plan pricing, wp.cloud resources, and features.</p>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-gray-500">{plans.length} plans</span>
            <span className={syncedPlans === plans.length ? 'text-green-600' : 'text-amber-600'}>
              {syncedPlans}/{plans.length} synced to Stripe
            </span>
          </div>
          <div className="flex gap-2 mt-3">
            {plans.map((plan: any) => (
              <span key={plan.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {plan.name} — {formatCents(plan.price_monthly)}/mo
              </span>
            ))}
          </div>
        </Link>

        {/* Domain TLDs */}
        <Link href="/admin/products/domains" className="card p-6 hover:border-admin-300 transition-colors group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-admin-500" />
              <h2 className="text-base font-semibold text-gray-900">Domain TLDs</h2>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-admin-500 transition-colors" />
          </div>
          <p className="text-sm text-gray-500 mb-4">Manage TLD registration, renewal, and transfer pricing.</p>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-gray-500">{tlds.length} TLDs</span>
            <span className={syncedTlds === tlds.length ? 'text-green-600' : 'text-amber-600'}>
              {syncedTlds}/{tlds.length} synced to Stripe
            </span>
          </div>
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {tlds.slice(0, 8).map((tld: any) => (
              <span key={tld.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">.{tld.tld}</span>
            ))}
            {tlds.length > 8 && <span className="text-xs text-gray-400">+{tlds.length - 8} more</span>}
          </div>
        </Link>

        {/* Add-on Products */}
        <Link href="/admin/products/addons" className="card p-6 hover:border-admin-300 transition-colors group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-admin-500" />
              <h2 className="text-base font-semibold text-gray-900">Add-on Products</h2>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-admin-500 transition-colors" />
          </div>
          <p className="text-sm text-gray-500 mb-4">Manage add-ons like Studio Requests, Bursting, and more.</p>
          <div className="flex gap-2 mt-1">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Studio Request — $250</span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Bursting — $200/mo</span>
          </div>
        </Link>

        {/* Custom Invoices */}
        <Link href="/admin/products/invoices" className="card p-6 hover:border-admin-300 transition-colors group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-admin-500" />
              <h2 className="text-base font-semibold text-gray-900">Custom Invoices</h2>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-admin-500 transition-colors" />
          </div>
          <p className="text-sm text-gray-500 mb-4">Send one-time invoices to customers for custom work.</p>
          <div className="text-xs text-gray-500">
            Create and send invoices via Stripe — any amount, any description.
          </div>
        </Link>

      </div>
    </div>
  );
}
