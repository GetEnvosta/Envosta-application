'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Loader2, Plus, Save, Trash2, DollarSign, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface TldPricing {
  id: string;
  tld: string;
  registration_price_cad: number;
  renewal_price_cad: number;
  transfer_price_cad: number;
  stripe_product_id: string | null;
  stripe_price_id_yearly: string | null;
  active: boolean;
}

export default function DomainPricingPage() {
  const [pricing, setPricing] = useState<TldPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // New TLD form
  const [showAdd, setShowAdd] = useState(false);
  const [newTld, setNewTld] = useState('');
  const [newReg, setNewReg] = useState('');
  const [newRenew, setNewRenew] = useState('');
  const [newTransfer, setNewTransfer] = useState('');

  useEffect(() => {
    fetchPricing();
  }, []);

  async function fetchPricing() {
    const supabase = createClient();
    const { data } = await supabase
      .from('domain_pricing')
      .select('*')
      .order('tld', { ascending: true });
    setPricing(data ?? []);
    setLoading(false);
  }

  function centsToDisplay(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  function displayToCents(display: string): number {
    return Math.round(parseFloat(display || '0') * 100);
  }

  function handleUpdate(item: TldPricing, field: string, value: string) {
    const stringFields = ['stripe_product_id', 'stripe_price_id_yearly'];
    const boolFields = ['active'];
    let parsed: any;
    if (boolFields.includes(field)) parsed = value === 'true';
    else if (stringFields.includes(field)) parsed = value || null;
    else parsed = displayToCents(value);
    setPricing(prev => prev.map(p => p.id === item.id ? { ...p, [field]: parsed } : p));
  }

  async function handleSave(item: TldPricing) {
    setSaving(item.id);
    setError('');
    setSuccess('');

    const supabase = createClient();
    const { error: err } = await supabase
      .from('domain_pricing')
      .update({
        registration_price_cad: item.registration_price_cad,
        renewal_price_cad: item.renewal_price_cad,
        transfer_price_cad: item.transfer_price_cad,
        stripe_product_id: item.stripe_product_id,
        stripe_price_id_yearly: item.stripe_price_id_yearly,
        active: item.active,
      })
      .eq('id', item.id);

    if (err) {
      setError(`Failed to update .${item.tld}: ${err.message}`);
      setSaving(null);
      return;
    }

    // Sync to Stripe
    try {
      const res = await fetch('/api/admin/sync-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'domain_tld',
          id: item.id,
          data: {
            tld: item.tld,
            renewal_price_cad: item.renewal_price_cad,
            stripe_product_id: item.stripe_product_id,
            stripe_price_id_yearly: item.stripe_price_id_yearly,
            active: item.active,
          },
        }),
      });
      const result = await res.json();
      if (res.ok && result.stripe_product_id) {
        setPricing(prev => prev.map(p => p.id === item.id ? {
          ...p,
          stripe_product_id: result.stripe_product_id,
          stripe_price_id_yearly: result.stripe_price_id_yearly,
        } : p));
        setSuccess(`.${item.tld} pricing updated + synced to Stripe`);
      } else {
        setSuccess(`.${item.tld} pricing updated (Stripe sync: ${result.error ?? 'failed'})`);
      }
    } catch {
      setSuccess(`.${item.tld} pricing updated (Stripe sync failed)`);
    }
    setSaving(null);
  }

  async function handleDelete(item: TldPricing) {
    if (!confirm(`Remove .${item.tld} from pricing?`)) return;

    const supabase = createClient();
    const { error: err } = await supabase
      .from('domain_pricing')
      .delete()
      .eq('id', item.id);

    if (err) {
      setError(`Failed to delete .${item.tld}: ${err.message}`);
    } else {
      setPricing(prev => prev.filter(p => p.id !== item.id));
      setSuccess(`.${item.tld} removed`);
    }
  }

  async function handleAdd() {
    if (!newTld.trim()) return;
    setError('');
    setSuccess('');
    setSaving('new');

    const supabase = createClient();
    const { data, error: err } = await supabase
      .from('domain_pricing')
      .insert({
        tld: newTld.toLowerCase().replace('.', '').trim(),
        registration_price_cad: displayToCents(newReg || '15'),
        renewal_price_cad: displayToCents(newRenew || '15'),
        transfer_price_cad: displayToCents(newTransfer || '15'),
        active: true,
      })
      .select()
      .single();

    if (err) {
      setError(`Failed to add .${newTld}: ${err.message}`);
    } else if (data) {
      setPricing(prev => [...prev, data].sort((a, b) => a.tld.localeCompare(b.tld)));
      setNewTld('');
      setNewReg('');
      setNewRenew('');
      setNewTransfer('');
      setShowAdd(false);
      setSuccess(`.${data.tld} added`);
    }
    setSaving(null);
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="card p-6 space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-10 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Products
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Domain Pricing</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage TLD registration, renewal, and transfer prices (CAD).</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              setSyncing(true);
              setError('');
              setSuccess('');
              try {
                const res = await fetch('/api/admin/sync-stripe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ type: 'sync_all' }),
                });
                const data = await res.json();
                if (res.ok) {
                  setSuccess(`Synced: ${data.results?.join(', ') || 'All up to date'}`);
                  fetchPricing();
                } else {
                  setError(data.error ?? 'Sync failed');
                }
              } catch { setError('Sync failed'); }
              setSyncing(false);
            }}
            disabled={syncing}
            className="btn-admin text-sm py-2 px-3.5 inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync All to Stripe'}
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="btn-admin text-sm py-2 px-3.5 inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add TLD
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 mb-4">{success}</div>
      )}

      {/* Add new TLD form */}
      {showAdd && (
        <div className="card p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Add New TLD</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
            <div>
              <label className="label">TLD</label>
              <input type="text" className="input" placeholder="com" value={newTld}
                onChange={e => setNewTld(e.target.value)} />
            </div>
            <div>
              <label className="label">Registration ($)</label>
              <input type="number" step="0.01" className="input" placeholder="15.00" value={newReg}
                onChange={e => setNewReg(e.target.value)} />
            </div>
            <div>
              <label className="label">Renewal ($)</label>
              <input type="number" step="0.01" className="input" placeholder="15.00" value={newRenew}
                onChange={e => setNewRenew(e.target.value)} />
            </div>
            <div>
              <label className="label">Transfer ($)</label>
              <input type="number" step="0.01" className="input" placeholder="15.00" value={newTransfer}
                onChange={e => setNewTransfer(e.target.value)} />
            </div>
            <button
              onClick={handleAdd}
              disabled={saving === 'new'}
              className="btn-admin text-sm py-2.5"
            >
              {saving === 'new' ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Pricing table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">TLD</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Registration</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Renewal</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Transfer</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Stripe Product ID</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Stripe Price ID</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pricing.map(item => (
              <tr key={item.id} className="hover:bg-gray-50/50">
                <td className="px-5 py-3 font-medium text-gray-900">.{item.tld}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      className="w-20 rounded border border-gray-200 px-2 py-1 text-sm"
                      value={centsToDisplay(item.registration_price_cad)}
                      onChange={e => handleUpdate(item, 'registration_price_cad', e.target.value)}
                    />
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      className="w-20 rounded border border-gray-200 px-2 py-1 text-sm"
                      value={centsToDisplay(item.renewal_price_cad)}
                      onChange={e => handleUpdate(item, 'renewal_price_cad', e.target.value)}
                    />
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      className="w-20 rounded border border-gray-200 px-2 py-1 text-sm"
                      value={centsToDisplay(item.transfer_price_cad)}
                      onChange={e => handleUpdate(item, 'transfer_price_cad', e.target.value)}
                    />
                  </div>
                </td>
                <td className="px-5 py-3">
                  <input
                    type="text"
                    className="w-36 rounded border border-gray-200 px-2 py-1 text-xs font-mono"
                    placeholder="prod_..."
                    value={item.stripe_product_id ?? ''}
                    onChange={e => handleUpdate(item, 'stripe_product_id', e.target.value)}
                  />
                </td>
                <td className="px-5 py-3">
                  <input
                    type="text"
                    className="w-36 rounded border border-gray-200 px-2 py-1 text-xs font-mono"
                    placeholder="price_..."
                    value={item.stripe_price_id_yearly ?? ''}
                    onChange={e => handleUpdate(item, 'stripe_price_id_yearly', e.target.value)}
                  />
                </td>
                <td className="px-5 py-3">
                  <select
                    className="rounded border border-gray-200 px-2 py-1 text-sm"
                    value={item.active ? 'true' : 'false'}
                    onChange={e => handleUpdate(item, 'active', e.target.value)}
                  >
                    <option value="true">Active</option>
                    <option value="false">Hidden</option>
                  </select>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSave(item)}
                      disabled={saving === item.id}
                      className="text-xs text-admin-600 hover:text-admin-700 font-medium inline-flex items-center gap-1"
                    >
                      {saving === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Save
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="text-xs text-red-500 hover:text-red-700 inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
