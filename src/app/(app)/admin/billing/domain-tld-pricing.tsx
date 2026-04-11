'use client';

import { useState } from 'react';
import { Loader2, Check, X, Globe, ExternalLink } from 'lucide-react';

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

  async function toggleActive(tld: TldProduct) {
    setSaving(tld.id);
    try {
      const res = await fetch('/api/admin/update-tld-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tld.id, is_active: !tld.is_active }),
      });
      if (res.ok) {
        setTlds(tlds.map(t => t.id === tld.id ? { ...t, is_active: !t.is_active } : t));
      }
    } catch (e) { console.error(e); }
    setSaving(null);
  }

  if (tlds.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-gray-400">
        <Globe className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        No domain TLDs configured. Add them in the products table.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">TLD</th>
            <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Price (CAD/yr)</th>
            <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Stripe</th>
            <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Active</th>
          </tr>
        </thead>
        <tbody>
          {tlds.map(tld => (
            <tr key={tld.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
              <td className="px-4 py-2.5 text-sm font-medium text-gray-900">
                {tld.slug.replace('tld-', '.')}
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
                    ${(tld.price_cad / 100).toFixed(2)}
                  </button>
                )}
              </td>
              <td className="px-4 py-2.5 text-center">
                {tld.stripe_price_id ? (
                  <span className="text-xs text-emerald-600">Linked</span>
                ) : (
                  <span className="text-xs text-amber-600">Not synced</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-center">
                <button onClick={() => toggleActive(tld)} disabled={saving === tld.id}
                  className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full transition-colors ${
                    tld.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}>
                  {tld.is_active ? 'Active' : 'Off'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
