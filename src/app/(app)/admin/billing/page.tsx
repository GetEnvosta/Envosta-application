export const revalidate = 5;
import { getAllActiveSubscriptions, getAllSubscriptionsAdmin, toMonthly } from '@/services/subscriptions';
import { getAdminBillingStats, getAdminRecentInvoices } from '@/services/billing';
import { getAdminUsageStats } from '@/services/usage';
import { getServicePricing } from '@/services/pricing';
import { formatCents } from '@/lib/utils';
import { DollarSign, Receipt, AlertCircle, Users, ExternalLink, Gauge, TrendingUp } from 'lucide-react';
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
  ] = await Promise.all([
    getAllActiveSubscriptions(),
    getAllSubscriptionsAdmin(),
    getAdminBillingStats(),
    getAdminRecentInvoices(100),
    getAdminUsageStats(),
    getServicePricing(),
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

      {/* Invoices */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Invoices</h2>
        <InvoiceFilters invoices={taggedInvoices} />
      </div>
    </div>
  );
}
