import { createClient } from '@/lib/supabase-server';
import { formatCents, formatDate, statusColor } from '@/lib/utils';
import { CheckoutButton } from '@/components/billing/checkout-button';
import { Check, ExternalLink } from 'lucide-react';

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: plans }, { data: subscription }, { data: invoices }] = await Promise.all([
    supabase.from('plans').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('subscriptions').select('*, plans(name, slug), customers(stripe_customer_id)')
      .eq('status', 'active').limit(1).maybeSingle(),
    supabase.from('invoices').select('*').order('created_at', { ascending: false }).limit(10),
  ]);

  const currentSlug = (subscription as any)?.plans?.slug;

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Billing</h1>
      <p className="text-sm text-gray-500 mb-6">Manage your subscription and view invoices</p>

      {/* Current plan */}
      {subscription && (
        <div className="card p-5 mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Current plan</p>
            <p className="text-lg font-semibold text-gray-900 mt-0.5">{(subscription as any)?.plans?.name ?? 'Unknown'}</p>
            <p className="text-xs text-gray-500 mt-1">
              Renews {formatDate((subscription as any)?.current_period_end)}
            </p>
          </div>
          <span className={statusColor((subscription as any)?.status)}>{(subscription as any)?.status}</span>
        </div>
      )}

      {/* Plans grid */}
      <h2 className="text-sm font-semibold text-gray-900 mb-3">Available plans</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {plans?.map((plan: any) => {
          const isCurrent = plan.slug === currentSlug;
          return (
            <div key={plan.id} className={`card p-5 ${isCurrent ? 'ring-2 ring-brand-500 border-brand-200' : ''}`}>
              <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-900">{plan.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {formatCents(plan.price_monthly)}
                <span className="text-sm font-normal text-gray-500">/mo</span>
              </p>
              <ul className="mt-4 space-y-2">
                {(plan.features as string[])?.map((f: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                {isCurrent ? (
                  <button className="btn-secondary w-full opacity-60" disabled>Current plan</button>
                ) : (
                  <CheckoutButton priceId={plan.stripe_price_id_monthly} className="w-full" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Invoices */}
      {invoices && invoices.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Invoice history</h2>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Description</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Amount</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Date</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3.5 text-sm text-gray-900">{inv.description ?? 'Invoice'}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{formatCents(inv.amount_due, inv.currency)}</td>
                    <td className="px-5 py-3.5"><span className={statusColor(inv.status)}>{inv.status}</span></td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 hidden sm:table-cell">{formatDate(inv.created_at)}</td>
                    <td className="px-5 py-3.5 text-right">
                      {inv.invoice_url && (
                        <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer"
                          className="btn-ghost text-xs py-1 px-2">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
