'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { ChevronDown, ChevronRight, Save, CheckCircle, AlertCircle } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  disk_gb: number;
  bandwidth_gb: number;
  php_workers: number;
  sites_allowed: number;
  domains_allowed: number;
  has_staging: boolean;
  has_backups: boolean;
  has_cdn: boolean;
  has_waf: boolean;
  is_active: boolean;
}

export function EditPlanForm({ plan }: { plan: Plan }) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description ?? '');
  const [priceMonthly, setPriceMonthly] = useState(plan.price_monthly);
  const [priceYearly, setPriceYearly] = useState(plan.price_yearly);
  const [diskGb, setDiskGb] = useState(plan.disk_gb);
  const [bandwidthGb, setBandwidthGb] = useState(plan.bandwidth_gb);
  const [phpWorkers, setPhpWorkers] = useState(plan.php_workers);
  const [sitesAllowed, setSitesAllowed] = useState(plan.sites_allowed);
  const [domainsAllowed, setDomainsAllowed] = useState(plan.domains_allowed);
  const [hasStaging, setHasStaging] = useState(plan.has_staging);
  const [hasBackups, setHasBackups] = useState(plan.has_backups);
  const [hasCdn, setHasCdn] = useState(plan.has_cdn);
  const [hasWaf, setHasWaf] = useState(plan.has_waf);
  const [isActive, setIsActive] = useState(plan.is_active);

  async function handleSave() {
    setSaving(true);
    setStatus('idle');

    const supabase = createClient();
    const { error } = await supabase
      .from('plans')
      .update({
        name,
        description: description || null,
        price_monthly: priceMonthly,
        price_yearly: priceYearly,
        disk_gb: diskGb,
        bandwidth_gb: bandwidthGb,
        php_workers: phpWorkers,
        sites_allowed: sitesAllowed,
        domains_allowed: domainsAllowed,
        has_staging: hasStaging,
        has_backups: hasBackups,
        has_cdn: hasCdn,
        has_waf: hasWaf,
        is_active: isActive,
      })
      .eq('id', plan.id);

    setSaving(false);
    setStatus(error ? 'error' : 'success');
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

          {/* Number fields */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label">Monthly price (cents)</label>
              <input
                type="number"
                className="input"
                value={priceMonthly}
                onChange={e => setPriceMonthly(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Yearly price (cents)</label>
              <input
                type="number"
                className="input"
                value={priceYearly}
                onChange={e => setPriceYearly(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Disk (GB)</label>
              <input
                type="number"
                className="input"
                value={diskGb}
                onChange={e => setDiskGb(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Bandwidth (GB)</label>
              <input
                type="number"
                className="input"
                value={bandwidthGb}
                onChange={e => setBandwidthGb(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label">PHP workers</label>
              <input
                type="number"
                className="input"
                value={phpWorkers}
                onChange={e => setPhpWorkers(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Sites allowed</label>
              <input
                type="number"
                className="input"
                value={sitesAllowed}
                onChange={e => setSitesAllowed(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Domains allowed</label>
              <input
                type="number"
                className="input"
                value={domainsAllowed}
                onChange={e => setDomainsAllowed(Number(e.target.value))}
              />
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
