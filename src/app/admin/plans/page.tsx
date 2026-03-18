import { createClient } from '@/lib/supabase-server';
import { formatCents } from '@/lib/utils';
import { EditPlanForm } from './edit-plan-form';

export default async function AdminPlansPage() {
  const supabase = await createClient();

  const { data: plans } = await supabase
    .from('plans')
    .select('*')
    .order('sort_order', { ascending: true });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Plans</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage hosting plans and pricing.</p>
      </div>

      {/* Plans table */}
      <div className="card overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yearly</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sites</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domains</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Storage</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(!plans || plans.length === 0) ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-sm text-gray-400">No plans found.</td>
                </tr>
              ) : plans.map((plan: any) => (
                <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-900">{plan.name}</td>
                  <td className="px-5 py-3.5 text-gray-500">{plan.slug}</td>
                  <td className="px-5 py-3.5 text-gray-700">{formatCents(plan.price_monthly)}</td>
                  <td className="px-5 py-3.5 text-gray-700">{formatCents(plan.price_yearly)}</td>
                  <td className="px-5 py-3.5 text-gray-700">{plan.sites_allowed}</td>
                  <td className="px-5 py-3.5 text-gray-700">{plan.domains_allowed}</td>
                  <td className="px-5 py-3.5 text-gray-700">{plan.disk_gb} GB</td>
                  <td className="px-5 py-3.5">
                    <span className={plan.is_active ? 'badge-green' : 'badge-gray'}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit forms */}
      {plans && plans.length > 0 && (
        <div className="space-y-4">
          {plans.map((plan: any) => (
            <EditPlanForm key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
}
