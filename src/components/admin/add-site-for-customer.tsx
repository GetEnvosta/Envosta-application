'use client';

/**
 * Inline admin action: add another site to an existing customer.
 * Supports both paid (regular plan) and comped (no-charge) sites, plus
 * an optional coupon code that will be applied at the customer's next
 * checkout. Posts to /api/admin/add-site-for-customer.
 */

import { useState, useEffect } from 'react';
import { Loader2, Plus, X, Server } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

type Plan = {
  id: string;
  name: string;
  slug: string;
  price_cad: number | null;
};

export function AddSiteForCustomer({ customerId }: { customerId: string }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [productId, setProductId] = useState('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [comp, setComp] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    supabase
      .from('products')
      .select('id, name, slug, price_cad')
      .eq('type', 'hosting_plan')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        const list = (data ?? []) as Plan[];
        setPlans(list);
        if (list.length > 0 && !productId) setProductId(list[0].id);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleCreate() {
    if (!label.trim() || !productId) {
      setError('Site label and plan are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/add-site-for-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          label: label.trim(),
          productId,
          comp,
          couponCode: couponCode.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to add site');
        setSaving(false);
        return;
      }
      // Reload to show new site row
      window.location.reload();
    } catch {
      setError('Network error');
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white bg-admin-600 hover:bg-admin-700 rounded-md transition-colors"
      >
        <Plus className="w-3 h-3" /> Add Site
      </button>
    );
  }

  const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-admin-400 focus:ring-1 focus:ring-admin-400 outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
    <div className="w-96 max-w-full card p-4 border border-admin-200 bg-white shadow-lg space-y-3" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900 inline-flex items-center gap-2">
          <Server className="w-4 h-4 text-admin-600" /> Add Site
        </h4>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Site label *</label>
        <input
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          className={inputClass}
          placeholder="my-second-site"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Hosting plan *</label>
        <select
          value={productId}
          onChange={e => setProductId(e.target.value)}
          className={inputClass}
          disabled={plans.length === 0}
        >
          {plans.length === 0 && <option value="">Loading…</option>}
          {plans.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}{p.price_cad != null ? ` — $${p.price_cad} CAD/mo` : ''}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={comp} onChange={e => setComp(e.target.checked)} />
        Comp this site (no charge, no subscription)
      </label>
      {!comp && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Coupon code (optional)</label>
          <input
            type="text"
            value={couponCode}
            onChange={e => setCouponCode(e.target.value)}
            className={inputClass}
            placeholder="LAUNCH100"
          />
          <p className="text-[10px] text-gray-400 mt-0.5">Applied at customer's next checkout</p>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex justify-end">
        <button
          onClick={handleCreate}
          disabled={saving}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-admin-600 hover:bg-admin-700 rounded-md disabled:opacity-50"
        >
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          Add & Provision
        </button>
      </div>
    </div>
    </div>
  );
}
