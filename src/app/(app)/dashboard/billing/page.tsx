import { getEffectiveUserId } from '@/services/auth';
import { getUserInvoices, getCustomerInfo } from '@/services/billing';
import { formatCents, formatDate, statusColor } from '@/lib/utils';
import { CreditCard, FileText, Download } from 'lucide-react';
import { UpdatePaymentMethod } from '@/components/billing/update-payment-method';

export default async function BillingPage() {
  const userId = await getEffectiveUserId();

  const [invoices, customer] = await Promise.all([
    getUserInvoices(20, userId!),
    getCustomerInfo(userId!),
  ]);

  const pmBrand: string | null = (customer as any)?.card_brand ?? null;
  const pmLast4: string | null = (customer as any)?.card_last4 ?? null;
  const pmExpiry: string | null = (customer as any)?.card_expiry ?? null;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Billing</h1>
        <p className="text-sm text-gray-500">
          Manage your payment method and view invoices.
        </p>
      </div>

      {/* Payment Method */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Payment Method</h2>
        <div className="card p-6">
          {pmLast4 ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-8 rounded-md bg-gray-100 border border-gray-200">
                  <CreditCard className="w-6 h-6 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {pmBrand ? pmBrand.charAt(0).toUpperCase() + pmBrand.slice(1) : 'Card'} ending in {pmLast4}
                  </p>
                  {pmExpiry && (
                    <p className="text-xs text-gray-500">Expires {pmExpiry}</p>
                  )}
                </div>
              </div>
              <UpdatePaymentMethod />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">No payment method on file.</p>
              </div>
              <UpdatePaymentMethod />
            </div>
          )}
        </div>
      </section>

      {/* Invoice History */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Invoice History</h2>

        {invoices && invoices.length > 0 ? (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
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
                    <td className="px-5 py-3.5">
                      <span className={statusColor(inv.status)}>{inv.status}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {pdfUrl && (
                          <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
                            <Download className="w-3.5 h-3.5" /> PDF
                          </a>
                        )}
                        {viewUrl && (
                          <a href={viewUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
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
