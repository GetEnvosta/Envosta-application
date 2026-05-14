'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Plus, ExternalLink, Check, AlertCircle, Trash2, Pencil, X, Save, Database, CreditCard, Loader2, Unlink } from 'lucide-react';

interface Product {
  id: string;
  type: string;
  name: string;
  slug: string;
  billing: string;
  price_cad: number;
  price_usd: number;
  price_yearly_cad: number | null;
  price_yearly_usd: number | null;
  is_active: boolean;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  stripe_price_id_yearly?: string | null;
  stripe_price_id_cad?: string | null;
  stripe_price_id_yearly_cad?: string | null;
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

interface Verification {
  stripeProductExists: boolean;
  stripePriceId: string | null;
  stripePriceAmount: number | null;
  dbPriceUsd: number;
  priceMatches: boolean;
}

// Shared column widths
const COL = {
  name: 'w-[28%] text-left',
  billing: 'w-[10%] text-left',
  usd: 'w-[14%] text-right',
  cad: 'w-[14%] text-right',
  db: 'w-[11%] text-center',
  stripe: 'w-[11%] text-center',
  actions: 'w-[12%] text-right',
} as const;

const TH = 'text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5';

function TableHead({ onAdd, addLabel, creating }: { onAdd?: () => void; addLabel?: string; creating?: boolean }) {
  return (
    <thead>
      <tr className="border-b border-gray-100">
        <th className={`${TH} ${COL.name}`}>Product</th>
        <th className={`${TH} ${COL.billing}`}>Billing</th>
        <th className={`${TH} ${COL.usd}`}>USD Price</th>
        <th className={`${TH} ${COL.cad}`}>CAD Price</th>
        <th className={`${TH} ${COL.db}`}>DB</th>
        <th className={`${TH} ${COL.stripe}`}>Stripe</th>
        <th className={`${TH} ${COL.actions}`}>
          {onAdd && (
            <button onClick={onAdd} disabled={creating}
              className="btn-admin text-[10px] py-1 px-2 inline-flex items-center gap-1">
              <Plus className="w-3 h-3" /> {addLabel ?? 'Add'}
            </button>
          )}
        </th>
      </tr>
    </thead>
  );
}

export function StripeProducts({
  initialPlans,
  initialOneTime,
  initialTlds,
  initialAddons = [],
  initialOther = [],
}: {
  initialPlans: Product[];
  initialOneTime: Product[];
  /** @deprecated Phase 3: TLDs no longer sync to Stripe. Kept to avoid
   * a breaking type change for callers; the value is ignored. */
  initialTlds?: Product[];
  initialAddons?: Product[];
  initialOther?: Product[];
}) {
  const [plans, setPlans] = useState(initialPlans);
  const [oneTime, setOneTime] = useState(initialOneTime);
  // Phase 3: TLDs are stored in public.tlds with inline checkout prices —
  // no Stripe Products. The TLDs section is removed from this UI.
  const [addons, setAddons] = useState(initialAddons);
  const [other, setOther] = useState(initialOther);
  const [stripeOnly, setStripeOnly] = useState<StripeOnlyProduct[]>([]);
  const [verification, setVerification] = useState<Record<string, Verification>>({});
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadingStripe, setLoadingStripe] = useState(true);
  const [result, setResult] = useState('');
  const [importingId, setImportingId] = useState<string | null>(null);

  // Modal state
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [desyncing, setDesyncing] = useState(false);

  useEffect(() => { fetchStripeData(); }, []);

  async function fetchStripeData() {
    setLoadingStripe(true);
    try {
      const res = await fetch('/api/admin/stripe-products');
      if (res.ok) {
        const data = await res.json();
        setStripeOnly(data.stripeOnly ?? []);
        setVerification(data.verification ?? {});
        // If stale Stripe IDs were auto-cleared from DB, reload to reflect changes
        if (data.staleCleared > 0) {
          setResult(`Cleared ${data.staleCleared} stale Stripe link${data.staleCleared > 1 ? 's' : ''} — reloading...`);
          setTimeout(() => window.location.reload(), 1500);
          return;
        }
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
        const update = (p: any) => p.id === id ? {
          ...p,
          stripe_product_id: data.stripe_product_id ?? p.stripe_product_id,
          stripe_price_id: data.stripe_price_id ?? p.stripe_price_id,
        } : p;
        setPlans(prev => prev.map(update));
        setOneTime(prev => prev.map(update));
        setAddons(prev => prev.map(update));
        setOther(prev => prev.map(update));
        if (data.stripe_price_amount !== undefined) {
          const dbPrice = [...plans, ...oneTime, ...addons, ...other].find(p => p.id === id);
          const effectivePrice = (dbPrice?.price_usd || dbPrice?.price_cad) ?? 0;
          setVerification(prev => ({
            ...prev,
            [id]: {
              stripeProductExists: true,
              stripePriceId: data.stripe_price_id,
              stripePriceAmount: data.stripe_price_amount,
              dbPriceUsd: effectivePrice,
              priceMatches: data.stripe_price_amount === effectivePrice,
            },
          }));
        }
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
        const results = data.results ?? [];
        setResult(results.join(' | '));
        await fetchStripeData();
        setTimeout(() => { setResult(''); window.location.reload(); }, 4000);
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
      if (data.id) window.location.reload();
      else setResult(data.error ?? 'Failed to create');
    } catch { setResult('Failed to create'); }
    setCreating(false);
  }

  async function deleteProduct(id: string, name: string) {
    if (!confirm(`Delete "${name}" from database?`)) return;
    try {
      const res = await fetch('/api/admin/create-product', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        const data = await res.json();
        setEditProduct(null);
        if (data.deactivated) {
          setResult(data.message ?? 'Product deactivated (has active subscriptions)');
        }
        setPlans(prev => prev.filter(p => p.id !== id));
        setOneTime(prev => prev.filter(p => p.id !== id));
        setAddons(prev => prev.filter(p => p.id !== id));
        setOther(prev => prev.filter(p => p.id !== id));
      } else {
        const data = await res.json();
        setResult(data.error ?? 'Delete failed');
      }
    } catch { setResult('Delete failed'); }
  }

  function openEdit(product: Product) {
    setEditProduct(product);
    setEditFields({
      name: product.name,
      billing: product.billing,
      price_usd: ((product.price_usd ?? 0) / 100).toFixed(2),
      price_cad: ((product.price_cad ?? 0) / 100).toFixed(2),
      price_yearly_usd: ((product.price_yearly_usd ?? 0) / 100).toFixed(2),
      price_yearly_cad: ((product.price_yearly_cad ?? 0) / 100).toFixed(2),
      stripe_product_id: product.stripe_product_id ?? '',
      stripe_price_id: product.stripe_price_id ?? '',
      stripe_price_id_yearly: product.stripe_price_id_yearly ?? '',
      stripe_price_id_cad: product.stripe_price_id_cad ?? '',
      stripe_price_id_yearly_cad: product.stripe_price_id_yearly_cad ?? '',
    });
  }

  async function saveEdit() {
    if (!editProduct) return;
    setSaving(true);
    const isHosting = editProduct.type === 'hosting_plan';
    const updates: Record<string, any> = {
      name: editFields.name,
      billing: editFields.billing,
      price_usd: Math.round(parseFloat(editFields.price_usd || '0') * 100),
      price_cad: Math.round(parseFloat(editFields.price_cad || '0') * 100),
      stripe_product_id: editFields.stripe_product_id?.trim() || null,
      stripe_price_id: editFields.stripe_price_id?.trim() || null,
      stripe_price_id_cad: editFields.stripe_price_id_cad?.trim() || null,
    };
    if (isHosting) {
      updates.price_yearly_usd = Math.round(parseFloat(editFields.price_yearly_usd || '0') * 100);
      updates.price_yearly_cad = Math.round(parseFloat(editFields.price_yearly_cad || '0') * 100);
      updates.stripe_price_id_yearly = editFields.stripe_price_id_yearly?.trim() || null;
      updates.stripe_price_id_yearly_cad = editFields.stripe_price_id_yearly_cad?.trim() || null;
    }
    try {
      const res = await fetch('/api/admin/create-product', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editProduct.id, ...updates }),
      });
      if (res.ok) {
        const updateFn = (p: any) => p.id === editProduct.id ? { ...p, ...updates } : p;
        setPlans(prev => prev.map(updateFn));
        setOneTime(prev => prev.map(updateFn));
        setAddons(prev => prev.map(updateFn));
        setOther(prev => prev.map(updateFn));
        setEditProduct(prev => prev ? { ...prev, ...updates } : null);
        // Auto-sync to Stripe
        await syncProduct(editProduct.id);
      }
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function desyncProduct() {
    if (!editProduct) return;
    if (!confirm('Unlink this product from Stripe? The Stripe product will remain but will no longer be associated with this DB product.')) return;
    setDesyncing(true);
    try {
      const res = await fetch('/api/admin/create-product', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editProduct.id,
          stripe_product_id: null,
          stripe_price_id: null,
          stripe_price_id_yearly: null,
          stripe_price_id_cad: null,
          stripe_price_id_yearly_cad: null,
        }),
      });
      if (res.ok) {
        const updateFn = (p: any) => p.id === editProduct.id ? {
          ...p, stripe_product_id: null, stripe_price_id: null,
          stripe_price_id_yearly: null,
          stripe_price_id_cad: null, stripe_price_id_yearly_cad: null,
        } : p;
        setPlans(prev => prev.map(updateFn));
        setOneTime(prev => prev.map(updateFn));
        setAddons(prev => prev.map(updateFn));
        setOther(prev => prev.map(updateFn));
        setEditProduct(prev => prev ? {
          ...prev, stripe_product_id: null, stripe_price_id: null,
          stripe_price_id_yearly: null,
          stripe_price_id_cad: null, stripe_price_id_yearly_cad: null,
        } : null);
        setVerification(prev => {
          const next = { ...prev };
          delete next[editProduct.id];
          return next;
        });
        await fetchStripeData();
      }
    } catch { /* ignore */ }
    setDesyncing(false);
  }

  async function importFromStripe(stripeProductId: string) {
    setImportingId(stripeProductId);
    try {
      const res = await fetch('/api/admin/sync-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'import', stripeProductId }),
      });
      if (res.ok) {
        setStripeOnly(prev => prev.filter(p => p.stripe_id !== stripeProductId));
        setResult('Imported — reloading...');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const data = await res.json();
        setResult(data.error ?? 'Import failed');
      }
    } catch { setResult('Import failed'); }
    setImportingId(null);
  }

  const fmtPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const billingLabel = (b: string) => b === 'monthly' ? 'Monthly' : b === 'yearly' ? 'Yearly' : b === 'one_time' ? 'One-time' : b;
  const billingSuffix = (b: string) => b === 'monthly' ? '/mo' : b === 'yearly' ? '/yr' : '';

  function priceColor(productId: string): string {
    const v = verification[productId];
    if (!v || !v.stripeProductExists) return 'text-gray-900';
    if (v.stripePriceAmount === null) return 'text-amber-600';
    return v.priceMatches ? 'text-emerald-600' : 'text-amber-600';
  }

  function ProductRow({ p, displayName }: { p: Product; displayName?: string }) {
    return (
      <>
        <td className="px-4 py-2.5 text-sm font-medium text-gray-900 truncate">{displayName ?? p.name}</td>
        <td className="px-4 py-2.5 text-xs text-gray-500">{billingLabel(p.billing)}</td>
        <td className={`px-4 py-2.5 text-sm text-right font-medium ${priceColor(p.id)}`}>
          {fmtPrice(p.price_usd ?? 0)}{billingSuffix(p.billing)}
          <StripePriceHint v={verification[p.id]} />
        </td>
        <td className="px-4 py-2.5 text-sm text-right text-gray-500">
          {fmtPrice(p.price_cad)}{billingSuffix(p.billing)}
        </td>
        <td className="px-4 py-2.5 text-center">
          <DbSyncBadge hasStripeId={!!p.stripe_product_id} />
        </td>
        <td className="px-4 py-2.5 text-center">
          <StripeLinkBadge
            stripeProductId={p.stripe_product_id}
            verification={verification[p.id]}
            syncing={syncingId === p.id}
            onSync={() => syncProduct(p.id)}
            loading={loadingStripe}
          />
        </td>
        <td className="px-4 py-2.5 text-right">
          <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-admin-600 p-1" title="Edit product">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </td>
      </>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">Manage products and pricing. Green prices = matched in Stripe. Amber = out of sync.</p>
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

      {loadingStripe && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying Stripe links...
        </div>
      )}

      {/* ═══ ONE-TIME PRODUCTS ═══ */}
      <Section title="One-Time Products" subtitle="Single-charge products (studio builds, migrations, etc).">
        <table className="w-full table-fixed">
          <TableHead onAdd={() => quickCreate('one_time_service', 'New Service', 'one_time', 0)} addLabel="Add Product" creating={creating} />
          <tbody>
            {oneTime.map(p => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer" onClick={() => openEdit(p)}>
                <ProductRow p={p} />
              </tr>
            ))}
            {oneTime.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-400">No one-time products.</td></tr>
            )}
          </tbody>
        </table>
      </Section>

      {/* ═══ PRICING PLANS ═══ */}
      <Section title="Pricing Plans" subtitle="Recurring hosting subscription plans.">
        <table className="w-full table-fixed">
          <TableHead onAdd={() => quickCreate('hosting_plan', 'New Plan', 'monthly', 0)} addLabel="Add Plan" creating={creating} />
          <tbody>
            {plans.map(p => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer" onClick={() => openEdit(p)}>
                <ProductRow p={p} />
              </tr>
            ))}
            {plans.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-400">No plans.</td></tr>
            )}
          </tbody>
        </table>
      </Section>

      {/* ═══ PLAN ADDONS ═══ */}
      {addons.length > 0 && (
        <Section title="Plan Addons" subtitle="Per-site addon features (bursting, WAF, etc).">
          <table className="w-full table-fixed">
            <TableHead onAdd={() => quickCreate('plan_addon', 'New Addon', 'monthly', 0)} addLabel="Add Addon" creating={creating} />
            <tbody>
              {addons.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer" onClick={() => openEdit(p)}>
                  <ProductRow p={p} />
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Phase 3: Domain TLDs section removed. TLDs live in public.tlds
          and use inline price_data at checkout — no Stripe Products. */}

      {/* ═══ OTHER PRODUCTS ═══ */}
      {other.length > 0 && (
        <Section title="Other Products" subtitle="Products with unrecognized types.">
          <table className="w-full table-fixed">
            <TableHead onAdd={() => quickCreate('one_time_service', 'New Product', 'one_time', 0)} addLabel="Add Product" creating={creating} />
            <tbody>
              {other.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer" onClick={() => openEdit(p)}>
                  <ProductRow p={p} />
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* "Not in Platform" — orphaned active Stripe products — moved to
          /admin/diagnostics Health tab so it sits with other sync drift. */}

      {/* ═══ EDIT MODAL ═══ */}
      {editProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditProduct(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Edit Product</h3>
              <button onClick={() => setEditProduct(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Product Name</label>
                <input value={editFields.name ?? ''} onChange={e => setEditFields(f => ({ ...f, name: e.target.value }))}
                  className="input w-full" />
              </div>

              {/* Billing frequency — only for non-hosting products. Hosting plans
                  expose both monthly + annual price fields, so this selector
                  would be redundant. */}
              {editProduct.type !== 'hosting_plan' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Billing Frequency</label>
                    <select value={editFields.billing ?? 'one_time'} onChange={e => setEditFields(f => ({ ...f, billing: e.target.value }))}
                      className="input w-full">
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                      <option value="one_time">One-time</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Prices: one bordered column per currency so it's obvious which
                  Stripe price ID belongs to which currency. */}
              {editProduct.type === 'hosting_plan' ? (
                <div className="grid grid-cols-2 gap-4">
                  <CurrencyColumn currency="USD" flag="🇺🇸">
                    <PriceWithIdField
                      label="Monthly" amountKey="price_usd" idKey="stripe_price_id"
                      fields={editFields} setFields={setEditFields}
                    />
                    <PriceWithIdField
                      label="Annual" amountKey="price_yearly_usd" idKey="stripe_price_id_yearly"
                      fields={editFields} setFields={setEditFields}
                    />
                  </CurrencyColumn>
                  <CurrencyColumn currency="CAD" flag="🇨🇦">
                    <PriceWithIdField
                      label="Monthly" amountKey="price_cad" idKey="stripe_price_id_cad"
                      fields={editFields} setFields={setEditFields}
                    />
                    <PriceWithIdField
                      label="Annual" amountKey="price_yearly_cad" idKey="stripe_price_id_yearly_cad"
                      fields={editFields} setFields={setEditFields}
                    />
                  </CurrencyColumn>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <CurrencyColumn currency="USD" flag="🇺🇸">
                    <PriceWithIdField
                      label="Price" amountKey="price_usd" idKey="stripe_price_id"
                      fields={editFields} setFields={setEditFields}
                    />
                  </CurrencyColumn>
                  <CurrencyColumn currency="CAD" flag="🇨🇦">
                    <PriceWithIdField
                      label="Price" amountKey="price_cad" idKey="stripe_price_id_cad"
                      fields={editFields} setFields={setEditFields}
                    />
                  </CurrencyColumn>
                </div>
              )}

              {/* Stripe Product ID — shared by all prices, kept separate. */}
              <div className="pt-3 border-t border-gray-100">
                <label className="block text-xs font-medium text-gray-500 mb-1">Stripe Product ID</label>
                <input value={editFields.stripe_product_id ?? ''} onChange={e => setEditFields(f => ({ ...f, stripe_product_id: e.target.value }))}
                  placeholder="prod_..." className="input w-full font-mono text-xs" />
                {editFields.stripe_product_id && (
                  <a href={`https://dashboard.stripe.com/products/${editFields.stripe_product_id}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-admin-600 hover:text-admin-700 mt-2">
                    <ExternalLink className="w-3 h-3" /> Open product in Stripe
                  </a>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <div className="flex items-center gap-2">
                {/* Delete: only if NOT linked to Stripe */}
                {!editProduct.stripe_product_id && (
                  <button onClick={() => deleteProduct(editProduct.id, editProduct.name)}
                    className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                )}
                {/* Desync: only if linked to Stripe */}
                {editProduct.stripe_product_id && (
                  <button onClick={desyncProduct} disabled={desyncing}
                    className="inline-flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors">
                    {desyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
                    Desync from Stripe
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditProduct(null)} className="btn-admin-secondary text-xs py-1.5 px-4">
                  Cancel
                </button>
                <button onClick={saveEdit} disabled={saving}
                  className="btn-admin text-xs py-1.5 px-4 inline-flex items-center gap-1.5">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save & Sync
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────

/**
 * Currency column wrapper. Wraps all prices (monthly + annual) for a single
 * currency in one bordered card with a clear "USD"/"CAD" header so it's
 * impossible to confuse which Stripe price ID belongs to which currency.
 */
function CurrencyColumn({ currency, flag, children }: {
  currency: 'USD' | 'CAD'; flag: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border-2 border-gray-200 bg-white overflow-hidden">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        <span className="text-base leading-none">{flag}</span>
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">{currency}</span>
      </div>
      <div className="p-3 space-y-3">{children}</div>
    </div>
  );
}

/**
 * Paired amount + Stripe price-ID input. Lives inside a <CurrencyColumn>
 * so the surrounding card already conveys USD vs CAD — the label here
 * just identifies the period (Monthly / Annual / Price).
 */
function PriceWithIdField({
  label, amountKey, idKey, fields, setFields,
}: {
  label: string;
  amountKey: string;
  idKey: string;
  fields: Record<string, string>;
  setFields: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
        <input
          value={fields[amountKey] ?? ''}
          onChange={e => setFields(f => ({ ...f, [amountKey]: e.target.value }))}
          type="number" step="0.01" min="0"
          className="input w-full pl-7"
          placeholder="0.00"
        />
      </div>
      <input
        value={fields[idKey] ?? ''}
        onChange={e => setFields(f => ({ ...f, [idKey]: e.target.value }))}
        placeholder="price_..."
        className="input w-full font-mono text-xs"
      />
    </div>
  );
}

function Section({ title, subtitle, children }: {
  title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      <div className="card overflow-hidden">{children}</div>
    </div>
  );
}

function DbSyncBadge({ hasStripeId }: { hasStripeId: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${hasStripeId ? 'text-emerald-600' : 'text-amber-500'}`}
      title={hasStripeId ? 'Product ID stored in database' : 'No Stripe product ID in database'}>
      <Database className="w-3 h-3" /> {hasStripeId ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
    </span>
  );
}

function StripeLinkBadge({ stripeProductId, verification, syncing, onSync, loading }: {
  stripeProductId: string | null;
  verification?: Verification;
  syncing: boolean;
  onSync: () => void;
  loading: boolean;
}) {
  if (syncing) return <RefreshCw className="w-3.5 h-3.5 animate-spin text-gray-400 mx-auto" />;
  if (loading) return <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-300 mx-auto" />;

  if (!stripeProductId) {
    return (
      <button onClick={e => { e.stopPropagation(); onSync(); }}
        className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700" title="Not linked to Stripe">
        <CreditCard className="w-3 h-3" /> <AlertCircle className="w-3 h-3" />
      </button>
    );
  }
  if (!verification) {
    return (
      <button onClick={e => { e.stopPropagation(); onSync(); }}
        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-admin-600" title="Click to verify">
        <CreditCard className="w-3 h-3" /> ?
      </button>
    );
  }
  if (!verification.stripeProductExists) {
    return (
      <button onClick={e => { e.stopPropagation(); onSync(); }}
        className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600" title="Product not found in Stripe">
        <CreditCard className="w-3 h-3" /> <X className="w-3 h-3" />
      </button>
    );
  }
  if (verification.priceMatches) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600" title="Linked and prices match">
        <CreditCard className="w-3 h-3" /> <Check className="w-3 h-3" />
      </span>
    );
  }
  return (
    <button onClick={e => { e.stopPropagation(); onSync(); }}
      className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700"
      title={`Stripe $${((verification.stripePriceAmount ?? 0) / 100).toFixed(2)} vs DB $${(verification.dbPriceUsd / 100).toFixed(2)}`}>
      <CreditCard className="w-3 h-3" /> <AlertCircle className="w-3 h-3" />
    </button>
  );
}

function StripePriceHint({ v }: { v?: Verification }) {
  if (!v || v.priceMatches || v.stripePriceAmount === null) return null;
  return (
    <div className="text-[10px] text-amber-500 font-normal">
      Stripe: ${(v.stripePriceAmount / 100).toFixed(2)}
    </div>
  );
}

function StripeIdRow({ label, value, type }: { label: string; value: string | null | undefined; type: 'products' | 'prices' }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <a href={`https://dashboard.stripe.com/${type}/${value}`} target="_blank" rel="noopener noreferrer"
        className="text-xs font-mono text-admin-600 hover:text-admin-700 inline-flex items-center gap-1">
        {value.length > 28 ? `${value.slice(0, 28)}...` : value}
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}
