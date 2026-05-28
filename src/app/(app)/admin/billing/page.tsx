export const revalidate = 5;
import { createClient } from '@/lib/supabase-server';
import {
  getAllActiveSubscriptions, getAllSubscriptionsAdmin, toMonthly,
  getAdminBillingStats, getAdminRecentInvoices, getAbandonedCheckouts,
} from '@/services/billing';
import { formatCents } from '@/lib/utils';
import Link from 'next/link';
import { DollarSign, Receipt, Users, ExternalLink, Server, Globe, ShoppingCart } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { InvoiceFilters } from '@/components/admin/invoice-filters';
import { SubscriptionFilters } from '@/components/admin/subscription-filters';
import { BillingTabs } from './billing-tabs';

/**
 * /admin/billing — unified billing + reporting page.
 *
 * Reporting was folded into this page as the Revenue + Funnel tabs.
 * The standalone /admin/reporting page now redirects here.
 */
export default async function AdminBillingPage() {
  const supabase = await createClient();

  const [
    activeSubscriptions,
    allSubscriptions,
    { paidInvoicesCount, outstandingInvoicesCount },
    recentInvoices,
    abandonedCheckouts,
  ] = await Promise.all([
    getAllActiveSubscriptions(),
    getAllSubscriptionsAdmin(),
    getAdminBillingStats(),
    getAdminRecentInvoices(100),
    getAbandonedCheckouts(50),
  ]);

  const mrr = activeSubscriptions.reduce((sum: number, sub: any) => sum + toMonthly(sub), 0);
  const activeCount = allSubscriptions.filter((s: any) => s.status === 'active').length;

  // Site + domain totals (for the Revenue tab — context for MRR-per-asset)
  const { count: totalSites } = await supabase
    .from('sites').select('id', { count: 'exact', head: true })
    .in('status', ['active', 'provisioning']);
  const { count: totalDomains } = await supabase
    .from('domains').select('id', { count: 'exact', head: true })
    .eq('status', 'registered');

  const taggedInvoices = recentInvoices.map((inv: any) => {
    const desc = (inv.description ?? '').toLowerCase();
    let category = 'other';
    if (desc.includes('domain')) category = 'domains';
    else if (desc.includes('overage')) category = 'overage';
    else if (desc.includes('plan') || desc.includes('minimum') || desc.includes('subscription')) category = 'subscription';
    else if (desc.includes('studio')) category = 'studio';
    return { ...inv, _category: category };
  });

  const arpc = activeCount > 0 ? Math.round(mrr / activeCount) : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Billing</h1>
          <p className="text-sm text-gray-500 mt-0.5">Revenue, subscriptions, invoices, and conversion funnel.</p>
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
        <StatCard label="Sites · Domains" value={`${totalSites ?? 0} · ${totalDomains ?? 0}`} icon={Server} color="purple" />
      </div>

      {/* Tabbed content */}
      <BillingTabs>
        {{
          subscriptions: <SubscriptionFilters subscriptions={allSubscriptions as any} />,
          invoices: <InvoiceFilters invoices={taggedInvoices} />,

          revenue: (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue summary</h3>
                <div className="space-y-3">
                  <Row label="Subscription Revenue (MRR)" value={`${formatCents(mrr)}/mo`} />
                  <Row label="Annualized Run Rate (ARR)" value={`${formatCents(mrr * 12)}/yr`} />
                  <Row label="Avg Revenue per Customer (ARPC)" value={`${formatCents(arpc)}/mo`} last />
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MiniStat icon={<Server className="w-4 h-4 text-blue-500" />} label="Sites" value={totalSites ?? 0} sub="active or provisioning" />
                <MiniStat icon={<Globe className="w-4 h-4 text-purple-500" />} label="Domains" value={totalDomains ?? 0} sub="registered" />
                <MiniStat icon={<Users className="w-4 h-4 text-emerald-500" />} label="Paying customers" value={activeCount} sub="with an active sub" />
                <MiniStat icon={<DollarSign className="w-4 h-4 text-amber-500" />} label="Outstanding" value={outstandingInvoicesCount} sub="unpaid invoices" />
              </div>
            </div>
          ),

          funnel: (
            <div className="space-y-4">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Abandoned checkouts</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Customers who started checkout but didn&apos;t complete payment.</p>
                  </div>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{abandonedCheckouts.length} total</span>
                </div>
                {abandonedCheckouts.length === 0 ? (
                  <p className="text-sm text-gray-400 py-8 text-center">No abandoned checkouts found.</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {abandonedCheckouts.map((s: any) => {
                      const email = (s.users as any)?.email ?? 'Unknown';
                      const name = (s.users as any)?.full_name;
                      const userId = (s.users as any)?.id;
                      const product = s.products?.name ?? 'Unknown product';
                      const date = new Date(s.created_at);
                      const ago = Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={s.id} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
                              <ShoppingCart className="w-3.5 h-3.5 text-amber-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{name || email}</p>
                              <p className="text-xs text-gray-500">{product} · {ago === 0 ? 'today' : `${ago}d ago`}</p>
                            </div>
                          </div>
                          {userId && (
                            <Link href={`/admin/customers/${userId}`} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                              View <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ),
        }}
      </BillingTabs>
    </div>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 ${last ? '' : 'border-b border-gray-100'}`}>
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function MiniStat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number | string; sub: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span></div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
}
