import { getCurrentUser } from '@/services/auth';
import { getUserSubscriptionsWithDetails } from '@/services/subscriptions';
import { getUserServicesBasic } from '@/services/sites';
import { getUserInvoices, getCustomerInfo } from '@/services/billing';
import { getActivePlans } from '@/services/plans';
import { formatCents, formatDate, statusColor } from '@/lib/utils';
import { CheckoutButton } from '@/components/billing/checkout-button';
import { Check, CreditCard, ExternalLink, Plus, Server, Shield } from 'lucide-react';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  Static plan definitions (one site per plan)                       */
/* ------------------------------------------------------------------ */
// Plans are fetched from the database (dbPlans) to get real Stripe price IDs.

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */
export default async function BillingPage() {
  const user = await getCurrentUser();

  /* Fetch ALL subscriptions (with nested plan + customer), services,
     invoices, and the customer row for payment-method info. */
  const [
    subscriptions,
    services,
    invoices,
    customer,
    dbPlans,
  ] = await Promise.all([
    getUserSubscriptionsWithDetails(),
    getUserServicesBasic(),
    getUserInvoices(20),
    getCustomerInfo(user?.id ?? ''),
    getActivePlans(),
  ]);

  const allSubscriptions = subscriptions;
  const allServices = services;
  const hasSubscriptions = allSubscriptions.length > 0;

  // Build a map of subscription_id -> service for quick lookup
  const serviceBySubId = new Map<string, any>();
  for (const svc of allServices) {
    if (svc.subscription_id) {
      serviceBySubId.set(svc.subscription_id, svc);
    }
  }

  /* Payment method info stored on customer row (populated by webhook) */
  const pmBrand: string | null = (customer as any)?.card_brand ?? null;
  const pmLast4: string | null = (customer as any)?.card_last4 ?? null;
  const pmExpiry: string | null = (customer as any)?.card_expiry ?? null;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Billing</h1>
        <p className="text-sm text-gray-500">
          Manage your subscriptions, payment method, and view invoices
        </p>
      </div>

      {/* -- Section 1: Subscriptions ---------------------------------- */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">
            {hasSubscriptions ? 'Your Subscriptions' : 'Choose a Plan'}
          </h2>
        </div>

        {hasSubscriptions ? (
          <>
            {/* Active subscription cards */}
            <div className="grid grid-cols-1 gap-4 mb-6">
              {allSubscriptions.map((sub: any) => {
                const plan = sub.plans as
                  | { name: string; slug: string; price_monthly: number; features: string[] }
                  | null;
                const linkedService = serviceBySubId.get(sub.id);

                return (
                  <div key={sub.id} className="card p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-semibold text-gray-900">{plan?.name ?? 'Plan'}</p>
                          <span className={statusColor(sub.status)}>
                            {sub.status}
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {formatCents(plan?.price_monthly ?? 0)}
                          <span className="text-sm font-normal text-gray-500">/mo</span>
                        </p>
                        <div className="flex items-center gap-4 mt-1.5">
                          <p className="text-xs text-gray-500">
                            Next renewal {formatDate(sub.current_period_end)}
                          </p>
                          <span className="text-xs text-gray-300">|</span>
                          {linkedService ? (
                            <Link
                              href={`/dashboard/sites/${linkedService.id}`}
                              className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                            >
                              <Server className="w-3 h-3" />
                              {linkedService.label}
                            </Link>
                          ) : (
                            <span className="text-xs text-gray-400">No site linked yet</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <button className="btn-secondary" disabled>
                          Change Plan
                        </button>
                        <button className="btn-primary" disabled>
                          Manage Subscription
                        </button>
                      </div>
                    </div>

                    {/* Feature checkmarks */}
                    {plan?.features && plan.features.length > 0 && (
                      <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                        {plan.features.map((f: string, i: number) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add another site - plan picker */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                Add Another Site
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {dbPlans.map((p: any) => (
                  <div
                    key={p.slug}
                    className={`card p-6 flex flex-col ${
                      p.slug === 'growth'
                        ? 'border-2 border-blue-500 shadow-md relative'
                        : ''
                    }`}
                  >
                    {p.slug === 'growth' && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 badge-blue text-xs px-3 py-0.5 rounded-full font-medium">
                        Most Popular
                      </span>
                    )}
                    <div className="mb-4">
                      <h3 className="text-base font-semibold text-gray-900">
                        {p.name}
                      </h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatCents(p.price_monthly)}
                      <span className="text-sm font-normal text-gray-500">/mo</span>
                    </p>
                    <ul className="mt-5 space-y-2.5 flex-1">
                      {(Array.isArray(p.features) ? p.features : []).map((f: string, i: number) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-gray-600"
                        >
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6">
                      <CheckoutButton
                        priceId={p.stripe_price_id_monthly}
                        className="w-full"
                        label="Add Site"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* ---- No subscription: show plan cards ---- */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {dbPlans.map((p: any) => (
              <div
                key={p.slug}
                className={`card p-6 flex flex-col ${
                  p.highlighted
                    ? 'border-2 border-blue-500 shadow-md relative'
                    : ''
                }`}
              >
                {p.slug === 'growth' && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 badge-blue text-xs px-3 py-0.5 rounded-full font-medium">
                    Most Popular
                  </span>
                )}
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-gray-900">
                    {p.name}
                  </h3>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCents(p.price_monthly)}
                  <span className="text-sm font-normal text-gray-500">/mo</span>
                </p>
                <ul className="mt-5 space-y-2.5 flex-1">
                  {(Array.isArray(p.features) ? p.features : []).map((f: string, i: number) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-gray-600"
                    >
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <CheckoutButton
                    priceId={p.stripe_price_id_monthly}
                    className="w-full"
                    label="Choose Plan"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* -- Section 2: Payment Method --------------------------------- */}
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
                    {pmBrand ? pmBrand.charAt(0).toUpperCase() + pmBrand.slice(1) : 'Card'}{' '}
                    ending in {pmLast4}
                  </p>
                  {pmExpiry && (
                    <p className="text-xs text-gray-500">Expires {pmExpiry}</p>
                  )}
                </div>
              </div>
              <button className="btn-secondary" disabled>
                Update Payment Method
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
              <button className="btn-primary" disabled>
                Add Payment Method
              </button>
            </div>
          )}
        </div>
      </section>

      {/* -- Section 3: Billing History -------------------------------- */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Billing History</h2>

        {invoices && invoices.length > 0 ? (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                    Date
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                    Description
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                    Amount
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">
                    Invoice
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(inv.created_at)}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-900">
                      {inv.description ?? 'Invoice'}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {formatCents(inv.amount_due, inv.currency)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={statusColor(inv.status)}>{inv.status}</span>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      {inv.invoice_url ? (
                        <a
                          href={inv.invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
                        >
                          Download
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card p-10 text-center">
            <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
              <Shield className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No billing history yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}
