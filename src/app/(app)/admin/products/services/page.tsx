'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import { ArrowLeft, Plus, Save, Trash2, Loader2, RefreshCw, Briefcase } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_cad: number;
  is_active: boolean;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  sort_order: number;
}

export default function OneTimeServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newService, setNewService] = useState({ name: '', slug: '', description: '', price_cad: '' });

  useEffect(() => { fetchServices(); }, []);

  async function fetchServices() {
    const supabase = createClient();
    const { data } = await supabase.from('one_time_services').select('*').order('sort_order');
    setServices(data ?? []);
    setLoading(false);
  }

  function updateService(id: string, field: string, value: any) {
    setServices(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }

  async function handleSave(service: Service) {
    setSaving(service.id);
    setError('');
    setSuccess('');

    const supabase = createClient();
    const { error: err } = await supabase.from('one_time_services').update({
      name: service.name,
      slug: service.slug,
      description: service.description,
      price_cad: service.price_cad,
      is_active: service.is_active,
      sort_order: service.sort_order,
      stripe_product_id: service.stripe_product_id || null,
      stripe_price_id: service.stripe_price_id || null,
    }).eq('id', service.id);

    if (err) { setError(err.message); setSaving(null); return; }

    // Sync to Stripe
    try {
      const res = await fetch('/api/admin/sync-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'one_time_service',
          id: service.id,
          data: service,
        }),
      });
      const result = await res.json();
      if (res.ok && result.stripe_product_id) {
        updateService(service.id, 'stripe_product_id', result.stripe_product_id);
        updateService(service.id, 'stripe_price_id', result.stripe_price_id);
        setSuccess(`${service.name} saved & synced to Stripe`);
      } else {
        setSuccess(`${service.name} saved (Stripe: ${result.error ?? 'not synced'})`);
      }
    } catch {
      setSuccess(`${service.name} saved (Stripe sync failed)`);
    }
    setSaving(null);
  }

  async function handleAdd() {
    if (!newService.name || !newService.slug) return;
    setSaving('new');
    const supabase = createClient();
    const { data, error: err } = await supabase.from('one_time_services').insert({
      name: newService.name,
      slug: newService.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      description: newService.description || null,
      price_cad: Math.round(parseFloat(newService.price_cad || '0') * 100),
      is_active: true,
    }).select().single();

    if (err) { setError(err.message); }
    else if (data) {
      setServices(prev => [...prev, data]);
      setNewService({ name: '', slug: '', description: '', price_cad: '' });
      setShowAdd(false);
      setSuccess(`${data.name} created`);
    }
    setSaving(null);
  }

  async function handleDelete(service: Service) {
    if (!confirm(`Delete ${service.name}?`)) return;
    const supabase = createClient();
    await supabase.from('one_time_services').delete().eq('id', service.id);
    setServices(prev => prev.filter(s => s.id !== service.id));
    setSuccess(`${service.name} deleted`);
  }

  async function handleSyncAll() {
    setSyncing(true);
    setError('');
    setSuccess('');
    const results: string[] = [];
    for (const service of services.filter(s => !s.stripe_product_id || !s.stripe_price_id)) {
      try {
        const res = await fetch('/api/admin/sync-stripe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'one_time_service', id: service.id, data: service }),
        });
        const data = await res.json();
        if (res.ok) {
          updateService(service.id, 'stripe_product_id', data.stripe_product_id);
          updateService(service.id, 'stripe_price_id', data.stripe_price_id);
          results.push(`${service.name} ✓`);
        } else results.push(`${service.name} ✗`);
      } catch { results.push(`${service.name} ✗`); }
    }
    setSuccess(results.length ? results.join(', ') : 'All services already synced');
    setSyncing(false);
  }

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 w-48 bg-gray-200 rounded" /></div>;

  return (
    <div>
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Products
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">One-Time Services</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage one-time billable services like Studio requests.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSyncAll} disabled={syncing} className="btn-admin text-sm py-2 px-3.5 inline-flex items-center gap-1.5">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync All to Stripe'}
          </button>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-admin text-sm py-2 px-3.5 inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Service
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">{error}</div>}
      {success && <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 mb-4">{success}</div>}

      {showAdd && (
        <div className="card p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">New One-Time Service</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
            <div><label className="label">Name</label><input className="input" placeholder="Studio Request" value={newService.name} onChange={e => setNewService(p => ({ ...p, name: e.target.value }))} /></div>
            <div><label className="label">Slug</label><input className="input font-mono" placeholder="studio-request" value={newService.slug} onChange={e => setNewService(p => ({ ...p, slug: e.target.value }))} /></div>
            <div><label className="label">Price (CAD)</label><input type="number" step="0.01" className="input" placeholder="250.00" value={newService.price_cad} onChange={e => setNewService(p => ({ ...p, price_cad: e.target.value }))} /></div>
            <button onClick={handleAdd} disabled={saving === 'new'} className="btn-admin text-sm py-2.5">
              {saving === 'new' ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Add'}
            </button>
          </div>
          <div className="mt-3"><label className="label">Description</label><input className="input" placeholder="What does this service include?" value={newService.description} onChange={e => setNewService(p => ({ ...p, description: e.target.value }))} /></div>
        </div>
      )}

      <div className="space-y-4">
        {services.length === 0 ? (
          <div className="card p-12 text-center">
            <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700 mb-1">No one-time services</p>
            <p className="text-xs text-gray-400">Create a service like Studio Request to start billing one-time work.</p>
          </div>
        ) : services.map(service => (
          <div key={service.id} className="card p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div><label className="label">Name</label><input className="input" value={service.name} onChange={e => updateService(service.id, 'name', e.target.value)} /></div>
              <div><label className="label">Slug</label><input className="input font-mono" value={service.slug} onChange={e => updateService(service.id, 'slug', e.target.value)} /></div>
              <div><label className="label">Price (cents CAD)</label><input type="number" className="input" value={service.price_cad} onChange={e => updateService(service.id, 'price_cad', parseInt(e.target.value) || 0)} /></div>
              <div><label className="label">Sort Order</label><input type="number" className="input" value={service.sort_order} onChange={e => updateService(service.id, 'sort_order', parseInt(e.target.value) || 0)} /></div>
            </div>
            <div className="mb-4">
              <label className="label">Description</label>
              <input className="input" value={service.description ?? ''} onChange={e => updateService(service.id, 'description', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div><label className="label">Stripe Product ID</label><input className="input font-mono text-xs" placeholder="prod_..." value={service.stripe_product_id ?? ''} onChange={e => updateService(service.id, 'stripe_product_id', e.target.value || null)} /></div>
              <div><label className="label">Stripe Price ID</label><input className="input font-mono text-xs" placeholder="price_..." value={service.stripe_price_id ?? ''} onChange={e => updateService(service.id, 'stripe_price_id', e.target.value || null)} /></div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={service.is_active} onChange={e => updateService(service.id, 'is_active', e.target.checked)} className="rounded border-gray-300 text-admin-600" />
                  Active
                </label>
                <span className={service.stripe_price_id ? 'badge-green text-xs' : 'badge-yellow text-xs'}>
                  {service.stripe_price_id ? 'Synced to Stripe' : 'Not synced'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleSave(service)} disabled={saving === service.id} className="text-xs text-admin-600 hover:text-admin-700 font-medium inline-flex items-center gap-1">
                  {saving === service.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                </button>
                <button onClick={() => handleDelete(service)} className="text-xs text-red-500 hover:text-red-700 inline-flex items-center gap-1">
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
