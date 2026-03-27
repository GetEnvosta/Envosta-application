'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

export default function NewPlanPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [plan, setPlan] = useState({
    name: '',
    slug: '',
    description: '',
    price_monthly: 0,
    price_yearly: 0,
    storage_gb: 25,
    bandwidth_gb: 50,
    default_php_workers: 4,
    max_php_workers: 4,
    php_memory_mb: 512,
    sites_allowed: 1,
    domains_allowed: 1,
    has_staging: true,
    has_backups: true,
    has_cdn: true,
    has_waf: false,
    is_active: true,
    onboarding_type: 'standard',
    support_response_hours: 48,
    features: '[]',
  });

  function update(field: string, value: any) {
    setPlan(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!plan.name || !plan.slug) {
      setError('Name and slug are required.');
      return;
    }

    setSaving(true);
    setError('');

    const supabase = createClient();
    const { data, error: err } = await supabase.from('plans').insert({
      ...plan,
      slug: plan.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      features: plan.features,
    }).select('id').single();

    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }

    // Auto-sync to Stripe
    try {
      await fetch('/api/admin/sync-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'plan', id: data.id, data: plan }),
      });
    } catch { /* sync failed, plan still saved to DB */ }

    router.push(`/admin/products/plans/${data.id}`);
  }

  return (
    <div>
      <Link href="/admin/products/plans" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Plans
      </Link>

      <h1 className="text-xl font-semibold text-gray-900 mb-1">Create New Plan</h1>
      <p className="text-sm text-gray-500 mb-6">Define a new hosting plan. It will auto-sync to Stripe on save.</p>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">{error}</div>}

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Name</label><input className="input" placeholder="e.g. Growth" value={plan.name} onChange={e => update('name', e.target.value)} /></div>
            <div><label className="label">Slug</label><input className="input font-mono" placeholder="e.g. growth" value={plan.slug} onChange={e => update('slug', e.target.value)} /></div>
            <div className="sm:col-span-2"><label className="label">Description</label><input className="input" placeholder="Short description for the plan" value={plan.description} onChange={e => update('description', e.target.value)} /></div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={plan.is_active ? 'true' : 'false'} onChange={e => update('is_active', e.target.value === 'true')}>
                <option value="true">Active</option>
                <option value="false">Inactive (hidden)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stripe — Billing */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Stripe — Billing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Monthly Price (cents CAD)</label><input type="number" className="input" value={plan.price_monthly} onChange={e => update('price_monthly', parseInt(e.target.value) || 0)} /></div>
            <div><label className="label">Yearly Price (cents CAD)</label><input type="number" className="input" value={plan.price_yearly} onChange={e => update('price_yearly', parseInt(e.target.value) || 0)} /></div>
          </div>
          <p className="text-xs text-gray-400 mt-2">Stripe product and price IDs will be created automatically on save.</p>
        </div>

        {/* wp.cloud — Infrastructure */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">wp.cloud — Infrastructure</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="label">Storage (GB)</label><input type="number" className="input" value={plan.storage_gb} onChange={e => update('storage_gb', parseInt(e.target.value) || 25)} /></div>
            <div><label className="label">Bandwidth (GB)</label><input type="number" className="input" value={plan.bandwidth_gb} onChange={e => update('bandwidth_gb', parseInt(e.target.value) || 0)} /><p className="text-xs text-gray-400 mt-1">0 = unlimited</p></div>
            <div><label className="label">Default PHP Workers</label><input type="number" className="input" value={plan.default_php_workers} onChange={e => update('default_php_workers', parseInt(e.target.value) || 2)} /></div>
            <div><label className="label">Max PHP Workers</label><input type="number" className="input" value={plan.max_php_workers} onChange={e => update('max_php_workers', parseInt(e.target.value) || 2)} /></div>
            <div>
              <label className="label">PHP Memory (MB)</label>
              <select className="input" value={plan.php_memory_mb} onChange={e => update('php_memory_mb', parseInt(e.target.value))}>
                <option value={512}>512 MB</option>
                <option value={1024}>1024 MB</option>
                <option value={1536}>1536 MB</option>
                <option value={2048}>2048 MB</option>
              </select>
            </div>
            <div>
              <label className="label">Onboarding Type</label>
              <select className="input" value={plan.onboarding_type} onChange={e => update('onboarding_type', e.target.value)}>
                <option value="standard">Standard</option>
                <option value="guided">Guided</option>
                <option value="concierge">Concierge</option>
              </select>
            </div>
            <div><label className="label">Support Response (hours)</label><input type="number" className="input" value={plan.support_response_hours} onChange={e => update('support_response_hours', parseInt(e.target.value) || 48)} /></div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            {[
              { key: 'has_staging', label: 'Staging' },
              { key: 'has_backups', label: 'Backups' },
              { key: 'has_cdn', label: 'CDN' },
              { key: 'has_waf', label: 'WAF' },
            ].map(f => (
              <label key={f.key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={(plan as any)[f.key] ?? false} onChange={e => update(f.key, e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-admin-600 focus:ring-admin-500" />
                <span className="text-sm text-gray-700">{f.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Marketing — Features */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Marketing — Plan Card Features</h2>
          <textarea
            className="input font-mono text-xs"
            rows={6}
            value={plan.features}
            onChange={e => update('features', e.target.value)}
            placeholder='["Feature 1", "Feature 2", "Feature 3"]'
          />
          <p className="text-xs text-gray-400 mt-1">JSON array of feature strings displayed on plan cards.</p>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-admin inline-flex items-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Create Plan & Sync to Stripe
        </button>
      </div>
    </div>
  );
}
