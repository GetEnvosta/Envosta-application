import { getAllActiveSubscriptions } from '@/services/subscriptions';
import { getAdminBillingStats, getAdminRecentInvoices } from '@/services/billing';
import { formatCents, formatDate, statusColor } from '@/lib/utils';
import { DollarSign, Receipt, AlertCircle, FileText, Server, Globe, Package } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';

export default async function AdminBillingPage() {
  const [
    activeSubscriptions,
    { paidInvoicesCount, outstandingInvoicesCount },
    recentInvoices,
  ] = await Promise.all([
    getAllActiveSubscriptions(),
    getAdminBillingStats(),
    getAdminRecentInvoices(50),
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

  // Categorize invoices by description pattern
  function categorize(inv: any): 'hosting' | 'domain' | 'addon' | 'custom' {
    const desc = (inv.description ?? '').toLowerCase();
    if (desc.includes('domain') || desc.includes('.com') || desc.includes('.ca') || desc.includes('tld')) return 'domain';
    if (desc.includes('studio') || desc.includes('burst') || desc.includes('add-on') || desc.includes('addon')) return 'addon';
    if (desc.includes('plan') || desc.includes('minimum') || desc.includes('growth') || desc.includes('performance') || desc.includes('hosting')) return 'hosting';
    return 'custom';
  }

  const hostingInvoices = recentInvoices.filter((i: any) => categorize(i) === 'hosting');
  const domainInvoices = recentInvoices.filter((i: any) => categorize(i) === 'domain');
  const addonInvoices = recentInvoices.filter((i: any) => categorize(i) === 'addon');
  const customInvoices = recentInvoices.filter((i: any) => categorize(i) === 'custom');

  function InvoiceTable({ invoices, emptyText }: { invoices: any[]; emptyText: string }) {
    if (invoices.length === 0) {
      return <div className="p-6 text-center text-sm text-gray-400">{emptyText}</div>;
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.map((inv: any) => {
              const user = (inv.customers as any)?.users;
              return (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">{inv.description || '\u2014'}</td>
                  <td className="px-5 py-3 text-gray-500">{user?.full_name || user?.email || '\u2014'}</td>
                  <td className="px-5 py-3 text-gray-900 font-medium">{formatCents(inv.amount_due ?? 0)}</td>
                  <td className="px-5 py-3"><span className={statusColor(inv.status)}>{inv.status}</span></td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{formatDate(inv.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-500 mt-0.5">Revenue, subscriptions, and invoices by category.</p>
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

      {/* Hosting Invoices */}
      <div className="card overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Server className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Hosting Plans</h2>
          <span className="text-xs text-gray-400 ml-auto">{hostingInvoices.length} invoices</span>
        </div>
        <InvoiceTable invoices={hostingInvoices} emptyText="No hosting invoices yet." />
      </div>

      {/* Domain Invoices */}
      <div className="card overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Globe className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Domain Registrations</h2>
          <span className="text-xs text-gray-400 ml-auto">{domainInvoices.length} invoices</span>
        </div>
        <InvoiceTable invoices={domainInvoices} emptyText="No domain invoices yet." />
      </div>

      {/* Add-on Invoices */}
      <div className="card overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Package className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Add-ons &amp; Studio</h2>
          <span className="text-xs text-gray-400 ml-auto">{addonInvoices.length} invoices</span>
        </div>
        <InvoiceTable invoices={addonInvoices} emptyText="No add-on invoices yet." />
      </div>

      {/* Custom Invoices */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Custom &amp; Other</h2>
          <span className="text-xs text-gray-400 ml-auto">{customInvoices.length} invoices</span>
        </div>
        <InvoiceTable invoices={customInvoices} emptyText="No custom invoices yet." />
      </div>
    </div>
  );
}
