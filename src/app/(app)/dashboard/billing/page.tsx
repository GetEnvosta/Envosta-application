import { getEffectiveUserId } from '@/services/auth';
import { getUserInvoices } from '@/services/billing';
import { formatCents, formatDate, statusColor } from '@/lib/utils';
import { FileText, Download, Globe, ArrowUpRight, Plus } from 'lucide-react';
import { PaymentMethodManager } from '@/components/billing/payment-method-manager';
import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';

export default async function BillingPage() {
  const userId = await getEffectiveUserId();
  const supabase = await createClient();

  // Fetch invoices, sites with plan info, and domain subscriptions in parallel
  const [invoices, sitesResult, domainSubsResult] = await Promise.all([
    getUserInvoices(20, userId!),
    supabase
      .from('sites')
      .select('id, label, status, product_id, stripe_subscription_item_id, products(name, slug, price_cad)')
      .eq('user_id', userId!)
      .not('status', 'in', '("cancelled","deleted")')
      .order('created_at', { ascending: false }),
    supabase
      .from('subscriptions')
      .select('id, status, billing_period, current_period_end, products(name, price_cad, type), metadata')
      .eq('user_id', userId!)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false }),
  ]);

  const sites = sitesResult.data ?? [];
  const allSubs = domainSubsResult.data ?? [];

  // Separate domain renewals from hosting
  const domainSubs = allSubs.filter((s: any) => {
    const meta = (s.metadata as any) ?? {};
    return meta.type === 'domain_renewal' || meta.is_domain_purchase === 'true' || (s.products as any)?.type === 'domain_tld';
  });

  // Calculate totals
  const sitesTotal = sites.reduce((sum: number, s: any) => sum + ((s.products as any)?.price_cad ?? 0), 0);
  const domainsTotal = domainSubs.reduce((sum: number, s: any) => {
    const price = (s.products as any)?.price_cad ?? 0;
    // Domain renewals are yearly — show monthly equivalent
    return sum + Math.round(price / 12);
  }, 0);
  const monthlyTotal = sitesTotal + domainsTotal;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Billing</h1>
        <p className="text-sm text-gray-500">Your subscription, sites, and payment history.</p>
      </div>

      {/* ═══ Subscription Overview ═══ */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Subscription</h2>
        <div className="card p-0 overflow-hidden">
          {/* Monthly total header */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Monthly Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{formatCents(monthlyTotal, 'usd')}<span className="text-sm font-normal text-gray-400">/mo</span></p>
            </div>
            <Link
              href="/dashboard/add-site"
              className="btn-primary text-xs py-2 px-3.5 inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Site
            </Link>
          </div>

          {/* Sites line items */}
          {sites.length > 0 && (
            <div className="divide-y divide-gray-100">
              <div className="px-6 py-2.5 bg-gray-50/50">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Hosting — {sites.length} {sites.length === 1 ? 'site' : 'sites'}</p>
              </div>
              {sites.map((site: any) => {
                const plan = site.products as any;
                const price = plan?.price_cad ?? 0;
                return (
                  <div key={site.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Globe className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link href={`/dashboard/sites/${site.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                            {site.label}
                          </Link>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            site.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                            site.status === 'provisioning' ? 'bg-amber-50 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {site.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">{plan?.name ?? 'Hosting'} plan</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold text-gray-900">{formatCents(price, 'usd')}<span className="text-xs font-normal text-gray-400">/mo</span></p>
                      <Link href={`/dashboard/sites/${site.id}`} className="text-gray-400 hover:text-blue-600 transition-colors">
                        <ArrowUpRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Domain renewals */}
          {domainSubs.length > 0 && (
            <div className="divide-y divide-gray-100">
              <div className="px-6 py-2.5 bg-gray-50/50 border-t border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Domains — {domainSubs.length} {domainSubs.length === 1 ? 'domain' : 'domains'}</p>
              </div>
              {domainSubs.map((ds: any) => {
                const meta = (ds.metadata as any) ?? {};
                const domainName = meta.domain_name ?? (ds.products as any)?.name ?? 'Domain';
                const yearlyPrice = (ds.products as any)?.price_cad ?? 0;
                return (
                  <div key={ds.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                        <Globe className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{domainName}</p>
                        <p className="text-xs text-gray-500">
                          Auto-renews {ds.current_period_end ? formatDate(ds.current_period_end) : 'yearly'}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{formatCents(yearlyPrice, 'usd')}<span className="text-xs font-normal text-gray-400">/yr</span></p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {sites.length === 0 && domainSubs.length === 0 && (
            <div className="px-6 py-12 text-center">
              <Globe className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700 mb-1">No active services</p>
              <p className="text-xs text-gray-400 mb-4">Add a site to get started with hosting.</p>
              <Link href="/dashboard/add-site" className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add Your First Site
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ═══ Payment Methods ═══ */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Payment Methods</h2>
        <div className="card p-6">
          <PaymentMethodManager />
        </div>
      </section>

      {/* ═══ Invoice History ═══ */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Invoices</h2>
        {invoices && invoices.length > 0 ? (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Description</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Amount</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv: any) => {
                  const meta = (inv.metadata as any) ?? {};
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">{formatDate(inv.created_at)}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-900">{inv.description || 'Invoice'}</td>
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-900 whitespace-nowrap">{formatCents(inv.amount_cad ?? 0, 'usd')}</td>
                      <td className="px-5 py-3.5"><span className={statusColor(inv.status)}>{inv.status}</span></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {meta.invoice_pdf && <a href={meta.invoice_pdf} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:text-brand-700"><Download className="w-3.5 h-3.5" /></a>}
                          {inv.hosted_invoice_url && <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-gray-700"><FileText className="w-3.5 h-3.5" /></a>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card p-12 text-center">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700 mb-1">No invoices yet</p>
            <p className="text-xs text-gray-400">Invoices appear after your first billing cycle.</p>
          </div>
        )}
      </section>
    </div>
  );
}
