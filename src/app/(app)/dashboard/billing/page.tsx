import { getCurrentUser } from '@/services/auth';
import { getUserInvoices, getCustomerInfo } from '@/services/billing';
import { formatCents, formatDate, statusColor } from '@/lib/utils';
import { CreditCard, ExternalLink, FileText } from 'lucide-react';

export default async function BillingPage() {
  const user = await getCurrentUser();

  const [invoices, customer] = await Promise.all([
    getUserInvoices(20),
    getCustomerInfo(user?.id ?? ''),
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
              <button className="btn-secondary" disabled>
                Manage Billing
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">No payment method on file.</p>
              </div>
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
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">{formatDate(inv.created_at)}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-900">{inv.description ?? 'Invoice'}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-900 whitespace-nowrap">{formatCents(inv.amount_due, inv.currency)}</td>
                    <td className="px-5 py-3.5">
                      <span className={statusColor(inv.status)}>{inv.status}</span>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      {inv.invoice_url ? (
                        <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
                          Download <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card p-10 text-center">
            <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No billing history yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}
