'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { ChevronDown, ChevronRight, Save, CheckCircle, AlertCircle } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_cad: number;
  price_yearly: number;
  storage_gb: number;
  bandwidth_gb: number;
  php_workers: number;
  default_php_workers: number;
  max_php_workers: number;
  php_memory_mb: number;
  sites_allowed: number;
  domains_allowed: number;
  has_staging: boolean;
  has_backups: boolean;
  has_cdn: boolean;
  has_waf: boolean;
  is_active: boolean;
  onboarding_type: string;
  support_response_hours: number;
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
  stripe_price_id_yearly?: string | null;
  disk_gb?: number; // alias for storage_gb in some places
}

export function EditPlanForm({ plan }: { plan: Plan }) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description ?? '');
  const [priceMonthly, setPriceMonthly] = useState(plan.price_cad);
  const [priceYearly, setPriceYearly] = useState(plan.price_yearly);
  const [storageGb, setStorageGb] = useState(plan.storage_gb ?? plan.disk_gb ?? 25);
  const [bandwidthGb, setBandwidthGb] = useState(plan.bandwidth_gb);
  const [defaultPhpWorkers, setDefaultPhpWorkers] = useState(plan.default_php_workers ?? 2);
  const [maxPhpWorkers, setMaxPhpWorkers] = useState(plan.max_php_workers ?? 2);
  const [phpMemoryMb, setPhpMemoryMb] = useState(plan.php_memory_mb ?? 512);
  const [sitesAllowed, setSitesAllowed] = useState(plan.sites_allowed);
  const [domainsAllowed, setDomainsAllowed] = useState(plan.domains_allowed);
  const [hasStaging, setHasStaging] = useState(plan.has_staging);
  const [hasBackups, setHasBackups] = useState(plan.has_backups);
  const [hasCdn, setHasCdn] = useState(plan.has_cdn);
  const [hasWaf, setHasWaf] = useState(plan.has_waf);
  const [isActive, setIsActive] = useState(plan.is_active);
  const [onboardingType, setOnboardingType] = useState(plan.onboarding_type ?? 'standard');
  const [supportResponseHours, setSupportResponseHours] = useState(plan.support_response_hours ?? 48);
  const [stripeProductId, setStripeProductId] = useState(plan.stripe_product_id ?? '');
  const [stripeMonthlyId, setStripeMonthlyId] = useState(plan.stripe_price_id ?? '');
  const [stripeYearlyId, setStripeYearlyId] = useState(plan.stripe_price_id_yearly ?? '');

  async function handleSave() {
    setSaving(true);
    setStatus('idle');

    const supabase = createClient();
    const { error } = await supabase
      .from('products')
      .update({
        name,
        description: description || null,
        price_cad: priceMonthly,
        price_yearly: priceYearly,
        storage_gb: storageGb,
        disk_gb: storageGb,
        bandwidth_gb: bandwidthGb,
        default_php_workers: defaultPhpWorkers,
        max_php_workers: maxPhpWorkers,
        php_memory_mb: phpMemoryMb,
        php_workers: defaultPhpWorkers,
        sites_allowed: sitesAllowed,
        domains_allowed: domainsAllowed,
        has_staging: hasStaging,
        has_backups: hasBackups,
        has_cdn: hasCdn,
        has_waf: hasWaf,
        is_active: isActive,
        onboarding_type: onboardingType,
        support_response_hours: supportResponseHours,
        stripe_product_id: stripeProductId || null,
        stripe_price_id: stripeMonthlyId || null,
        stripe_price_id_yearly: stripeYearlyId || null,
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
          data: {
            name,
            description: description || null,
            price_cad: priceMonthly,
            price_yearly: priceYearly,
            is_active: isActive,
            stripe_product_id: plan.stripe_product_id,
            stripe_price_id: plan.stripe_price_id,
            stripe_price_id_yearly: plan.stripe_price_id_yearly,
          },
        }),
      });
      const result = await res.json();
      if (res.ok && result.stripe_product_id) {
        // Update local state with new Stripe IDs
        setStripeProductId(result.stripe_product_id);
        setStripeMonthlyId(result.stripe_price_id ?? '');
        setStripeYearlyId(result.stripe_price_id_yearly ?? '');
        plan.stripe_product_id = result.stripe_product_id;
        plan.stripe_price_id = result.stripe_price_id;
        plan.stripe_price_id_yearly = result.stripe_price_id_yearly;
      }
    } catch (e) {
      console.error('Stripe sync failed (plan saved to DB):', e);
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
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4">
          {/* Name & Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Name</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                className="input"
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label">Monthly price (cents CAD)</label>
              <input type="number" className="input" value={priceMonthly}
                onChange={e => setPriceMonthly(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Yearly price (cents CAD)</label>
              <input type="number" className="input" value={priceYearly}
                onChange={e => setPriceYearly(Number(e.target.value))} />
            </div>
          </div>

          {/* Stripe IDs */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-2">Stripe Integration</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label">Product ID</label>
              <input type="text" className="input font-mono text-xs" value={stripeProductId}
                onChange={e => setStripeProductId(e.target.value)}
                placeholder="prod_xxx" />
            </div>
            <div>
              <label className="label">Monthly Price ID</label>
              <input type="text" className="input font-mono text-xs" value={stripeMonthlyId}
                onChange={e => setStripeMonthlyId(e.target.value)}
                placeholder="price_xxx" />
            </div>
            <div>
              <label className="label">Yearly Price ID</label>
              <input type="text" className="input font-mono text-xs" value={stripeYearlyId}
                onChange={e => setStripeYearlyId(e.target.value)}
                placeholder="price_xxx" />
            </div>
          </div>

          {/* wp.cloud Resources */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-2">wp.cloud Resources</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label">Storage (GB)</label>
              <input type="number" className="input" value={storageGb}
                onChange={e => setStorageGb(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Bandwidth (GB)</label>
              <input type="number" className="input" value={bandwidthGb}
                onChange={e => setBandwidthGb(Number(e.target.value))} />
              <p className="text-xs text-gray-400 mt-1">0 = unlimited</p>
            </div>
            <div>
              <label className="label">Default PHP Workers</label>
              <input type="number" className="input" value={defaultPhpWorkers}
                onChange={e => setDefaultPhpWorkers(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Max PHP Workers</label>
              <input type="number" className="input" value={maxPhpWorkers}
                onChange={e => setMaxPhpWorkers(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">PHP Memory (MB)</label>
              <select className="input" value={phpMemoryMb}
                onChange={e => setPhpMemoryMb(Number(e.target.value))}>
                <option value={512}>512 MB</option>
                <option value={1024}>1024 MB</option>
                <option value={1536}>1536 MB</option>
                <option value={2048}>2048 MB</option>
              </select>
            </div>
          </div>

          {/* Limits & Support */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-2">Limits & Support</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label">Sites allowed</label>
              <input type="number" className="input" value={sitesAllowed}
                onChange={e => setSitesAllowed(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Domains allowed</label>
              <input type="number" className="input" value={domainsAllowed}
                onChange={e => setDomainsAllowed(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Onboarding Type</label>
              <select className="input" value={onboardingType}
                onChange={e => setOnboardingType(e.target.value)}>
                <option value="standard">Standard</option>
                <option value="guided">Guided</option>
                <option value="concierge">Concierge</option>
              </select>
            </div>
            <div>
              <label className="label">Support Response (hours)</label>
              <input type="number" className="input" value={supportResponseHours}
                onChange={e => setSupportResponseHours(Number(e.target.value))} />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex flex-wrap items-center gap-6 mb-5">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={hasStaging} onChange={e => setHasStaging(e.target.checked)} className="rounded border-gray-300 text-admin-600 focus:ring-admin-500" />
              Staging
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={hasBackups} onChange={e => setHasBackups(e.target.checked)} className="rounded border-gray-300 text-admin-600 focus:ring-admin-500" />
              Backups
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={hasCdn} onChange={e => setHasCdn(e.target.checked)} className="rounded border-gray-300 text-admin-600 focus:ring-admin-500" />
              CDN
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={hasWaf} onChange={e => setHasWaf(e.target.checked)} className="rounded border-gray-300 text-admin-600 focus:ring-admin-500" />
              WAF
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded border-gray-300 text-admin-600 focus:ring-admin-500" />
              Active
            </label>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-admin inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save changes'}
            </button>

            {status === 'success' && (
              <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                Saved successfully
              </span>
            )}
            {status === 'error' && (
              <span className="inline-flex items-center gap-1.5 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                Failed to save
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
