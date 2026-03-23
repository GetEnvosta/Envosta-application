import { getAllActiveSubscriptions } from '@/services/subscriptions';
import { getAdminBillingStats, getAdminRecentInvoices, getAllCustomersWithUsers } from '@/services/billing';
import { formatCents, formatDate, statusColor } from '@/lib/utils';
import { DollarSign, Receipt, AlertCircle, FileText } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { CreateInvoiceForm } from './create-invoice';

export default async function AdminBillingPage() {
  const [
    activeSubscriptions,
    { paidInvoicesCount, outstandingInvoicesCount },
    recentInvoices,
    customers,
  ] = await Promise.all([
    getAllActiveSubscriptions(),
    getAdminBillingStats(),
    getAdminRecentInvoices(30),
    getAllCustomersWithUsers(),
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

      {/* Custom Invoice */}
      <div className="mb-8">
        <CreateInvoiceForm customers={customers as any} />
      </div>

      {/* Recent Invoices */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Recent Invoices</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentInvoices.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center"><Receipt className="w-8 h-8 text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-400">No invoices yet.</p></td></tr>
              ) : recentInvoices.map((inv: any) => {
                const user = (inv.customers as any)?.users;
                return (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{inv.description || '\u2014'}</td>
                    <td className="px-5 py-3.5 text-gray-500">{user?.full_name || user?.email || '\u2014'}</td>
                    <td className="px-5 py-3.5 text-gray-900 font-medium">{formatCents(inv.amount_due ?? 0)}</td>
                    <td className="px-5 py-3.5"><span className={statusColor(inv.status)}>{inv.status}</span></td>
                    <td className="px-5 py-3.5 text-gray-500">{formatDate(inv.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
