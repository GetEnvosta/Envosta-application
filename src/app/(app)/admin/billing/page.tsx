export const revalidate = 5;
import { getAllActiveSubscriptions, getAllSubscriptionsAdmin, toMonthly } from '@/services/subscriptions';
import { getAdminBillingStats, getAdminRecentInvoices } from '@/services/billing';
import { getAllCommissions, getCommissionStats } from '@/services/commissions';
import { formatCents, formatDate } from '@/lib/utils';
import { DollarSign, Receipt, Users, ExternalLink, Banknote } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { InvoiceFilters } from '@/components/admin/invoice-filters';
import { SubscriptionFilters } from '@/components/admin/subscription-filters';
import { CommissionRowActions } from '@/components/admin/commission-actions';
import { BillingTabs } from './billing-tabs';

export default async function AdminBillingPage() {
  const [
    activeSubscriptions,
    allSubscriptions,
    { paidInvoicesCount, outstandingInvoicesCount },
    recentInvoices,
    commissionStats,
    commissions,
  ] = await Promise.all([
    getAllActiveSubscriptions(),
    getAllSubscriptionsAdmin(),
    getAdminBillingStats(),
    getAdminRecentInvoices(100),
    getCommissionStats(),
    getAllCommissions({}, 30),
  ]);

  const mrr = activeSubscriptions.reduce((sum: number, sub: any) => sum + toMonthly(sub), 0);
  const activeCount = allSubscriptions.filter((s: any) => s.status === 'active').length;

  const taggedInvoices = recentInvoices.map((inv: any) => {
    const desc = (inv.description ?? '').toLowerCase();
    let category = 'other';
    if (desc.includes('domain')) category = 'domains';
    else if (desc.includes('overage')) category = 'overage';
    else if (desc.includes('plan') || desc.includes('minimum') || desc.includes('subscription')) category = 'subscription';
    else if (desc.includes('studio')) category = 'studio';
    return { ...inv, _category: category };
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Billing</h1>
          <p className="text-sm text-gray-500 mt-0.5">Revenue, subscriptions, commissions, and invoices.</p>
        </div>
        <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer"
          className="btn-admin text-sm py-2 px-3.5 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
          <ExternalLink className="w-4 h-4" /> Stripe
        </a>
      </div>

      {/* Stats — always visible */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="MRR" value={formatCents(mrr)} icon={DollarSign} color="green" />
        <StatCard label="Active subs" value={activeCount} icon={Users} color="blue" />
        <StatCard label="Invoices" value={paidInvoicesCount} icon={Receipt} sub={`${outstandingInvoicesCount} outstanding`} color="indigo" />
        <StatCard label="Commissions" value={formatCents(commissionStats.pendingTotal)} icon={Banknote} sub={`${commissionStats.pendingCount} pending`} color="amber" />
      </div>

      {/* Tabbed content */}
      <BillingTabs>
        {{
          subscriptions: <SubscriptionFilters subscriptions={allSubscriptions as any} />,

          commissions: (
            <div>
              <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
                <span>{formatCents(commissionStats.pendingTotal)} pending ({commissionStats.pendingCount})</span>
                <span>{formatCents(commissionStats.approvedTotal)} approved ({commissionStats.approvedCount})</span>
                <span>{formatCents(commissionStats.paidTotal)} paid ({commissionStats.paidCount})</span>
              </div>
              {commissions.length > 0 ? (
                <div className="card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Earner</th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Type</th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Customer</th>
                        <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Amount</th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Status</th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Date</th>
                        <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {commissions.map((c: any) => (
                        <tr key={c.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 text-sm text-gray-900">{c.earner?.full_name ?? c.earner?.email ?? '—'}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.type === 'affiliate' ? 'bg-amber-50 text-amber-700' : c.type === 'partner' ? 'bg-sky-50 text-sky-700' : 'bg-gray-100 text-gray-600'}`}>{c.type}</span>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-gray-600">{c.customer?.full_name ?? c.customer?.email ?? '—'}</td>
                          <td className="px-4 py-2.5 text-sm font-medium text-gray-900 text-right">{formatCents(c.amount_cad)}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : c.status === 'approved' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>{c.status}</span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-gray-500">{formatDate(c.created_at)}</td>
                          <td className="px-4 py-2.5 text-right"><CommissionRowActions commission={c} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="card p-8 text-center text-sm text-gray-400">No commissions yet.</div>
              )}
            </div>
          ),

          invoices: <InvoiceFilters invoices={taggedInvoices} />,
        }}
      </BillingTabs>
    </div>
  );
}
