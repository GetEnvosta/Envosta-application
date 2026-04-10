import { getEffectiveUserId } from '@/services/auth';
import { getUserInvoices } from '@/services/billing';
import { formatCents, formatDate, statusColor } from '@/lib/utils';
import { FileText, Download, Coins, BarChart3, Settings2 } from 'lucide-react';
import { PaymentMethodManager } from '@/components/billing/payment-method-manager';
import { CreditBalanceCard } from '@/components/billing/credit-balance-card';
import { BuyCreditsButton } from '@/components/billing/buy-credits-dialog';
import { UsageBreakdown } from '@/components/billing/usage-breakdown';
import { CreditTransactions } from '@/components/billing/credit-transactions';
import { AutoRefillSettings } from '@/components/billing/auto-refill-settings';

export default async function BillingPage() {
  const userId = await getEffectiveUserId();
  const invoices = await getUserInvoices(20, userId!);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Billing</h1>
          <p className="text-sm text-gray-500">Manage credits, payment methods, and view usage.</p>
        </div>
        <BuyCreditsButton />
      </div>

      {/* Credit Balance */}
      <CreditBalanceCard />

      {/* Usage & Auto-Refill Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-400" />
            Usage Breakdown
          </h2>
          <div className="card p-5">
            <UsageBreakdown />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-gray-400" />
            Auto-Refill
          </h2>
          <div className="card p-5">
            <AutoRefillSettings />
          </div>
        </section>
      </div>

      {/* Credit Transaction History */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Coins className="w-4 h-4 text-gray-400" />
          Credit History
        </h2>
        <div className="card overflow-hidden">
          <CreditTransactions />
        </div>
      </section>

      {/* Payment Methods */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Payment Methods</h2>
        <div className="card p-6">
          <PaymentMethodManager />
        </div>
      </section>

      {/* Invoice History */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Invoice History</h2>

        {invoices && invoices.length > 0 ? (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Description</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Amount</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv: any) => {
                  const meta = (inv.metadata as any) ?? {};
                  const pdfUrl = meta.invoice_pdf ?? null;
                  const viewUrl = inv.hosted_invoice_url ?? null;
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">{formatDate(inv.created_at)}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-900">{inv.description || meta.description || 'Invoice'}</td>
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-900 whitespace-nowrap">{formatCents(inv.amount_cad ?? 0, 'cad')}</td>
                      <td className="px-5 py-3.5"><span className={statusColor(inv.status)}>{inv.status}</span></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {pdfUrl && (
                            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
                              <Download className="w-3.5 h-3.5" /> PDF
                            </a>
                          )}
                          {viewUrl && (
                            <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                              <FileText className="w-3.5 h-3.5" /> View
                            </a>
                          )}
                          {!pdfUrl && !viewUrl && <span className="text-sm text-gray-400">&mdash;</span>}
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
            <p className="text-sm font-medium text-gray-700 mb-1">No billing history</p>
            <p className="text-xs text-gray-400">Invoices will appear here after your first payment.</p>
          </div>
        )}
      </section>
    </div>
  );
}
