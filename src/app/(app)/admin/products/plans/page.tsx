import { getAllPlans } from '@/services/plans';
import { formatCents } from '@/lib/utils';
import { SyncAllPlansButton } from './sync-all-button';
import Link from 'next/link';
import { ArrowLeft, Pencil, Plus } from 'lucide-react';

export default async function AdminPlansPage() {
  const plans = await getAllPlans();

  return (
    <div>
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Products
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Hosting Plans</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage hosting plans, pricing, and wp.cloud resources.</p>
        </div>
        <div className="flex items-center gap-2">
          <SyncAllPlansButton />
          <Link href="/admin/products/plans/new" className="btn-admin text-sm py-2 px-3.5 inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Create Plan
          </Link>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Storage</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PHP Workers</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Memory</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Onboarding</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stripe</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {plans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-sm text-gray-400">No plans found.</td>
                </tr>
              ) : plans.map((plan: any) => (
                <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-900">{plan.name}</td>
                  <td className="px-5 py-3.5 text-gray-700">{formatCents(plan.price_cad)}</td>
                  <td className="px-5 py-3.5 text-gray-700">{plan.storage_gb ?? plan.disk_gb} GB</td>
                  <td className="px-5 py-3.5 text-gray-700">{plan.default_php_workers}</td>
                  <td className="px-5 py-3.5 text-gray-700">{plan.php_memory_mb} MB</td>
                  <td className="px-5 py-3.5 text-gray-700 capitalize">{plan.onboarding_type}</td>
                  <td className="px-5 py-3.5">
                    <span className={plan.is_active ? 'badge-green' : 'badge-gray'}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={plan.stripe_price_id ? 'badge-green' : 'badge-yellow'}>
                      {plan.stripe_price_id ? 'Synced' : 'Not synced'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/products/plans/${plan.id}`} className="text-xs text-admin-600 hover:text-admin-700 font-medium inline-flex items-center gap-1">
                      <Pencil className="w-3 h-3" /> Edit
                    </Link>
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
