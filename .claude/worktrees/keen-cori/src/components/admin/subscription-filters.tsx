'use client';

import { useState } from 'react';
import { formatCents, formatDate } from '@/lib/utils';
import { CreditCard } from 'lucide-react';

interface Subscription {
  id: string;
  status: string;
  stripe_subscription_id: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  products?: { name: string; slug: string; price_cad: number } | null;
  users?: { full_name: string | null; email: string } | null;
}

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'trialing', label: 'Trialing' },
  { key: 'past_due', label: 'Past Due' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'incomplete', label: 'Incomplete' },
];

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  trialing: 'bg-blue-100 text-blue-700',
  past_due: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
  incomplete: 'bg-yellow-100 text-yellow-700',
};

export function SubscriptionFilters({ subscriptions }: { subscriptions: Subscription[] }) {
  const [active, setActive] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  const plans = Array.from(new Set(subscriptions.map(s => s.products?.name).filter(Boolean)));

  let filtered = active === 'all' ? subscriptions : subscriptions.filter(s => s.status === active);
  if (planFilter !== 'all') filtered = filtered.filter(s => s.products?.name === planFilter);

  const counts: Record<string, number> = { all: subscriptions.length };
  for (const sub of subscriptions) {
    counts[sub.status] = (counts[sub.status] ?? 0) + 1;
  }

  return (
    <div className="card overflow-hidden">
      {/* Filter tabs */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setActive(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                active === f.key
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {f.label}
              {(counts[f.key] ?? 0) > 0 && (
                <span className="ml-1.5 text-gray-400">{counts[f.key]}</span>
              )}
            </button>
          ))}
        </div>
        <select
          value={planFilter}
          onChange={e => setPlanFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
        >
          <option value="all">All plans</option>
          {plans.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center">
          <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No subscriptions match this filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Renews</th>
                <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(sub => {
                const user = sub.users as any;
                return (
                  <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-gray-900">{user?.full_name || 'Unnamed'}</p>
                      <p className="text-xs text-gray-500">{user?.email || '—'}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-700">{sub.products?.name || '—'}</td>
                    <td className="px-5 py-3 text-gray-900 font-medium">
                      {sub.products?.price_cad ? formatCents(sub.products.price_cad) + '/mo' : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[sub.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {sub.status}
                      </span>
                      {sub.cancel_at_period_end && (
                        <span className="ml-1 text-xs text-red-500">cancelling</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {sub.current_period_end ? formatDate(sub.current_period_end) : '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{formatDate(sub.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
