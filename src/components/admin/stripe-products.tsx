'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Plus, ExternalLink, Check, AlertCircle, Trash2, Pencil, X, Save, Database, CreditCard, Loader2 } from 'lucide-react';

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

interface Verification {
  stripeProductExists: boolean;
  stripePriceId: string | null;
  stripePriceAmount: number | null;
  dbPriceUsd: number;
  priceMatches: boolean;
}

// Shared column widths for all tables
const COL = {
  name: 'w-[28%] text-left',
  billing: 'w-[10%] text-left',
  usd: 'w-[13%] text-right',
  cad: 'w-[13%] text-right',
  credits: 'w-[9%] text-right',
  db: 'w-[9%] text-center',
  stripe: 'w-[9%] text-center',
  actions: 'w-[9%] text-right',
} as const;

const TH = 'text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5';

function TableHead() {
  return (
    <thead>
      <tr className="border-b border-gray-100">
        <th className={`${TH} ${COL.name}`}>Product</th>
        <th className={`${TH} ${COL.billing}`}>Billing</th>
        <th className={`${TH} ${COL.usd}`}>USD Price</th>
        <th className={`${TH} ${COL.cad}`}>CAD Price</th>
        <th className={`${TH} ${COL.credits}`}>Credits</th>
        <th className={`${TH} ${COL.db}`}>DB</th>
        <th className={`${TH} ${COL.stripe}`}>Stripe</th>
        <th className={`${TH} ${COL.actions}`}></th>
      </tr>
    </thead>
  );
}

export function StripeProducts({
  initialPlans,
  initialOneTime,
  initialTlds,
}: {
  initialPlans: Product[];
  initialOneTime: Product[];
  initialTlds: Product[];
}) {
  const [plans, setPlans] = useState(initialPlans);
  const [oneTime, setOneTime] = useState(initialOneTime);
  const [tlds, setTlds] = useState(initialTlds);
  const [stripeOnly, setStripeOnly] = useState<StripeOnlyProduct[]>([]);
  const [verification, setVerification] = useState<Record<string, Verification>>({});
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadingStripe, setLoadingStripe] = useState(true);
  const [result, setResult] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);

  useEffect(() => { fetchStripeData(); }, []);

  async function fetchStripeData() {
    setLoadingStripe(true);
    try {
      const res = await fetch('/api/admin/stripe-products');
      if (res.ok) {
        const data = await res.json();
        setStripeOnly(data.stripeOnly ?? []);
        setVerification(data.verification ?? {});
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
        setTlds(prev => prev.map(update));
        if (data.stripe_price_amount !== undefined) {
          const dbPrice = [...plans, ...oneTime, ...tlds].find(p => p.id === id);
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
        setResult(`Synced ${data.results?.length ?? 0} products`);
        await fetchStripeData();
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
      if (data.id) window.location.reload();
      else setResult(data.error ?? 'Failed to create');
    } catch { setResult('Failed to create'); }
    setCreating(false);
  }

  async function deleteProduct(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This will also deactivate it in Stripe if linked.`)) return;
    try {
      const res = await fetch('/api/admin/create-product', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.deactivated) {
          setResult(data.message ?? 'Product deactivated (has active subscriptions)');
          setPlans(prev => prev.filter(p => p.id !== id));
          setOneTime(prev => prev.filter(p => p.id !== id));
          setTlds(prev => prev.filter(p => p.id !== id));
        } else {
          window.location.reload();
        }
      } else {
        const data = await res.json();
        setResult(data.error ?? 'Delete failed');
      }
    } catch { setResult('Delete failed'); }
  }

  function startEdit(product: any, fields: string[]) {
    setEditingId(product.id);
    const vals: Record<string, string> = {};
    for (const f of fields) {
      if (f === 'price_usd' || f === 'price_cad' || f === 'price_yearly_usd' || f === 'price_yearly_cad') {
        vals[f] = ((product[f] ?? 0) / 100).toFixed(2);
      } else {
        vals[f] = String(product[f] ?? '');
      }
    }
    setEditFields(vals);
  }

  async function saveEdit(id: string) {
    setSaving(true);
    const updates: Record<string, any> = {};
    for (const [key, val] of Object.entries(editFields)) {
      if (key.includes('price')) {
        updates[key] = Math.round(parseFloat(val || '0') * 100);
      } else if (key === 'monthly_credit_cost') {
        updates[key] = parseFloat(val || '0');
      } else {
        updates[key] = val;
      }
    }
    try {
      const res = await fetch('/api/admin/create-product', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      if (res.ok) {
        const updateFn = (p: any) => p.id === id ? { ...p, ...updates } : p;
        setPlans(prev => prev.map(updateFn));
        setOneTime(prev => prev.map(updateFn));
        setTlds(prev => prev.map(updateFn));
        setEditingId(null);
        await syncProduct(id);
      }
    } catch { /* ignore */ }
    setSaving(false);
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

  // Unified product row (view mode)
  function ProductRow({ p, displayName }: { p: Product; displayName?: string }) {
    return (
      <>
        <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{displayName ?? p.name}</td>
        <td className="px-4 py-2.5 text-xs text-gray-500">{billingLabel(p.billing)}</td>
        <td className={`px-4 py-2.5 text-sm text-right font-medium ${priceColor(p.id)}`}>
          {fmtPrice(p.price_usd ?? 0)}{billingSuffix(p.billing)}
          <StripePriceHint v={verification[p.id]} />
        </td>
        <td className="px-4 py-2.5 text-sm text-right text-gray-500">
          {fmtPrice(p.price_cad)}{billingSuffix(p.billing)}
        </td>
        <td className="px-4 py-2.5 text-sm text-right text-gray-500">
          {p.monthly_credit_cost ? `${p.monthly_credit_cost}/mo` : '—'}
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
      </>
    );
  }

  // Unified edit row
  function ProductEditRow({ p, fields, displayName }: { p: Product; fields: string[]; displayName?: string }) {
    const showName = fields.includes('name');
    const showBilling = fields.includes('billing');
    const showCredits = fields.includes('monthly_credit_cost');
    return (
      <>
        <td className="px-4 py-2">
          {showName ? (
            <input value={editFields.name ?? ''} onChange={e => setEditFields(f => ({ ...f, name: e.target.value }))}
              className="input text-sm py-1 px-2 w-full" />
          ) : (
            <span className="text-sm font-medium text-gray-900">{displayName ?? p.name}</span>
          )}
        </td>
        <td className="px-4 py-2">
          {showBilling ? (
            <select value={editFields.billing ?? 'monthly'} onChange={e => setEditFields(f => ({ ...f, billing: e.target.value }))}
              className="input text-sm py-1 px-2 w-full">
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="one_time">One-time</option>
            </select>
          ) : (
            <span className="text-xs text-gray-500">{billingLabel(p.billing)}</span>
          )}
        </td>
        <td className="px-4 py-2">
          <div className="flex items-center justify-end gap-1">
            <span className="text-xs text-gray-400">$</span>
            <input value={editFields.price_usd ?? ''} onChange={e => setEditFields(f => ({ ...f, price_usd: e.target.value }))}
              type="number" step="0.01" min="0" className="w-24 input text-sm py-1 px-2 text-right" />
          </div>
        </td>
        <td className="px-4 py-2">
          <div className="flex items-center justify-end gap-1">
            <span className="text-xs text-gray-400">$</span>
            <input value={editFields.price_cad ?? ''} onChange={e => setEditFields(f => ({ ...f, price_cad: e.target.value }))}
              type="number" step="0.01" min="0" className="w-24 input text-sm py-1 px-2 text-right" />
          </div>
        </td>
        <td className="px-4 py-2">
          {showCredits ? (
            <input value={editFields.monthly_credit_cost ?? ''} onChange={e => setEditFields(f => ({ ...f, monthly_credit_cost: e.target.value }))}
              type="number" step="1" min="0" className="w-16 input text-sm py-1 px-2 text-right" />
          ) : (
            <span className="text-sm text-gray-400 block text-right">—</span>
          )}
        </td>
        <td colSpan={2} className="px-4 py-2 text-center">
          <div className="flex items-center justify-center gap-1">
            <button onClick={() => saveEdit(p.id)} disabled={saving}
              className="text-emerald-600 hover:bg-emerald-50 rounded p-1">
              <Save className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setEditingId(null)}
              className="text-gray-400 hover:bg-gray-100 rounded p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
        <td />
      </>
    );
  }

  // Action buttons
  function ActionButtons({ p, editFieldsList }: { p: Product; editFieldsList: string[] }) {
    return (
      <td className="px-4 py-2.5 text-right">
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => startEdit(p, editFieldsList)} className="text-gray-400 hover:text-admin-600 p-1">
            <Pencil className="w-3 h-3" />
          </button>
          <button onClick={() => deleteProduct(p.id, p.name)} className="text-red-400 hover:text-red-600 p-1">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </td>
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
      <Section title="One-Time Products" subtitle="Single-charge products (studio builds, migrations, etc)."
        onAdd={() => quickCreate('one_time_service', 'New Service', 'one_time', 0)} addLabel="Add Product" creating={creating}>
        <table className="w-full table-fixed">
          <TableHead />
          <tbody>
            {oneTime.map(p => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                {editingId === p.id
                  ? <ProductEditRow p={p} fields={['name', 'price_usd', 'price_cad']} />
                  : <><ProductRow p={p} /><ActionButtons p={p} editFieldsList={['name', 'price_usd', 'price_cad']} /></>
                }
              </tr>
            ))}
            {oneTime.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-400">No one-time products.</td></tr>
            )}
          </tbody>
        </table>
      </Section>

      {/* ═══ PRICING PLANS ═══ */}
      <Section title="Pricing Plans" subtitle="Recurring hosting subscription plans."
        onAdd={() => quickCreate('hosting_plan', 'New Plan', 'monthly', 0)} addLabel="Add Plan" creating={creating}>
        <table className="w-full table-fixed">
          <TableHead />
          <tbody>
            {plans.map(p => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                {editingId === p.id
                  ? <ProductEditRow p={p} fields={['name', 'billing', 'price_usd', 'price_cad', 'monthly_credit_cost']} />
                  : <><ProductRow p={p} /><ActionButtons p={p} editFieldsList={['name', 'billing', 'price_usd', 'price_cad', 'monthly_credit_cost']} /></>
                }
              </tr>
            ))}
            {plans.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-400">No plans.</td></tr>
            )}
          </tbody>
        </table>
      </Section>

      {/* ═══ DOMAIN TLDs ═══ */}
      <Section title="Domain TLDs" subtitle="Annual domain registration pricing."
        onAdd={() => quickCreate('domain_tld', 'New TLD', 'yearly', 0)} addLabel="Add TLD" creating={creating}>
        <table className="w-full table-fixed">
          <TableHead />
          <tbody>
            {tlds.map(tld => (
              <tr key={tld.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                {editingId === tld.id
                  ? <ProductEditRow p={tld} fields={['price_usd', 'price_cad']} displayName={`.${tld.slug}`} />
                  : <><ProductRow p={tld} displayName={`.${tld.slug}`} /><ActionButtons p={tld} editFieldsList={['price_usd', 'price_cad']} /></>
                }
              </tr>
            ))}
            {tlds.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-400">No domain TLDs configured.</td></tr>
            )}
          </tbody>
        </table>
      </Section>

      {/* ═══ NOT IN PLATFORM ═══ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Not in Platform</h3>
            <p className="text-xs text-gray-500">Active products in Stripe that aren't linked to any product in the database.</p>
          </div>
        </div>
        {loadingStripe ? (
          <div className="card p-6 text-center text-sm text-gray-400">
            <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Loading Stripe products...
          </div>
        ) : stripeOnly.length === 0 ? (
          <div className="card p-6 text-center text-sm text-gray-400">All Stripe products are linked.</div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className={`${TH} ${COL.name}`}>Product</th>
                  <th className={`${TH} ${COL.billing}`}>Billing</th>
                  <th className={`${TH} ${COL.usd}`}>USD Price</th>
                  <th className={`${TH} ${COL.cad}`}>CAD Price</th>
                  <th className={`${TH} ${COL.credits}`}>Credits</th>
                  <th className={`${TH} ${COL.db}`}>DB</th>
                  <th className={`${TH} ${COL.stripe}`}>Stripe</th>
                  <th className={`${TH} ${COL.actions}`}></th>
                </tr>
              </thead>
              <tbody>
                {stripeOnly.map(p => (
                  <tr key={p.stripe_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-900 truncate" title={p.name}>{p.name}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">—</td>
                    <td className="px-4 py-2.5 text-sm text-right text-gray-400">—</td>
                    <td className="px-4 py-2.5 text-sm text-right text-gray-400">—</td>
                    <td className="px-4 py-2.5 text-sm text-right text-gray-400">—</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400" title="Not in database">
                        <Database className="w-3 h-3" /> <X className="w-3 h-3" />
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <a href={`https://dashboard.stripe.com/products/${p.stripe_id}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-emerald-600" title={p.stripe_id}>
                        <CreditCard className="w-3 h-3" /> <Check className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="px-4 py-2.5 text-right">
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
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────

function Section({ title, subtitle, onAdd, addLabel, creating, children }: {
  title: string; subtitle: string; onAdd: () => void; addLabel: string; creating: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <button onClick={onAdd} disabled={creating}
          className="btn-admin text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> {addLabel}
        </button>
      </div>
      <div className="card overflow-hidden">{children}</div>
    </div>
  );
}

function DbSyncBadge({ hasStripeId }: { hasStripeId: boolean }) {
  if (hasStripeId) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600" title="Product ID stored in database">
        <Database className="w-3 h-3" /> <Check className="w-3 h-3" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-500" title="No Stripe product ID in database">
      <Database className="w-3 h-3" /> <X className="w-3 h-3" />
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
      <button onClick={onSync} className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700" title="Not linked to Stripe">
        <CreditCard className="w-3 h-3" /> <AlertCircle className="w-3 h-3" /> Link
      </button>
    );
  }
  if (!verification) {
    return (
      <button onClick={onSync} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-admin-600" title="Click to verify">
        <CreditCard className="w-3 h-3" /> Verify
      </button>
    );
  }
  if (!verification.stripeProductExists) {
    return (
      <button onClick={onSync} className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600" title="Product not found in Stripe">
        <CreditCard className="w-3 h-3" /> <X className="w-3 h-3" /> Missing
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
    <button onClick={onSync} className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700"
      title={`Price mismatch: Stripe $${((verification.stripePriceAmount ?? 0) / 100).toFixed(2)}, DB $${(verification.dbPriceUsd / 100).toFixed(2)}`}>
      <CreditCard className="w-3 h-3" /> <AlertCircle className="w-3 h-3" /> Sync
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
