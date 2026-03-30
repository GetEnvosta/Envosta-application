'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save, Trash2, Check } from 'lucide-react';
import Link from 'next/link';

export default function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savePhase, setSavePhase] = useState<'idle' | 'saving' | 'syncing' | 'done'>('idle');
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
    const { data } = await supabase.from('products').select('*').eq('id', id).single();
    setPlan(data);
    setLoading(false);
  }

  function update(field: string, value: any) {
    setPlan((prev: any) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSavePhase('saving');
    setError('');
    setSuccess('');

    const meta = plan.metadata ?? {};
    const saveRes = await fetch('/api/admin/create-product', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: planId,
        name: plan.name,
        slug: plan.slug,
        price_cad: plan.price_cad,
        price_yearly_cad: plan.price_yearly_cad,
        price_2yr_cad: plan.price_2yr_cad || 0,
        price_3yr_cad: plan.price_3yr_cad || 0,
        stripe_product_id: plan.stripe_product_id || null,
        stripe_price_id: plan.stripe_price_id || null,
        stripe_price_id_yearly: plan.stripe_price_id_yearly || null,
        stripe_price_id_2yr: plan.stripe_price_id_2yr || null,
        stripe_price_id_3yr: plan.stripe_price_id_3yr || null,
        is_active: plan.is_active,
        description: plan.description,
        features: plan.features,
        metadata: {
          ...meta,
          storage_gb: plan.metadata?.storage_gb ?? meta.storage_gb,
          php_workers_default: plan.metadata?.php_workers_default ?? meta.php_workers_default,
          php_workers_included: plan.metadata?.php_workers_included ?? meta.php_workers_included,
          php_memory_mb: plan.metadata?.php_memory_mb ?? meta.php_memory_mb,
          has_staging: plan.metadata?.has_staging ?? meta.has_staging,
          has_cdn: plan.metadata?.has_cdn ?? meta.has_cdn,
          has_waf: plan.metadata?.has_waf ?? meta.has_waf,
          has_backups: plan.metadata?.has_backups ?? meta.has_backups,
          onboarding_type: plan.metadata?.onboarding_type ?? meta.onboarding_type,
          support_type: plan.metadata?.support_type ?? meta.support_type,
          support_response_hours: plan.metadata?.support_response_hours ?? meta.support_response_hours,
          sites_allowed: plan.metadata?.sites_allowed ?? meta.sites_allowed,
        },
      }),
    });
    const saveData = await saveRes.json();

    if (!saveRes.ok) { setError(saveData.error ?? 'Save failed'); setSaving(false); setSavePhase('idle'); return; }

    // Sync to Stripe
    setSavePhase('syncing');
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
            price_cad: plan.price_cad,
            price_yearly_cad: plan.price_yearly_cad,
            is_active: plan.is_active,
            stripe_product_id: plan.stripe_product_id,
            stripe_price_id: plan.stripe_price_id,
            stripe_price_id_yearly: plan.stripe_price_id_yearly,
            storage_gb: plan.metadata?.storage_gb,
            bandwidth_gb: plan.bandwidth_gb,
            default_php_workers: plan.metadata?.php_workers_default,
            max_php_workers: plan.metadata?.php_workers_included,
            php_memory_mb: plan.metadata?.php_memory_mb,
            onboarding_type: plan.metadata?.onboarding_type,
            support_response_hours: plan.metadata?.support_response_hours,
          },
        }),
      });
      const syncData = await syncRes.json();
      if (syncRes.ok && syncData.stripe_product_id) {
        setPlan((prev: any) => ({
          ...prev,
          stripe_product_id: syncData.stripe_product_id,
          stripe_price_id: syncData.stripe_price_id,
          stripe_price_id_yearly: syncData.stripe_price_id_yearly,
          stripe_price_id_2yr: syncData.stripe_price_id_2yr,
          stripe_price_id_3yr: syncData.stripe_price_id_3yr,
        }));
        setSuccess('Product saved & synced to Stripe');
      } else {
        setSuccess('Plan saved (Stripe sync: ' + (syncData.error ?? 'failed') + ')');
      }
    } catch {
      setSuccess('Plan saved (Stripe sync failed)');
    }
    setSavePhase('done');
    setSaving(false);
    setTimeout(() => { setSuccess(''); setSavePhase('idle'); }, 3000);
  }

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 w-48 bg-gray-200 rounded" /><div className="card p-6 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-gray-100 rounded" />)}</div></div>;
  if (!plan) return <p className="text-gray-500">Plan not found.</p>;

  return (
    <div>
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Products
      </Link>

      <h1 className="text-xl font-semibold text-gray-900 mb-1">Edit: {plan.name}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {plan.type === 'hosting_plan' ? 'Hosting plan — pricing, wp.cloud specs, and features.' :
         plan.type === 'domain_tld' ? 'Domain TLD — pricing and OpenSRS configuration.' :
         plan.type === 'plan_addon' ? 'Plan add-on — per-site recurring billing.' :
         'One-time service — single charge product.'}
      </p>

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

        {/* Stripe — Billing */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Stripe — Billing</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="label">Billing Type</label>
              <div className="input bg-gray-50 text-gray-600 cursor-default">
                {plan.billing === 'monthly' ? 'Monthly (recurring)' : plan.billing === 'yearly' ? 'Yearly (recurring)' : 'One-Time (single charge)'}
              </div>
            </div>
            <div><label className="label">Stripe Product ID</label><input className="input font-mono text-xs" value={plan.stripe_product_id ?? ''} onChange={e => update('stripe_product_id', e.target.value)} placeholder="prod_..." /></div>
          </div>

          {/* Pricing tiers table */}
          {plan.billing === 'one_time' ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-[140px_1fr_1fr] text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
                <div className="px-4 py-2.5">Cycle</div>
                <div className="px-4 py-2.5">Stripe Price ID</div>
                <div className="px-4 py-2.5">Price (CAD)</div>
              </div>
              <div className="grid grid-cols-[140px_1fr_1fr] items-center">
                <div className="px-4 py-3 text-sm font-medium text-gray-700">One-Time</div>
                <div className="px-4 py-2"><input className="input font-mono text-xs" value={plan.stripe_price_id ?? ''} onChange={e => update('stripe_price_id', e.target.value)} placeholder="price_..." /></div>
                <div className="px-4 py-2 flex items-center gap-2">
                  <input type="number" className="input w-28" value={plan.price_cad} onChange={e => update('price_cad', parseInt(e.target.value) || 0)} />
                  <span className="text-xs text-gray-400 whitespace-nowrap">{plan.price_cad > 0 ? `$${(plan.price_cad / 100).toFixed(2)}` : '—'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-[140px_1fr_1fr] text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
                <div className="px-4 py-2.5">Billing Cycle</div>
                <div className="px-4 py-2.5">Stripe Price ID</div>
                <div className="px-4 py-2.5">Price (cents CAD)</div>
              </div>
              <div className="divide-y divide-gray-100">
                {/* Monthly — only for monthly billing */}
                {plan.billing === 'monthly' && (
                  <div className="grid grid-cols-[140px_1fr_1fr] items-center">
                    <div className="px-4 py-3 text-sm font-medium text-gray-700">Monthly</div>
                    <div className="px-4 py-2"><input className="input font-mono text-xs" value={plan.stripe_price_id ?? ''} onChange={e => update('stripe_price_id', e.target.value)} placeholder="price_..." /></div>
                    <div className="px-4 py-2 flex items-center gap-2">
                      <input type="number" className="input w-28" value={plan.price_cad} onChange={e => update('price_cad', parseInt(e.target.value) || 0)} />
                      <span className="text-xs text-gray-400 whitespace-nowrap">{plan.price_cad > 0 ? `$${(plan.price_cad / 100).toFixed(2)}/mo` : '—'}</span>
                    </div>
                  </div>
                )}
                {/* 1 Year */}
                <div className="grid grid-cols-[140px_1fr_1fr] items-center">
                  <div className="px-4 py-3 text-sm font-medium text-gray-700">1 Year</div>
                  <div className="px-4 py-2">
                    <input className="input font-mono text-xs"
                      value={plan.billing === 'yearly' ? (plan.stripe_price_id ?? '') : (plan.stripe_price_id_yearly ?? '')}
                      onChange={e => plan.billing === 'yearly' ? update('stripe_price_id', e.target.value) : update('stripe_price_id_yearly', e.target.value)}
                      placeholder="price_..."
                    />
                  </div>
                  <div className="px-4 py-2 flex items-center gap-2">
                    <input type="number" className="input w-28"
                      value={plan.billing === 'yearly' ? (plan.price_cad ?? 0) : (plan.price_yearly_cad ?? 0)}
                      onChange={e => {
                        const v = parseInt(e.target.value) || 0;
                        plan.billing === 'yearly' ? update('price_cad', v) : update('price_yearly_cad', v);
                      }}
                    />
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {(() => { const yr = plan.billing === 'yearly' ? plan.price_cad : plan.price_yearly_cad; return yr > 0 ? `$${(yr / 100).toFixed(2)}/yr` : '—'; })()}
                    </span>
                  </div>
                </div>
                {/* 2 Years */}
                <div className="grid grid-cols-[140px_1fr_1fr] items-center">
                  <div className="px-4 py-3 text-sm font-medium text-gray-700">2 Years</div>
                  <div className="px-4 py-2"><input className="input font-mono text-xs" value={plan.stripe_price_id_2yr ?? ''} onChange={e => update('stripe_price_id_2yr', e.target.value)} placeholder="price_..." /></div>
                  <div className="px-4 py-2 flex items-center gap-2">
                    <input type="number" className="input w-28" value={plan.price_2yr_cad ?? 0} onChange={e => update('price_2yr_cad', parseInt(e.target.value) || 0)} />
                    <span className="text-xs text-gray-400 whitespace-nowrap">{plan.price_2yr_cad > 0 ? `$${(plan.price_2yr_cad / 100).toFixed(2)}/2yr` : '—'}</span>
                  </div>
                </div>
                {/* 3 Years */}
                <div className="grid grid-cols-[140px_1fr_1fr] items-center">
                  <div className="px-4 py-3 text-sm font-medium text-gray-700">3 Years</div>
                  <div className="px-4 py-2"><input className="input font-mono text-xs" value={plan.stripe_price_id_3yr ?? ''} onChange={e => update('stripe_price_id_3yr', e.target.value)} placeholder="price_..." /></div>
                  <div className="px-4 py-2 flex items-center gap-2">
                    <input type="number" className="input w-28" value={plan.price_3yr_cad ?? 0} onChange={e => update('price_3yr_cad', parseInt(e.target.value) || 0)} />
                    <span className="text-xs text-gray-400 whitespace-nowrap">{plan.price_3yr_cad > 0 ? `$${(plan.price_3yr_cad / 100).toFixed(2)}/3yr` : '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Domain TLD — OpenSRS Config (domain_tld only) */}
        {plan.type === 'domain_tld' && (
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">OpenSRS — Domain Configuration</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="label">TLD (e.g. com, ca, io)</label><input className="input font-mono" value={plan.metadata?.tld ?? ''} onChange={e => update('metadata', { ...plan.metadata, tld: e.target.value })} placeholder="com" /></div>
              <div><label className="label">Registration Price (cents CAD)</label><input type="number" className="input" value={plan.metadata?.registration_price_cad ?? plan.price_cad ?? 0} onChange={e => update('metadata', { ...plan.metadata, registration_price_cad: parseInt(e.target.value) || 0 })} /></div>
              <div><label className="label">Transfer Price (cents CAD)</label><input type="number" className="input" value={plan.metadata?.transfer_price_cad ?? 0} onChange={e => update('metadata', { ...plan.metadata, transfer_price_cad: parseInt(e.target.value) || 0 })} /></div>
            </div>
          </div>
        )}

        {/* Plan Add-on Config (plan_addon only) */}
        {plan.type === 'plan_addon' && (
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">wp.cloud — Add-on Configuration</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><label className="label">wp.cloud Config Key</label><input className="input font-mono" value={plan.metadata?.wpcloud_key ?? ''} onChange={e => update('metadata', { ...plan.metadata, wpcloud_key: e.target.value })} placeholder="e.g. php_workers" /></div>
              <div><label className="label">Increment per Unit</label><input type="number" className="input" value={plan.metadata?.increment ?? 1} onChange={e => update('metadata', { ...plan.metadata, increment: parseInt(e.target.value) || 1 })} /></div>
              <div><label className="label">Unit Label</label><input className="input" value={plan.metadata?.unit_label ?? ''} onChange={e => update('metadata', { ...plan.metadata, unit_label: e.target.value })} placeholder="e.g. 2 workers" /></div>
            </div>
          </div>
        )}

        {/* wp.cloud — Infrastructure (hosting_plan only) */}
        {plan.type === 'hosting_plan' && (
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">wp.cloud — Infrastructure</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="label">Storage (GB)</label><input type="number" className="input" value={plan.metadata?.storage_gb ?? plan.metadata?.storage_gb ?? 25} onChange={e => update('storage_gb', parseInt(e.target.value) || 25)} /></div>
            <div><label className="label">Default PHP Workers</label><input type="number" className="input" value={plan.metadata?.php_workers_default ?? 2} onChange={e => update('default_php_workers', parseInt(e.target.value) || 2)} /></div>
            <div><label className="label">Max PHP Workers</label><input type="number" className="input" value={plan.metadata?.php_workers_included ?? 2} onChange={e => update('max_php_workers', parseInt(e.target.value) || 2)} /></div>
            <div><label className="label">PHP Memory (MB)</label><input type="number" className="input" value={plan.metadata?.php_memory_mb ?? 512} onChange={e => update('php_memory_mb', parseInt(e.target.value) || 512)} /></div>
            <div>
              <label className="label">Onboarding Type</label>
              <select className="input" value={plan.metadata?.onboarding_type ?? 'standard'} onChange={e => update('onboarding_type', e.target.value)}>
                <option value="standard">Standard</option>
                <option value="guided">Guided</option>
                <option value="concierge">Concierge</option>
              </select>
            </div>
            <div><label className="label">Support Response (hours)</label><input type="number" className="input" value={plan.metadata?.support_response_hours ?? 48} onChange={e => update('support_response_hours', parseInt(e.target.value) || 48)} /></div>
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

        )}

        {/* Marketing — Plan Card Features (hosting_plan only) */}
        {plan.type === 'hosting_plan' && (
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Marketing — Plan Card Features</h2>
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
        )}

        <div className="flex items-center gap-4">
          <button onClick={handleSave} disabled={saving} className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg transition-all ${
            savePhase === 'done'
              ? 'bg-emerald-600 text-white'
              : 'btn-admin'
          }`}>
            {savePhase === 'saving' && <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>}
            {savePhase === 'syncing' && <><Loader2 className="w-4 h-4 animate-spin" /> Syncing to Stripe...</>}
            {savePhase === 'done' && <><Check className="w-4 h-4" /> Saved</>}
            {savePhase === 'idle' && <><Save className="w-4 h-4" /> Save Changes</>}
          </button>

          {!plan.stripe_product_id && (
            <button
              onClick={async () => {
                if (!confirm(`Delete "${plan.name}"? This cannot be undone.`)) return;
                const res = await fetch('/api/admin/create-product', {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: planId }),
                });
                if (res.ok) router.push('/admin/products');
              }}
              className="text-sm text-red-500 hover:text-red-700 inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
