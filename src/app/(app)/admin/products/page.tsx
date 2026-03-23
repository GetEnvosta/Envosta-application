import { getAllPlans, getDomainPricing } from '@/services/plans';
import { formatCents } from '@/lib/utils';
import { Settings, Package, Globe, Pencil } from 'lucide-react';
import Link from 'next/link';

export default async function ProductsPage() {
  const [plans, tlds] = await Promise.all([
    getAllPlans(),
    getDomainPricing(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Products</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage hosting plans, add-on products, and domain TLD pricing.</p>
      </div>

      {/* ═══ HOSTING PLANS ═══ */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-400" />
            Hosting Plans
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {plans.map((plan: any) => (
            <Link key={plan.id} href={`/admin/products/plans/${plan.id}`} className="card p-5 hover:border-admin-300 transition-colors group">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900">{plan.name}</h3>
                <Pencil className="w-3.5 h-3.5 text-gray-300 group-hover:text-admin-500 transition-colors" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-3">
                {formatCents(plan.price_monthly)} <span className="text-sm font-normal text-gray-500">CAD/mo</span>
              </p>
              <div className="space-y-1.5 text-xs text-gray-500">
                <div className="flex justify-between"><span>Storage</span><span className="font-medium text-gray-700">{plan.storage_gb ?? plan.disk_gb} GB</span></div>
                <div className="flex justify-between"><span>PHP Workers</span><span className="font-medium text-gray-700">{plan.default_php_workers} / {plan.max_php_workers} max</span></div>
                <div className="flex justify-between"><span>Onboarding</span><span className="font-medium text-gray-700 capitalize">{plan.onboarding_type}</span></div>
                <div className="flex justify-between"><span>Support SLA</span><span className="font-medium text-gray-700">{plan.support_response_hours}hr</span></div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className={plan.is_active ? 'badge-green' : 'badge-gray'}>{plan.is_active ? 'Active' : 'Inactive'}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ═══ ADD-ON PRODUCTS ═══ */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-400" />
            Add-on Products
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Studio Request</h3>
              <span className="badge-yellow">One-time</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">$250 <span className="text-sm font-normal text-gray-500">CAD</span></p>
            <p className="text-xs text-gray-500 mb-3">Design changes, new pages, plugin setup, custom features.</p>
            <span className="badge-green">Active</span>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Bursting</h3>
              <span className="badge-blue">Monthly</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">$350 <span className="text-sm font-normal text-gray-500">CAD/mo</span></p>
            <p className="text-xs text-gray-500 mb-3">Scales to 110+ PHP workers during traffic spikes. Admin-managed.</p>
            <span className="badge-green">Active</span>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">PHP Memory Upgrade</h3>
              <span className="badge-blue">Monthly</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">TBD <span className="text-sm font-normal text-gray-500">CAD/mo</span></p>
            <p className="text-xs text-gray-500 mb-3">Upgrade PHP memory from 512MB to 1024/1536/2048MB.</p>
            <span className="badge-gray">Pricing TBD</span>
          </div>
        </div>
      </div>

      {/* ═══ TLD PRICING ═══ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-400" />
            Domain TLD Pricing
          </h2>
          <Link href="/admin/domains/pricing" className="btn-admin text-xs py-1.5 px-3 inline-flex items-center gap-1">
            <Pencil className="w-3 h-3" />
            Edit All TLDs
          </Link>
        </div>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">TLD</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Registration</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Renewal</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Transfer</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Stripe</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tlds.map((tld: any) => (
                <tr key={tld.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-gray-900">.{tld.tld}</td>
                  <td className="px-5 py-3 text-gray-600">{formatCents(tld.registration_price_cad)}</td>
                  <td className="px-5 py-3 text-gray-600">{formatCents(tld.renewal_price_cad)}</td>
                  <td className="px-5 py-3 text-gray-600">{formatCents(tld.transfer_price_cad)}</td>
                  <td className="px-5 py-3">
                    {tld.stripe_price_id_yearly
                      ? <span className="badge-green text-xs">Linked</span>
                      : <span className="badge-gray text-xs">Not set</span>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={tld.active ? 'badge-green' : 'badge-gray'}>{tld.active ? 'Active' : 'Hidden'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
