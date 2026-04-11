'use client';

import { useState } from 'react';
import { Loader2, Check, X, Globe, AlertTriangle, RefreshCw } from 'lucide-react';

interface TldProduct {
  id: string;
  name: string;
  slug: string;
  price_cad: number;
  is_active: boolean;
  stripe_price_id: string | null;
}

export function DomainTldPricing({ initialTlds }: { initialTlds: TldProduct[] }) {
  const [tlds, setTlds] = useState(initialTlds);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  async function handleSave(id: string, newPrice: number) {
    setSaving(id);
    try {
      const res = await fetch('/api/admin/update-tld-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, price_cad: Math.round(newPrice * 100) }),
      });
      if (res.ok) {
        setTlds(tlds.map(t => t.id === id ? { ...t, price_cad: Math.round(newPrice * 100) } : t));
      }
    } catch (e) { console.error(e); }
    setSaving(null);
    setEditingId(null);
  }

  async function handleSync(id: string) {
    setSyncing(id);
    try {
      const res = await fetch('/api/admin/update-tld-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, sync: true }),
      });
      const data = await res.json();
      if (res.ok && data.stripe_price_id) {
        setTlds(tlds.map(t => t.id === id ? { ...t, stripe_price_id: data.stripe_price_id } : t));
      } else {
        alert(data.error ?? 'Sync failed');
      }
    } catch (e) { console.error(e); }
    setSyncing(null);
  }

  if (tlds.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-gray-400">
        <Globe className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        No domain TLDs configured.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full table-fixed">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="w-[25%] text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">TLD</th>
            <th className="w-[40%] text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Billing</th>
            <th className="w-[20%] text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Price</th>
            <th className="w-[15%] text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Synced</th>
          </tr>
        </thead>
        <tbody>
          {tlds.map(tld => (
            <tr key={tld.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
              <td className="px-4 py-2.5 text-sm font-medium text-gray-900">
                {tld.slug.replace('tld-', '.')}
              </td>
              <td className="px-4 py-2.5 text-xs text-gray-600">
                Annual (Stripe subscription)
              </td>
              <td className="px-4 py-2.5 text-right">
                {editingId === tld.id ? (
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-xs text-gray-400">$</span>
                    <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)}
                      step="0.01" min="0" autoFocus
                      className="w-20 px-2 py-1 text-sm text-right border border-gray-200 rounded focus:border-brand-400 outline-none" />
                    <button onClick={() => handleSave(tld.id, parseFloat(editValue))}
                      disabled={saving === tld.id} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                      {saving === tld.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => { setEditingId(tld.id); setEditValue(String(tld.price_cad / 100)); }}
                    className="text-sm font-medium text-gray-900 hover:text-brand-600 transition-colors">
                    ${(tld.price_cad / 100).toFixed(2)}/yr
                  </button>
                )}
              </td>
              <td className="px-4 py-2.5 text-center">
                {tld.stripe_price_id ? (
                  <span className="text-xs text-emerald-600">Stripe ✓</span>
                ) : (
                  <button onClick={() => handleSync(tld.id)} disabled={syncing === tld.id}
                    className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium disabled:opacity-50">
                    {syncing === tld.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Sync
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
