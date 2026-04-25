'use client';

/**
 * <UnlinkedStripeProducts> — health-tab card listing active Stripe
 * products that aren't linked to any product in our DB.
 *
 * Was originally rendered inside the Stripe tab (under "Not in Platform")
 * but it's a health/integrity concern — admin needs to see it on the
 * Health tab next to other sync issues. Stripe tab is for managing
 * existing products; this card surfaces drift.
 */

import { useEffect, useState } from 'react';
import { CreditCard, Database, X, Check, Plus, RefreshCw, ExternalLink } from 'lucide-react';

interface StripeOnlyProduct {
  stripe_id: string;
  name: string;
  description: string | null;
  active: boolean;
  metadata: Record<string, string>;
  created: number;
}

export function UnlinkedStripeProducts() {
  const [items, setItems] = useState<StripeOnlyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/stripe-products');
      const data = await res.json();
      if (res.ok) {
        setItems(data.stripeOnly ?? []);
      } else {
        setError(data.error ?? 'Failed to load');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Network error');
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function importFromStripe(stripeId: string) {
    setImportingId(stripeId);
    try {
      const res = await fetch('/api/admin/sync-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', stripeId }),
      });
      if (res.ok) {
        setItems(prev => prev.filter(p => p.stripe_id !== stripeId));
      }
    } catch { /* ignore */ }
    setImportingId(null);
  }

  const count = items.length;
  const borderClass = count === 0 ? 'border-emerald-100' : 'border-amber-200';

  return (
    <div className={`card overflow-hidden mb-4 border-l-4 ${borderClass}`}>
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Stripe Products — Not in Platform</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${count === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            {count}
          </span>
          <button onClick={load} disabled={loading}
            className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="px-5 py-6 text-center text-sm text-gray-400">
          <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Loading Stripe products...
        </div>
      ) : error ? (
        <div className="px-5 py-4 text-sm text-red-600">{error}</div>
      ) : count === 0 ? (
        <div className="px-5 py-4 text-sm text-gray-400">All active Stripe products are linked to a DB product.</div>
      ) : (
        <>
          <p className="px-5 py-2 text-xs text-gray-500 bg-gray-50">
            Active products in Stripe with no matching DB row. Either Import them or archive them in Stripe.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Stripe Product</th>
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">DB</th>
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Stripe</th>
                  <th className="px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(p => (
                  <tr key={p.stripe_id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-2.5">
                      <p className="text-sm font-medium text-gray-900 truncate" title={p.name}>{p.name}</p>
                      <p className="text-[11px] text-gray-400 font-mono">{p.stripe_id}</p>
                    </td>
                    <td className="px-5 py-2.5">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400"><Database className="w-3 h-3" /><X className="w-3 h-3" /></span>
                    </td>
                    <td className="px-5 py-2.5">
                      <a href={`https://dashboard.stripe.com/products/${p.stripe_id}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700">
                        <Check className="w-3 h-3" /> <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <button onClick={() => importFromStripe(p.stripe_id)} disabled={importingId === p.stripe_id}
                        className="btn-admin text-xs py-1 px-2.5 inline-flex items-center gap-1">
                        {importingId === p.stripe_id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        Import
                      </button>
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
