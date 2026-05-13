export const revalidate = 5;
import { getAllActiveSubscriptions, getAllSubscriptionsAdmin, toMonthly, getAdminBillingStats, getAdminRecentInvoices } from '@/services/billing';
import { formatCents } from '@/lib/utils';
import { DollarSign, Receipt, Users, ExternalLink } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { InvoiceFilters } from '@/components/admin/invoice-filters';
import { SubscriptionFilters } from '@/components/admin/subscription-filters';
import { BillingTabs } from './billing-tabs';

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
          <p className="text-sm text-gray-500 mt-0.5">Revenue, subscriptions, and invoices.</p>
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
      </div>

      {/* Tabbed content */}
      <BillingTabs>
        {{
          subscriptions: <SubscriptionFilters subscriptions={allSubscriptions as any} />,
          invoices: <InvoiceFilters invoices={taggedInvoices} />,
        }}
      </BillingTabs>
    </div>
  );
}
