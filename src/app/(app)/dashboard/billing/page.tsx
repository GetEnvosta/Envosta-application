import { getEffectiveUserId } from '@/services/auth';
import { getUserInvoices } from '@/services/billing';
import { formatCents, formatDate, statusColor } from '@/lib/utils';
import { FileText, Download, BarChart3, Brain, Clock } from 'lucide-react';
import { PaymentMethodManager } from '@/components/billing/payment-method-manager';
import { UsageMeter } from '@/components/billing/usage-meter';
import { UsageBreakdown } from '@/components/billing/usage-breakdown';
import { UsageLog } from '@/components/billing/usage-log';
import { AiUsageDashboard } from '@/components/billing/ai-usage-dashboard';

export default async function BillingPage() {
  const userId = await getEffectiveUserId();
  const invoices = await getUserInvoices(20, userId!);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Billing</h1>
        <p className="text-sm text-gray-500">Track usage, view invoices, and manage payment methods.</p>
      </div>

      {/* Usage Meter */}
      <UsageMeter />

      {/* Usage Breakdown */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-gray-400" />
          Usage Breakdown
        </h2>
        <div className="card p-5">
          <UsageBreakdown />
        </div>
      </section>

      {/* AI Usage Dashboard */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-500" />
          AI Usage
        </h2>
        <div className="card p-5">
          <AiUsageDashboard />
        </div>
      </section>

      {/* Usage Log */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          Usage Log
        </h2>
        <div className="card overflow-hidden">
          <UsageLog />
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
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-900 whitespace-nowrap">{formatCents(inv.amount_cad ?? 0, 'cad')}</td>
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
