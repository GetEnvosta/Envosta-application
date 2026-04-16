'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Plus, ExternalLink, Check, AlertCircle, Trash2 } from 'lucide-react';

interface Product {
  id: string;
  type: string;
  name: string;
  slug: string;
  billing: string;
  price_cad: number;
  price_yearly_cad: number | null;
  is_active: boolean;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  monthly_credit_cost: number | null;
  metadata: any;
}

interface StripeOnlyProduct {
  stripe_id: string;
  name: string;
  description: string | null;
  active: boolean;
  metadata: Record<string, string>;
  created: number;
}

interface DomainTld {
  id: string;
  name: string;
  slug: string;
  price_cad: number;
  is_active: boolean;
  stripe_price_id: string | null;
}

export function StripeProducts({
  initialPlans,
  initialOneTime,
  initialTlds,
}: {
  initialPlans: Product[];
  initialOneTime: Product[];
  initialTlds: DomainTld[];
}) {
  const [plans, setPlans] = useState(initialPlans);
  const [oneTime, setOneTime] = useState(initialOneTime);
  const [tlds, setTlds] = useState(initialTlds);
  const [stripeOnly, setStripeOnly] = useState<StripeOnlyProduct[]>([]);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadingStripe, setLoadingStripe] = useState(true);
  const [result, setResult] = useState('');

  // TLD inline editing
  const [editingTldId, setEditingTldId] = useState<string | null>(null);
  const [editTldPrice, setEditTldPrice] = useState('');
  const [savingTldId, setSavingTldId] = useState<string | null>(null);

  useEffect(() => {
    fetchStripeOnly();
  }, []);

  async function fetchStripeOnly() {
    setLoadingStripe(true);
    try {
      const res = await fetch('/api/admin/stripe-products');
      if (res.ok) {
        const data = await res.json();
        setStripeOnly(data.stripeOnly ?? []);
      }
    } catch { /* ignore */ }
    setLoadingStripe(false);
  }

  async function syncProduct(id: string) {
    setSyncingId(id);
    try {
      const res = await fetch('/api/admin/sync-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'product', id }),
      });
      if (res.ok) {
        const data = await res.json();
        const update = (p: Product) => p.id === id ? {
          ...p,
          stripe_product_id: data.stripe_product_id,
          stripe_price_id: data.stripe_price_id,
        } : p;
        setPlans(prev => prev.map(update));
        setOneTime(prev => prev.map(update));
      }
    } catch { /* ignore */ }
    setSyncingId(null);
  }

  async function syncAll() {
    setSyncingAll(true);
    setResult('');
    try {
      const res = await fetch('/api/admin/sync-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'sync_all' }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(`Synced ${data.results?.length ?? 0} products`);
        setTimeout(() => { setResult(''); window.location.reload(); }, 2000);
      } else {
        setResult('Sync failed');
      }
    } catch { setResult('Sync failed'); }
    setSyncingAll(false);
  }

  async function quickCreate(type: string, name: string, billing: string, price: number) {
    setCreating(true);
    try {
      const res = await fetch('/api/admin/create-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name, slug: `${type.replace('_', '-')}-${Date.now()}`, billing, price_cad: price }),
      });
      const data = await res.json();
      if (data.id) {
        window.location.reload();
      } else {
        setResult(data.error ?? 'Failed to create');
      }
    } catch { setResult('Failed to create'); }
    setCreating(false);
  }

  async function deleteProduct(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch('/api/admin/create-product', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) window.location.reload();
    } catch { /* ignore */ }
  }

  async function saveTldPrice(id: string) {
    setSavingTldId(id);
    try {
      const cents = Math.round(parseFloat(editTldPrice) * 100);
      const res = await fetch('/api/admin/update-tld-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, price_cad: cents }),
      });
      if (res.ok) {
        setTlds(prev => prev.map(t => t.id === id ? { ...t, price_cad: cents } : t));
      }
    } catch { /* ignore */ }
    setSavingTldId(null);
    setEditingTldId(null);
  }

  async function syncTld(id: string) {
    setSyncingId(id);
    try {
      const res = await fetch('/api/admin/update-tld-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, sync: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setTlds(prev => prev.map(t => t.id === id ? { ...t, stripe_price_id: data.stripe_price_id ?? t.stripe_price_id } : t));
      }
    } catch { /* ignore */ }
    setSyncingId(null);
  }

  const formatPrice = (cents: number, billing: string) => {
    const dollars = (cents / 100).toFixed(2);
    if (billing === 'monthly') return `$${dollars}/mo`;
    if (billing === 'yearly') return `$${dollars}/yr`;
    return `$${dollars}`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Manage Stripe-linked products. Sync status shows whether each product has been pushed to Stripe.</p>
        </div>
        <div className="flex items-center gap-2">
          {result && <span className="text-xs text-gray-500">{result}</span>}
          <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer"
            className="btn-admin-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" /> Stripe Dashboard
          </a>
          <button onClick={syncAll} disabled={syncingAll}
            className="btn-admin-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin' : ''}`} />
            {syncingAll ? 'Syncing...' : 'Sync All'}
          </button>
        </div>
      </div>

      {/* Plans */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Plans</h3>
            <p className="text-xs text-gray-500">Hosting subscription products.</p>
          </div>
          <button onClick={() => quickCreate('hosting_plan', 'New Plan', 'monthly', 0)} disabled={creating}
            className="btn-admin text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Plan
          </button>
        </div>
        <ProductTable
          products={plans}
          columns={[
            { key: 'name', label: 'Plan', render: (p) => p.name },
            { key: 'credits', label: 'Credits', render: (p) => p.monthly_credit_cost ? `${p.monthly_credit_cost}/mo` : '—' },
            { key: 'price', label: 'Price', render: (p) => formatPrice(p.price_cad, p.billing), align: 'right' },
          ]}
          syncingId={syncingId}
          onSync={syncProduct}
          onDelete={deleteProduct}
        />
      </div>

      {/* Domain TLDs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Domain TLDs</h3>
            <p className="text-xs text-gray-500">Yearly domain registration products. Click price to edit.</p>
          </div>
          <button onClick={() => quickCreate('domain_tld', 'New TLD', 'yearly', 0)} disabled={creating}
            className="btn-admin text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add TLD
          </button>
        </div>
        <div className="card overflow-hidden">
          <table className="w-full table-fixed">
            <thead><tr className="border-b border-gray-100">
              <th className="w-[30%] text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">TLD</th>
              <th className="w-[25%] text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Billing</th>
              <th className="w-[20%] text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Price</th>
              <th className="w-[15%] text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Synced</th>
              <th className="w-[10%] text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5"></th>
            </tr></thead>
            <tbody>
              {tlds.map(tld => (
                <tr key={tld.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-sm font-medium text-gray-900">.{tld.slug}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">Annual</td>
                  <td className="px-4 py-2.5 text-right">
                    {editingTldId === tld.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-gray-400">$</span>
                        <input type="number" value={editTldPrice} onChange={e => setEditTldPrice(e.target.value)}
                          step="0.01" min="0" autoFocus
                          className="w-20 px-2 py-1 text-sm text-right border border-gray-200 rounded focus:border-brand-400 outline-none" />
                        <button onClick={() => saveTldPrice(tld.id)} disabled={savingTldId === tld.id}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded text-xs">
                          {savingTldId === tld.id ? '...' : 'Save'}
                        </button>
                        <button onClick={() => setEditingTldId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded text-xs">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingTldId(tld.id); setEditTldPrice((tld.price_cad / 100).toFixed(2)); }}
                        className="text-sm font-medium text-gray-900 hover:text-brand-600 transition-colors">
                        ${(tld.price_cad / 100).toFixed(2)}/yr
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <SyncBadge synced={!!tld.stripe_price_id} syncing={syncingId === tld.id} onSync={() => syncTld(tld.id)} />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => deleteProduct(tld.id, tld.name)} className="text-xs text-red-400 hover:text-red-600">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
              {tlds.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-400">No domain TLDs configured.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* One-Time Products */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">One-Time Products</h3>
            <p className="text-xs text-gray-500">Single-charge products (studio builds, migrations, etc).</p>
          </div>
          <button onClick={() => quickCreate('one_time_service', 'New Service', 'one_time', 0)} disabled={creating}
            className="btn-admin text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Product
          </button>
        </div>
        <ProductTable
          products={oneTime}
          columns={[
            { key: 'name', label: 'Product', render: (p) => p.name },
            { key: 'price', label: 'Price', render: (p) => formatPrice(p.price_cad, p.billing), align: 'right' },
          ]}
          syncingId={syncingId}
          onSync={syncProduct}
          onDelete={deleteProduct}
        />
      </div>

      {/* Stripe-Only Products */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Not in Platform</h3>
        <p className="text-xs text-gray-500 mb-3">Active products in Stripe that aren't linked to any product in the database.</p>
        {loadingStripe ? (
          <div className="card p-6 text-center text-sm text-gray-400">
            <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Loading Stripe products...
          </div>
        ) : stripeOnly.length === 0 ? (
          <div className="card p-6 text-center text-sm text-gray-400">All Stripe products are linked.</div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Name</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Stripe ID</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Metadata</th>
              </tr></thead>
              <tbody>
                {stripeOnly.map(p => (
                  <tr key={p.stripe_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-2.5">
                      <a href={`https://dashboard.stripe.com/products/${p.stripe_id}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-brand-600 hover:text-brand-700 font-mono">{p.stripe_id.slice(0, 20)}...</a>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {Object.entries(p.metadata ?? {}).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared sub-components ──────────────────────────────

function SyncBadge({ synced, syncing, onSync }: { synced: boolean; syncing: boolean; onSync: () => void }) {
  if (syncing) return <RefreshCw className="w-3.5 h-3.5 animate-spin text-gray-400 mx-auto" />;
  if (synced) {
    return <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><Check className="w-3 h-3" /> Synced</span>;
  }
  return (
    <button onClick={onSync} className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700">
      <AlertCircle className="w-3 h-3" /> Sync
    </button>
  );
}

function ProductTable({
  products,
  columns,
  syncingId,
  onSync,
  onDelete,
}: {
  products: Product[];
  columns: { key: string; label: string; render: (p: Product) => string; align?: string }[];
  syncingId: string | null;
  onSync: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full">
        <thead><tr className="border-b border-gray-100">
          {columns.map(col => (
            <th key={col.key} className={`text-${col.align ?? 'left'} text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5`}>{col.label}</th>
          ))}
          <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Synced</th>
          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5"></th>
        </tr></thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
              {columns.map(col => (
                <td key={col.key} className={`px-4 py-2.5 text-sm ${col.align === 'right' ? 'text-right font-medium' : ''} text-gray-900`}>
                  {col.render(p)}
                </td>
              ))}
              <td className="px-4 py-2.5 text-center">
                <SyncBadge synced={!!p.stripe_product_id} syncing={syncingId === p.id} onSync={() => onSync(p.id)} />
              </td>
              <td className="px-4 py-2.5 text-right">
                <button onClick={() => onDelete(p.id, p.name)} className="text-xs text-red-400 hover:text-red-600">
                  <Trash2 className="w-3 h-3" />
                </button>
              </td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr><td colSpan={columns.length + 2} className="px-4 py-6 text-center text-sm text-gray-400">No products.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
