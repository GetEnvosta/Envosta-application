'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';

export default function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [planId, setPlanId] = useState('');
  const router = useRouter();

  useEffect(() => {
    params.then(p => {
      setPlanId(p.id);
      fetchPlan(p.id);
    });
  }, [params]);

  async function fetchPlan(id: string) {
    const supabase = createClient();
    const { data } = await supabase.from('plans').select('*').eq('id', id).single();
    setPlan(data);
    setLoading(false);
  }

  function update(field: string, value: any) {
    setPlan((prev: any) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');

    const supabase = createClient();
    const { error: err } = await supabase.from('plans').update({
      name: plan.name,
      slug: plan.slug,
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      stripe_price_id_monthly: plan.stripe_price_id_monthly,
      stripe_price_id_yearly: plan.stripe_price_id_yearly,
      storage_gb: plan.storage_gb,
      max_php_workers: plan.max_php_workers,
      default_php_workers: plan.default_php_workers,
      php_memory_mb: plan.php_memory_mb,
      has_staging: plan.has_staging,
      has_cdn: plan.has_cdn,
      has_waf: plan.has_waf,
      has_backups: plan.has_backups,
      onboarding_type: plan.onboarding_type,
      support_response_hours: plan.support_response_hours,
      is_active: plan.is_active,
      description: plan.description,
      features: plan.features,
    }).eq('id', planId);

    if (err) { setError(err.message); setSaving(false); return; }

    // Sync to Stripe
    try {
      const syncRes = await fetch('/api/admin/sync-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'plan',
          id: planId,
          data: {
            name: plan.name,
            description: plan.description,
            price_monthly: plan.price_monthly,
            price_yearly: plan.price_yearly,
            is_active: plan.is_active,
            stripe_product_id: plan.stripe_product_id,
            stripe_price_id_monthly: plan.stripe_price_id_monthly,
            stripe_price_id_yearly: plan.stripe_price_id_yearly,
            storage_gb: plan.storage_gb,
            bandwidth_gb: plan.bandwidth_gb,
            default_php_workers: plan.default_php_workers,
            max_php_workers: plan.max_php_workers,
            php_memory_mb: plan.php_memory_mb,
            onboarding_type: plan.onboarding_type,
            support_response_hours: plan.support_response_hours,
          },
        }),
      });
      const syncData = await syncRes.json();
      if (syncRes.ok && syncData.stripe_product_id) {
        setPlan((prev: any) => ({
          ...prev,
          stripe_product_id: syncData.stripe_product_id,
          stripe_price_id_monthly: syncData.stripe_price_id_monthly,
          stripe_price_id_yearly: syncData.stripe_price_id_yearly,
        }));
        setSuccess('Plan saved & synced to Stripe');
      } else {
        setSuccess('Plan saved (Stripe sync: ' + (syncData.error ?? 'failed') + ')');
      }
    } catch {
      setSuccess('Plan saved (Stripe sync failed)');
    }
    setTimeout(() => setSuccess(''), 5000);
    setSaving(false);
  }

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 w-48 bg-gray-200 rounded" /><div className="card p-6 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-gray-100 rounded" />)}</div></div>;
  if (!plan) return <p className="text-gray-500">Plan not found.</p>;

  return (
    <div>
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Products
      </Link>

      <h1 className="text-xl font-semibold text-gray-900 mb-1">Edit Plan: {plan.name}</h1>
      <p className="text-sm text-gray-500 mb-6">Update plan configuration, pricing, and features.</p>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">{error}</div>}
      {success && <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 mb-4">{success}</div>}

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Name</label><input className="input" value={plan.name} onChange={e => update('name', e.target.value)} /></div>
            <div><label className="label">Slug</label><input className="input font-mono" value={plan.slug} onChange={e => update('slug', e.target.value)} /></div>
            <div><label className="label">Description</label><input className="input" value={plan.description ?? ''} onChange={e => update('description', e.target.value)} /></div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={plan.is_active ? 'true' : 'false'} onChange={e => update('is_active', e.target.value === 'true')}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Pricing (CAD cents)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Monthly Price (cents)</label><input type="number" className="input" value={plan.price_monthly} onChange={e => update('price_monthly', parseInt(e.target.value) || 0)} /></div>
            <div><label className="label">Yearly Price (cents)</label><input type="number" className="input" value={plan.price_yearly ?? 0} onChange={e => update('price_yearly', parseInt(e.target.value) || 0)} /></div>
            <div><label className="label">Stripe Monthly Price ID</label><input className="input font-mono text-xs" value={plan.stripe_price_id_monthly ?? ''} onChange={e => update('stripe_price_id_monthly', e.target.value)} placeholder="price_..." /></div>
            <div><label className="label">Stripe Yearly Price ID</label><input className="input font-mono text-xs" value={plan.stripe_price_id_yearly ?? ''} onChange={e => update('stripe_price_id_yearly', e.target.value)} placeholder="price_..." /></div>
          </div>
        </div>

        {/* Infrastructure */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Infrastructure</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="label">Storage (GB)</label><input type="number" className="input" value={plan.storage_gb ?? plan.disk_gb ?? 25} onChange={e => update('storage_gb', parseInt(e.target.value) || 25)} /></div>
            <div><label className="label">Default PHP Workers</label><input type="number" className="input" value={plan.default_php_workers ?? 2} onChange={e => update('default_php_workers', parseInt(e.target.value) || 2)} /></div>
            <div><label className="label">Max PHP Workers</label><input type="number" className="input" value={plan.max_php_workers ?? 2} onChange={e => update('max_php_workers', parseInt(e.target.value) || 2)} /></div>
            <div><label className="label">PHP Memory (MB)</label><input type="number" className="input" value={plan.php_memory_mb ?? 512} onChange={e => update('php_memory_mb', parseInt(e.target.value) || 512)} /></div>
            <div>
              <label className="label">Onboarding Type</label>
              <select className="input" value={plan.onboarding_type ?? 'standard'} onChange={e => update('onboarding_type', e.target.value)}>
                <option value="standard">Standard</option>
                <option value="guided">Guided</option>
                <option value="concierge">Concierge</option>
              </select>
            </div>
            <div><label className="label">Support Response (hours)</label><input type="number" className="input" value={plan.support_response_hours ?? 48} onChange={e => update('support_response_hours', parseInt(e.target.value) || 48)} /></div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            {[
              { key: 'has_staging', label: 'Staging' },
              { key: 'has_backups', label: 'Backups' },
              { key: 'has_cdn', label: 'CDN' },
              { key: 'has_waf', label: 'WAF' },
            ].map(f => (
              <label key={f.key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={plan[f.key] ?? false} onChange={e => update(f.key, e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-admin-600 focus:ring-admin-500" />
                <span className="text-sm text-gray-700">{f.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Features JSON */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Features (displayed on plan cards)</h2>
          <textarea
            className="input font-mono text-xs"
            rows={6}
            value={JSON.stringify(plan.features ?? [], null, 2)}
            onChange={e => {
              try { update('features', JSON.parse(e.target.value)); } catch {}
            }}
          />
          <p className="text-xs text-gray-400 mt-1">JSON array of feature strings.</p>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-admin inline-flex items-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}
