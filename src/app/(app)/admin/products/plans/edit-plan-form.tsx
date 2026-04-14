'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { ChevronDown, ChevronRight, Save, CheckCircle, AlertCircle } from 'lucide-react';

export function EditPlanForm({ plan }: { plan: any }) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const meta = plan.metadata ?? {};

  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description ?? '');
  const [priceCad, setPriceCad] = useState(plan.price_cad ?? 0);
  const [priceYearlyCad, setPriceYearlyCad] = useState(plan.price_yearly_cad ?? 0);
  const [isActive, setIsActive] = useState(plan.is_active);

  // Metadata fields
  const [phpWorkersDefault, setPhpWorkersDefault] = useState(meta.php_workers_default ?? 2);
  const [phpWorkersIncluded, setPhpWorkersIncluded] = useState(meta.php_workers_included ?? 4);
  const [phpMemoryMb, setPhpMemoryMb] = useState(meta.php_memory_mb ?? 512);
  const [storageGb, setStorageGb] = useState(meta.storage_gb ?? 25);
  const [hasStaging, setHasStaging] = useState(meta.has_staging ?? true);
  const [hasBackups, setHasBackups] = useState(meta.has_backups ?? true);
  const [hasCdn, setHasCdn] = useState(meta.has_cdn ?? true);
  const [hasWaf, setHasWaf] = useState(meta.has_waf ?? false);
  const [onboardingType, setOnboardingType] = useState(meta.onboarding_type ?? 'standard');
  const [supportType, setSupportType] = useState(meta.support_type ?? 'tickets');
  const [sitesAllowed, setSitesAllowed] = useState(meta.sites_allowed ?? 1);

  // Stripe
  const [stripeProductId, setStripeProductId] = useState(plan.stripe_product_id ?? '');
  const [stripePriceId, setStripePriceId] = useState(plan.stripe_price_id ?? '');
  const [stripePriceIdYearly, setStripePriceIdYearly] = useState(plan.stripe_price_id_yearly ?? '');

  async function handleSave() {
    setSaving(true);
    setStatus('idle');

    const metadata = {
      php_workers_default: phpWorkersDefault,
      php_workers_included: phpWorkersIncluded,
      php_memory_mb: phpMemoryMb,
      storage_gb: storageGb,
      has_staging: hasStaging,
      has_backups: hasBackups,
      has_cdn: hasCdn,
      has_waf: hasWaf,
      onboarding_type: onboardingType,
      support_type: supportType,
      sites_allowed: sitesAllowed,
    };

    const supabase = createClient();
    const { error } = await supabase
      .from('products')
      .update({
        name,
        description: description || null,
        price_cad: priceCad,
        price_yearly_cad: priceYearlyCad,
        is_active: isActive,
        stripe_product_id: stripeProductId || null,
        stripe_price_id: stripePriceId || null,
        stripe_price_id_yearly: stripePriceIdYearly || null,
        metadata,
      })
      .eq('id', plan.id);

    if (error) {
      setSaving(false);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
      return;
    }

    // Sync to Stripe
    try {
      const res = await fetch('/api/admin/sync-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'plan',
          id: plan.id,
          data: { name, description, price_cad: priceCad, price_yearly_cad: priceYearlyCad, is_active: isActive, ...metadata },
        }),
      });
      const result = await res.json();
      if (res.ok && result.stripe_product_id) {
        setStripeProductId(result.stripe_product_id);
        setStripePriceId(result.stripe_price_id ?? '');
        setStripePriceIdYearly(result.stripe_price_id_yearly ?? '');
      }
    } catch {
      // Stripe sync failed, plan saved to DB
    }

    setSaving(false);
    setStatus('success');
    setTimeout(() => setStatus('idle'), 3000);
  }

  return (
    <div className="card">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-900">{plan.name}</span>
        {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4">
          {/* Name & Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div><label className="label">Name</label><input type="text" className="input" value={name} onChange={e => setName(e.target.value)} /></div>
            <div><label className="label">Description</label><textarea className="input" rows={2} value={description} onChange={e => setDescription(e.target.value)} /></div>
          </div>

          {/* Stripe — Billing */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-2">Stripe — Billing</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div><label className="label">Monthly price (cents USD)</label><input type="number" className="input" value={priceCad} onChange={e => setPriceCad(Number(e.target.value))} /></div>
            <div><label className="label">Yearly price (cents USD)</label><input type="number" className="input" value={priceYearlyCad} onChange={e => setPriceYearlyCad(Number(e.target.value))} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div><label className="label">Monthly Price ID</label><input type="text" className="input font-mono text-xs" value={stripePriceId} onChange={e => setStripePriceId(e.target.value)} placeholder="price_..." /></div>
            <div><label className="label">Yearly Price ID</label><input type="text" className="input font-mono text-xs" value={stripePriceIdYearly} onChange={e => setStripePriceIdYearly(e.target.value)} placeholder="price_..." /></div>
            <div><label className="label">Product ID</label><input type="text" className="input font-mono text-xs" value={stripeProductId} onChange={e => setStripeProductId(e.target.value)} placeholder="prod_..." /></div>
          </div>

          {/* wp.cloud — Infrastructure */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-2">wp.cloud — Infrastructure</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div><label className="label">Storage (GB)</label><input type="number" className="input" value={storageGb} onChange={e => setStorageGb(Number(e.target.value))} /></div>
            <div><label className="label">PHP Workers (default)</label><input type="number" className="input" value={phpWorkersDefault} onChange={e => setPhpWorkersDefault(Number(e.target.value))} /></div>
            <div><label className="label">PHP Workers (included)</label><input type="number" className="input" value={phpWorkersIncluded} onChange={e => setPhpWorkersIncluded(Number(e.target.value))} /></div>
            <div>
              <label className="label">PHP Memory (MB)</label>
              <select className="input" value={phpMemoryMb} onChange={e => setPhpMemoryMb(Number(e.target.value))}>
                <option value={512}>512 MB</option>
                <option value={1024}>1024 MB</option>
                <option value={1536}>1536 MB</option>
                <option value={2048}>2048 MB</option>
              </select>
            </div>
            <div>
              <label className="label">Onboarding</label>
              <select className="input" value={onboardingType} onChange={e => setOnboardingType(e.target.value)}>
                <option value="standard">Standard</option>
                <option value="guided">Guided</option>
                <option value="concierge">Concierge</option>
                <option value="white_glove">White Glove</option>
              </select>
            </div>
            <div>
              <label className="label">Support</label>
              <select className="input" value={supportType} onChange={e => setSupportType(e.target.value)}>
                <option value="tickets">Tickets</option>
                <option value="priority">Priority</option>
                <option value="dedicated">Dedicated</option>
              </select>
            </div>
            <div><label className="label">Sites allowed</label><input type="number" className="input" value={sitesAllowed} onChange={e => setSitesAllowed(Number(e.target.value))} /></div>
          </div>

          {/* Checkboxes */}
          <div className="flex flex-wrap items-center gap-6 mb-5">
            {[
              { val: hasStaging, set: setHasStaging, label: 'Staging' },
              { val: hasBackups, set: setHasBackups, label: 'Backups' },
              { val: hasCdn, set: setHasCdn, label: 'CDN' },
              { val: hasWaf, set: setHasWaf, label: 'WAF' },
              { val: isActive, set: setIsActive, label: 'Active' },
            ].map(f => (
              <label key={f.label} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={f.val} onChange={e => f.set(e.target.checked)} className="rounded border-gray-300 text-admin-600 focus:ring-admin-500" />
                {f.label}
              </label>
            ))}
          </div>

          {/* Save */}
          <div className="flex items-center gap-3">
            <button type="button" onClick={handleSave} disabled={saving} className="btn-admin inline-flex items-center gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            {status === 'success' && <span className="inline-flex items-center gap-1.5 text-sm text-green-600"><CheckCircle className="w-4 h-4" />Saved</span>}
            {status === 'error' && <span className="inline-flex items-center gap-1.5 text-sm text-red-600"><AlertCircle className="w-4 h-4" />Failed</span>}
          </div>
        </div>
      )}
    </div>
  );
}
