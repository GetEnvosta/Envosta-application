export const revalidate = 5;
import { getAllActiveSubscriptions, getAllSubscriptionsAdmin, toMonthly } from '@/services/subscriptions';
import { getAdminBillingStats, getAdminRecentInvoices } from '@/services/billing';
import { getAdminUsageStats } from '@/services/usage';
import { getServicePricing } from '@/services/pricing';
import { getAllCommissions, getCommissionStats } from '@/services/commissions';
import { formatCents, formatDate } from '@/lib/utils';
import { DollarSign, Receipt, AlertCircle, Users, ExternalLink, Gauge, TrendingUp, Banknote } from 'lucide-react';
import { CommissionRowActions } from '@/components/admin/commission-actions';
import { StatCard } from '@/components/admin/stat-card';
import { InvoiceFilters } from '@/components/admin/invoice-filters';
import { SubscriptionFilters } from '@/components/admin/subscription-filters';
import { CreditPricingTable } from '@/app/(app)/admin/credits/pricing-table';

export default async function AdminBillingPage() {
  const [
    activeSubscriptions,
    allSubscriptions,
    { paidInvoicesCount, outstandingInvoicesCount },
    recentInvoices,
    usageStats,
    pricing,
    commissionStats,
    commissions,
  ] = await Promise.all([
    getAllActiveSubscriptions(),
    getAllSubscriptionsAdmin(),
    getAdminBillingStats(),
    getAdminRecentInvoices(100),
    getAdminUsageStats(),
    getServicePricing(),
    getCommissionStats(),
    getAllCommissions({}, 20),
  ]);

  const mrr = activeSubscriptions.reduce(
    (sum: number, sub: any) => sum + toMonthly(sub), 0
  );
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
          <p className="text-sm text-gray-500 mt-0.5">Revenue, usage, subscriptions, pricing, and invoices.</p>
        </div>
        <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer"
          className="btn-admin text-sm py-2 px-3.5 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
          <ExternalLink className="w-4 h-4" /> Stripe
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="MRR" value={formatCents(mrr)} icon={DollarSign} color="green" />
        <StatCard label="Active subs" value={activeCount} icon={Users} color="blue" />
        <StatCard label="Platform usage" value={`${usageStats.totalUsage}`} icon={Gauge} sub={`${usageStats.activeUsers} users`} color="purple" />
        <StatCard label="Projected overage" value={`$${usageStats.projectedOverageRevenue}`} icon={TrendingUp} sub={`${usageStats.usersOverIncluded.length} over`} color="amber" />
        <StatCard label="Invoices" value={paidInvoicesCount} icon={Receipt} sub={`${outstandingInvoicesCount} outstanding`} color="indigo" />
      </div>

      {/* Usage Pricing */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Usage Pricing</h2>
        <CreditPricingTable initialPricing={pricing} />
      </div>

      {/* Users Over Included */}
      {usageStats.usersOverIncluded.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Users Over Included ({usageStats.usersOverIncluded.length})
          </h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">User</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Used</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Included</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Overage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {usageStats.usersOverIncluded.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 text-sm">
                      <span className="font-medium text-gray-900">{u.full_name ?? 'Unknown'}</span>
                      <span className="text-gray-400 ml-2 text-xs">{u.email}</span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-right text-gray-600">{Number(u.usage_this_cycle).toFixed(1)}</td>
                    <td className="px-4 py-2.5 text-sm text-right text-gray-600">{u.included_credits ?? 36}</td>
                    <td className="px-4 py-2.5 text-sm text-right font-medium text-amber-600">${u.overage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subscriptions */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Subscriptions</h2>
        <SubscriptionFilters subscriptions={allSubscriptions as any} />
      </div>

      {/* Commissions */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Banknote className="w-4 h-4 text-emerald-500" />
          Commissions
          <span className="text-xs text-gray-400 font-normal ml-1">
            {formatCents(commissionStats.pendingTotal)} pending · {formatCents(commissionStats.approvedTotal)} approved · {formatCents(commissionStats.paidTotal)} paid
          </span>
        </h2>
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
                    <td className="px-4 py-2.5 text-right">
                      <CommissionRowActions commission={c} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card p-8 text-center text-sm text-gray-400">No commissions yet.</div>
        )}
      </div>

      {/* Invoices */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Invoices</h2>
        <InvoiceFilters invoices={taggedInvoices} />
      </div>
    </div>
  );
}
