import { getAllActiveSubscriptions } from '@/services/subscriptions';
import { getAdminBillingStats, getAdminRecentInvoices } from '@/services/billing';
import { formatCents, formatDate, statusColor } from '@/lib/utils';
import { DollarSign, Receipt, AlertCircle } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { InvoiceFilters } from './invoice-filters';

export default async function AdminBillingPage() {
  const [
    activeSubscriptions,
    { paidInvoicesCount, outstandingInvoicesCount },
    recentInvoices,
  ] = await Promise.all([
    getAllActiveSubscriptions(),
    getAdminBillingStats(),
    getAdminRecentInvoices(100),
  ]);

  const mrr = activeSubscriptions.reduce(
    (sum: number, sub: any) => sum + (sub.plans?.price_monthly ?? 0), 0
  );

  const subsByPlan: Record<string, { name: string; count: number }> = {};
  for (const sub of activeSubscriptions) {
    const planName = (sub.plans as any)?.name ?? 'Unknown';
    if (!subsByPlan[planName]) subsByPlan[planName] = { name: planName, count: 0 };
    subsByPlan[planName].count++;
  }

  // Tag each invoice with a category
  const taggedInvoices = recentInvoices.map((inv: any) => {
    const desc = (inv.description ?? '').toLowerCase();
    let category = 'other';
    if (desc.includes('domain') || desc.includes('.com') || desc.includes('.ca') || desc.includes('.net') || desc.includes('.io') || desc.includes('tld') || desc.includes('registration')) category = 'domains';
    else if (desc.includes('studio') || desc.includes('burst') || desc.includes('add-on') || desc.includes('addon')) category = 'addons';
    else if (desc.includes('plan') || desc.includes('minimum') || desc.includes('growth') || desc.includes('performance') || desc.includes('hosting') || desc.includes('subscription')) category = 'hosting';
    return { ...inv, _category: category };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-500 mt-0.5">Revenue, subscriptions, and invoices.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Monthly recurring revenue" value={formatCents(mrr)} icon={DollarSign} sub="MRR from active subscriptions" />
        <StatCard label="Paid invoices" value={paidInvoicesCount} icon={Receipt} />
        <StatCard label="Outstanding invoices" value={outstandingInvoicesCount} icon={AlertCircle} sub="Open or draft" />
      </div>

      {/* Subscriptions by plan */}
      <div className="card mb-8">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Subscriptions by Plan</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {Object.values(subsByPlan).length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No active subscriptions.</div>
          ) : Object.values(subsByPlan).map(plan => (
            <div key={plan.name} className="px-5 py-3.5 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">{plan.name}</span>
              <span className="badge-indigo">{plan.count} active</span>
            </div>
          ))}
        </div>
      </div>

      {/* Invoices with filters */}
      <InvoiceFilters invoices={taggedInvoices} />
    </div>
  );
}
