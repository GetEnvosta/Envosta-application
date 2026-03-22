import { getAllActiveSubscriptions } from '@/services/subscriptions';
import { getAdminBillingStats, getAdminRecentInvoices, getAllCustomersWithUsers } from '@/services/billing';
import { getAllPlans } from '@/services/plans';
import { formatCents, formatDate, statusColor } from '@/lib/utils';
import { DollarSign, Receipt, AlertCircle, Settings, Package, FileText } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { CreateInvoiceForm } from './create-invoice';
import { EditPlanForm } from '../plans/edit-plan-form';
import Link from 'next/link';

export default async function BillingProductsPage() {
  const [
    activeSubscriptions,
    { paidInvoicesCount, outstandingInvoicesCount },
    plans,
    recentInvoices,
    customers,
  ] = await Promise.all([
    getAllActiveSubscriptions(),
    getAdminBillingStats(),
    getAllPlans(),
    getAdminRecentInvoices(30),
    getAllCustomersWithUsers(),
  ]);

  const mrr = activeSubscriptions.reduce(
    (sum: number, sub: any) => sum + (sub.plans?.price_monthly ?? 0), 0
  );

  const subsByPlan: Record<string, { name: string; count: number }> = {};
  for (const sub of activeSubscriptions) {
    const planName = (sub.plans as any)?.name ?? 'Unknown';
    if (!subsByPlan[planName]) subsByPlan[planName] = { name: planName, count: 0 };
    subsByPlan[planName].count++;
  }

  const stats = [
    { label: 'Monthly recurring revenue', value: formatCents(mrr), icon: DollarSign, sub: 'MRR from active subscriptions' },
    { label: 'Paid invoices', value: paidInvoicesCount, icon: Receipt },
    { label: 'Outstanding invoices', value: outstandingInvoicesCount, icon: AlertCircle, sub: 'Open or draft' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Billing & Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage plans, pricing, invoices, and add-on products.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map(s => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* ═══ SECTION: Revenue Overview ═══ */}
      <div className="card mb-8">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Subscriptions by Plan</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {Object.values(subsByPlan).length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No active subscriptions.</div>
          ) : Object.values(subsByPlan).map(plan => (
            <div key={plan.name} className="px-5 py-3.5 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">{plan.name}</span>
              <span className="badge-indigo">{plan.count} active</span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ SECTION: Hosting Plans ═══ */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-400" />
            Hosting Plans
          </h2>
        </div>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Plan</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Price</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Storage</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Workers</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Onboarding</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Support</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Stripe Price ID</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plans.map((plan: any) => (
                  <tr key={plan.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{plan.name}</td>
                    <td className="px-5 py-3.5 text-gray-900 font-medium">{formatCents(plan.price_monthly)}/mo</td>
                    <td className="px-5 py-3.5 text-gray-600">{plan.storage_gb ?? plan.disk_gb ?? '—'} GB</td>
                    <td className="px-5 py-3.5 text-gray-600">{plan.default_php_workers ?? '—'} / {plan.max_php_workers ?? '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600 capitalize">{plan.onboarding_type ?? '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600">{plan.support_response_hours ?? '—'}hr</td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-mono text-gray-400">{plan.stripe_price_id_monthly ? plan.stripe_price_id_monthly.slice(0, 20) + '...' : '—'}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={plan.is_active ? 'badge-green' : 'badge-gray'}>{plan.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          To edit plans, update the <span className="font-mono">plans</span> table in Supabase or use the{' '}
          <Link href="/admin/plans" className="text-admin-600 hover:underline">plan editor</Link>.
        </p>
      </div>

      {/* ═══ SECTION: Add-on Products ═══ */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Package className="w-4 h-4 text-gray-400" />
          Add-on Products
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Studio Request</h3>
              <span className="badge-yellow">One-time</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">$250 <span className="text-sm font-normal text-gray-500">CAD</span></p>
            <p className="text-xs text-gray-500">Design changes, new pages, plugin setup, custom features. Delivered in 3–5 business days.</p>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Bursting</h3>
              <span className="badge-blue">Monthly</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">$350 <span className="text-sm font-normal text-gray-500">CAD/mo</span></p>
            <p className="text-xs text-gray-500">Scales to 110+ PHP workers during traffic spikes. Admin-managed add-on.</p>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Domain Registration</h3>
              <span className="badge-green">Yearly</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">From $15 <span className="text-sm font-normal text-gray-500">CAD/yr</span></p>
            <p className="text-xs text-gray-500">
              20 TLDs available.{' '}
              <Link href="/admin/domains/pricing" className="text-admin-600 hover:underline">Manage TLD pricing →</Link>
            </p>
          </div>
        </div>
      </div>

      {/* ═══ SECTION: Custom Invoice ═══ */}
      <div className="mb-8">
        <CreateInvoiceForm customers={customers as any} />
      </div>

      {/* ═══ SECTION: Recent Invoices ═══ */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Recent Invoices</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No invoices yet.</p>
                  </td>
                </tr>
              ) : recentInvoices.map((inv: any) => {
                const user = (inv.customers as any)?.users;
                return (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{inv.description || '\u2014'}</td>
                    <td className="px-5 py-3.5 text-gray-500">{user?.full_name || user?.email || '\u2014'}</td>
                    <td className="px-5 py-3.5 text-gray-900 font-medium">{formatCents(inv.amount_due ?? 0)}</td>
                    <td className="px-5 py-3.5"><span className={statusColor(inv.status)}>{inv.status}</span></td>
                    <td className="px-5 py-3.5 text-gray-500">{formatDate(inv.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
