import { getEffectiveUserId } from '@/services/auth';
import { getAccountInvoices } from '@/services/billing';
import { formatCents, formatDate, statusColor } from '@/lib/utils';
import { FileText, Download, Globe, ArrowUpRight, Plus } from 'lucide-react';
import { PaymentMethodManager } from '@/components/billing/payment-method-manager';
import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';

/**
 * Customer billing page. Reads subscription + invoices from the
 * stripe.* mirror via the new billing helpers — public.subscriptions /
 * public.invoices were dropped in the Sync Engine cutover.
 */
export default async function BillingPage() {
  const userId = await getEffectiveUserId();
  const supabase = await createClient();

  // Fetch invoices, sites with plan info, and account subscription in parallel
  const [invoices, sitesResult] = await Promise.all([
    getAccountInvoices(userId!, 20),
    supabase
      .from('sites')
      .select('id, label, status, product_id, stripe_subscription_item_id, products(name, slug, price_cad)')
      .eq('user_id', userId!)
      .not('status', 'in', '("cancelled","deleted")')
      .order('created_at', { ascending: false }),
  ]);

  const sites = sitesResult.data ?? [];

  // Domain renewals are off-session PaymentIntents driven by
  // /api/cron/process-domain-renewals — the customer dashboard surfaces
  // them via the domains table, not via Stripe sub rows.

  // Calculate totals
  const sitesTotal = sites.reduce((sum: number, s: any) => sum + ((s.products as any)?.price_cad ?? 0), 0);
  const monthlyTotal = sitesTotal;

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
              {sites.length > 0 && (
                <p className="text-[11px] text-gray-400 mt-1">
                  {sites.length} {sites.length === 1 ? 'subscription' : 'subscriptions'} · one per site
                </p>
              )}
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

          {/* Empty state */}
          {sites.length === 0 && (
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
                  const amount = inv.amount_paid ?? inv.amount_due ?? 0;
                  const currency = (inv.currency ?? 'usd').toLowerCase() as 'usd' | 'cad';
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">{inv.created_iso ? formatDate(inv.created_iso) : '—'}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-900">{inv.description || inv.number || 'Invoice'}</td>
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-900 whitespace-nowrap">{formatCents(amount, currency)}</td>
                      <td className="px-5 py-3.5"><span className={statusColor(inv.status)}>{inv.status}</span></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {inv.invoice_pdf && <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:text-brand-700"><Download className="w-3.5 h-3.5" /></a>}
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
