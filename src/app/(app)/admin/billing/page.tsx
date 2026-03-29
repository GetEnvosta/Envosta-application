export const revalidate = 5;
import { getAllActiveSubscriptions, getAllSubscriptionsAdmin } from '@/services/subscriptions';
import { getAdminBillingStats, getAdminRecentInvoices } from '@/services/billing';
import { formatCents } from '@/lib/utils';
import { DollarSign, Receipt, AlertCircle, Users, ExternalLink } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { InvoiceFilters } from '@/components/admin/invoice-filters';
import { SubscriptionFilters } from '@/components/admin/subscription-filters';

export default async function AdminBillingPage() {
  const [
    activeSubscriptions,
    allSubscriptions,
    { paidInvoicesCount, outstandingInvoicesCount },
    recentInvoices,
  ] = await Promise.all([
    getAllActiveSubscriptions(),
    getAllSubscriptionsAdmin(),
    getAdminBillingStats(),
    getAdminRecentInvoices(100),
  ]);

  const mrr = activeSubscriptions.reduce(
    (sum: number, sub: any) => sum + (sub.products?.price_cad ?? 0), 0
  );

  const activeCount = allSubscriptions.filter((s: any) => s.status === 'active').length;

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Billing</h1>
          <p className="text-sm text-gray-500 mt-0.5">Revenue, subscriptions, and invoices.</p>
        </div>
        <a
          href="https://dashboard.stripe.com"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-admin text-sm py-2 px-3.5 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <ExternalLink className="w-4 h-4" />
          Stripe Dashboard
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Monthly recurring revenue" value={formatCents(mrr)} icon={DollarSign} sub="MRR" color="green" />
        <StatCard label="Active subscriptions" value={activeCount} icon={Users} color="blue" />
        <StatCard label="Paid invoices" value={paidInvoicesCount} icon={Receipt} color="indigo" />
        <StatCard label="Outstanding" value={outstandingInvoicesCount} icon={AlertCircle} sub="Open or draft" color="amber" />
      </div>

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
