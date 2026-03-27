'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import { ArrowLeft, Plus, Save, Trash2, Loader2, RefreshCw, Package } from 'lucide-react';

interface Addon {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_cad: number;
  billing_type: string;
  is_active: boolean;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  wpcloud_action: any;
  sort_order: number;
}

export default function AddonsPage() {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newAddon, setNewAddon] = useState({ name: '', slug: '', description: '', price_cad: '', billing_type: 'monthly' });

  useEffect(() => { fetchAddons(); }, []);

  async function fetchAddons() {
    const supabase = createClient();
    const { data } = await supabase.from('products').select('*').order('sort_order');
    setAddons(data ?? []);
    setLoading(false);
  }

  function updateAddon(id: string, field: string, value: any) {
    setAddons(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  }

  async function handleSave(addon: Addon) {
    setSaving(addon.id);
    setError('');
    setSuccess('');

    const supabase = createClient();
    const { error: err } = await supabase.from('products').update({
      name: addon.name,
      slug: addon.slug,
      description: addon.description,
      price_cad: addon.price_cad,
      billing_type: addon.billing_type,
      is_active: addon.is_active,
      sort_order: addon.sort_order,
      stripe_product_id: addon.stripe_product_id || null,
      stripe_price_id: addon.stripe_price_id || null,
    }).eq('id', addon.id);

    if (err) { setError(err.message); setSaving(null); return; }

    // Sync to Stripe
    try {
      const res = await fetch('/api/admin/sync-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'addon',
          id: addon.id,
          data: addon,
        }),
      });
      const result = await res.json();
      if (res.ok && result.stripe_product_id) {
        updateAddon(addon.id, 'stripe_product_id', result.stripe_product_id);
        updateAddon(addon.id, 'stripe_price_id', result.stripe_price_id);
        setSuccess(`${addon.name} saved & synced to Stripe`);
      } else {
        setSuccess(`${addon.name} saved (Stripe: ${result.error ?? 'not synced'})`);
      }
    } catch {
      setSuccess(`${addon.name} saved (Stripe sync failed)`);
    }
    setSaving(null);
  }

  async function handleAdd() {
    if (!newAddon.name || !newAddon.slug) return;
    setSaving('new');
    const supabase = createClient();
    const { data, error: err } = await supabase.from('products').insert({
      name: newAddon.name,
      slug: newAddon.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      description: newAddon.description || null,
      price_cad: Math.round(parseFloat(newAddon.price_cad || '0') * 100),
      billing_type: newAddon.billing_type,
      is_active: true,
    }).select().single();

    if (err) { setError(err.message); }
    else if (data) {
      setAddons(prev => [...prev, data]);
      setNewAddon({ name: '', slug: '', description: '', price_cad: '', billing_type: 'monthly' });
      setShowAdd(false);
      setSuccess(`${data.name} created`);
    }
    setSaving(null);
  }

  async function handleDelete(addon: Addon) {
    if (!confirm(`Delete ${addon.name}?`)) return;
    const supabase = createClient();
    await supabase.from('products').delete().eq('id', addon.id);
    setAddons(prev => prev.filter(a => a.id !== addon.id));
    setSuccess(`${addon.name} deleted`);
  }

  async function handleSyncAll() {
    setSyncing(true);
    setError('');
    setSuccess('');
    let results: string[] = [];
    for (const addon of addons.filter(a => !a.stripe_product_id || !a.stripe_price_id)) {
      try {
        const res = await fetch('/api/admin/sync-stripe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'addon', id: addon.id, data: addon }),
        });
        const data = await res.json();
        if (res.ok) {
          updateAddon(addon.id, 'stripe_product_id', data.stripe_product_id);
          updateAddon(addon.id, 'stripe_price_id', data.stripe_price_id);
          results.push(`${addon.name} ✓`);
        } else results.push(`${addon.name} ✗`);
      } catch { results.push(`${addon.name} ✗`); }
    }
    setSuccess(results.length ? results.join(', ') : 'All addons already synced');
    setSyncing(false);
  }

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 w-48 bg-gray-200 rounded" /></div>;

  return (
    <div>
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Products
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Plan Add-ons</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage add-ons that can be enabled per site on any hosting plan.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSyncAll} disabled={syncing} className="btn-admin text-sm py-2 px-3.5 inline-flex items-center gap-1.5">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync All to Stripe'}
          </button>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-admin text-sm py-2 px-3.5 inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">{error}</div>}
      {success && <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 mb-4">{success}</div>}

      {/* Add new */}
      {showAdd && (
        <div className="card p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">New Add-on Product</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
            <div><label className="label">Name</label><input className="input" placeholder="Bursting" value={newAddon.name} onChange={e => setNewAddon(p => ({ ...p, name: e.target.value }))} /></div>
            <div><label className="label">Slug</label><input className="input font-mono" placeholder="bursting" value={newAddon.slug} onChange={e => setNewAddon(p => ({ ...p, slug: e.target.value }))} /></div>
            <div><label className="label">Price (CAD)</label><input type="number" step="0.01" className="input" placeholder="200.00" value={newAddon.price_cad} onChange={e => setNewAddon(p => ({ ...p, price_cad: e.target.value }))} /></div>
            <div>
              <label className="label">Billing</label>
              <select className="input" value={newAddon.billing_type} onChange={e => setNewAddon(p => ({ ...p, billing_type: e.target.value }))}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="one_time">One-time</option>
              </select>
            </div>
            <button onClick={handleAdd} disabled={saving === 'new'} className="btn-admin text-sm py-2.5">
              {saving === 'new' ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Add'}
            </button>
          </div>
          <div className="mt-3"><label className="label">Description</label><input className="input" placeholder="What does this addon do?" value={newAddon.description} onChange={e => setNewAddon(p => ({ ...p, description: e.target.value }))} /></div>
        </div>
      )}

      {/* Addon list */}
      <div className="space-y-4">
        {addons.map(addon => (
          <div key={addon.id} className="card p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div><label className="label">Name</label><input className="input" value={addon.name} onChange={e => updateAddon(addon.id, 'name', e.target.value)} /></div>
              <div><label className="label">Slug</label><input className="input font-mono" value={addon.slug} onChange={e => updateAddon(addon.id, 'slug', e.target.value)} /></div>
              <div><label className="label">Price (cents CAD)</label><input type="number" className="input" value={addon.price_cad} onChange={e => updateAddon(addon.id, 'price_cad', parseInt(e.target.value) || 0)} /></div>
              <div>
                <label className="label">Billing</label>
                <select className="input" value={addon.billing_type} onChange={e => updateAddon(addon.id, 'billing_type', e.target.value)}>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="one_time">One-time</option>
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="label">Description</label>
              <input className="input" value={addon.description ?? ''} onChange={e => updateAddon(addon.id, 'description', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div><label className="label">Stripe Product ID</label><input className="input font-mono text-xs" placeholder="prod_..." value={addon.stripe_product_id ?? ''} onChange={e => updateAddon(addon.id, 'stripe_product_id', e.target.value || null)} /></div>
              <div><label className="label">Stripe Price ID</label><input className="input font-mono text-xs" placeholder="price_..." value={addon.stripe_price_id ?? ''} onChange={e => updateAddon(addon.id, 'stripe_price_id', e.target.value || null)} /></div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={addon.is_active} onChange={e => updateAddon(addon.id, 'is_active', e.target.checked)} className="rounded border-gray-300 text-admin-600" />
                  Active
                </label>
                <span className={addon.stripe_price_id ? 'badge-green text-xs' : 'badge-yellow text-xs'}>
                  {addon.stripe_price_id ? 'Synced to Stripe' : 'Not synced'}
                </span>
                {addon.stripe_price_id && <span className="text-xs text-gray-400 font-mono">{addon.stripe_price_id}</span>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleSave(addon)} disabled={saving === addon.id} className="text-xs text-admin-600 hover:text-admin-700 font-medium inline-flex items-center gap-1">
                  {saving === addon.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                </button>
                <button onClick={() => handleDelete(addon)} className="text-xs text-red-500 hover:text-red-700 inline-flex items-center gap-1">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
