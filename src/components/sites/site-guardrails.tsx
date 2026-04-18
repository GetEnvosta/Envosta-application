'use client';

import { useState, useEffect } from 'react';
import { Loader2, Check, ArrowUpRight, Server, HardDrive, Shield, Zap, Globe, ChevronDown } from 'lucide-react';

interface PlanTier {
  slug: string;
  name: string;
  price: number;
  productId: string;
  features: {
    storage_gb: number;
    php_workers: number;
    php_memory_mb: number;
    has_backups: boolean;
    has_cdn: boolean;
    has_waf: boolean;
    has_staging: boolean;
    bursting_enabled: boolean;
  };
}

export function SiteGuardrails({ siteId }: { siteId: string }) {
  const [currentPlan, setCurrentPlan] = useState<PlanTier | null>(null);
  const [plans, setPlans] = useState<PlanTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        // Get site's current plan
        const siteRes = await fetch(`/api/site-guardrails?siteId=${siteId}`);
        const siteData = await siteRes.json();

        // Get all hosting plans
        const plansRes = await fetch('/api/hosting-plans');
        const plansData = await plansRes.json();

        setPlans(plansData.plans ?? []);
        setCurrentPlan(plansData.plans?.find((p: PlanTier) => p.productId === siteData.product_id) ?? null);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    load();
  }, [siteId]);

  async function handleChangePlan(newSlug: string) {
    if (upgrading || newSlug === currentPlan?.slug) return;
    setUpgrading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/upgrade-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, newPlanSlug: newSlug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to change plan');
        setUpgrading(false);
        return;
      }
      setSuccess(data.message);
      setCurrentPlan(plans.find(p => p.slug === newSlug) ?? null);
      setTimeout(() => setSuccess(''), 5000);
    } catch (e: any) {
      setError(e?.message ?? 'Network error');
    }
    setUpgrading(false);
  }

  if (loading) return <div className="animate-pulse h-8 bg-gray-100 rounded" />;

  const config = currentPlan?.features;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-1 group"
      >
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500 group-hover:text-amber-600 transition-colors" />
          <h3 className="text-sm font-semibold text-gray-900">
            Plan &amp; Resources
            {currentPlan && (
              <span className="ml-2 text-xs font-normal text-gray-500">— {currentPlan.name}</span>
            )}
          </h3>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-5 pt-4 border-t border-gray-100 mt-3">
          {/* Current plan resources */}
          {config && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <ResourceCard icon={<Server className="w-3.5 h-3.5" />} label="PHP Workers" value={`${config.php_workers}`} />
              <ResourceCard icon={<HardDrive className="w-3.5 h-3.5" />} label="Storage" value={`${config.storage_gb} GB`} />
              <ResourceCard icon={<Globe className="w-3.5 h-3.5" />} label="PHP Memory" value={`${config.php_memory_mb} MB`} />
              <ResourceCard icon={<Shield className="w-3.5 h-3.5" />} label="Features" value={[
                config.has_backups && 'Backups',
                config.has_cdn && 'CDN',
                config.has_waf && 'WAF',
                config.has_staging && 'Staging',
              ].filter(Boolean).join(', ') || 'Basic'} />
            </div>
          )}

          {/* Plan tier selector */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-3">Change plan for this site</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {plans.map((plan) => {
                const isCurrent = plan.slug === currentPlan?.slug;
                const isUpgrade = currentPlan && plan.price > currentPlan.price;
                return (
                  <button
                    key={plan.slug}
                    type="button"
                    onClick={() => !isCurrent && handleChangePlan(plan.slug)}
                    disabled={isCurrent || upgrading}
                    className={`relative text-left border rounded-xl p-4 transition-all ${
                      isCurrent
                        ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                        : 'border-gray-200 bg-white hover:border-gray-300 cursor-pointer'
                    } disabled:cursor-default`}
                  >
                    {isCurrent && (
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-blue-600 text-[10px] font-medium text-white">
                        Current
                      </div>
                    )}
                    <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">${plan.price}/mo</p>
                    <div className="mt-2 space-y-1">
                      <PlanFeature label={`${plan.features.php_workers} PHP workers`} />
                      <PlanFeature label={`${plan.features.storage_gb} GB storage`} />
                      <PlanFeature label={`${plan.features.php_memory_mb} MB memory`} />
                      {plan.features.has_staging && <PlanFeature label="Staging environment" />}
                      {plan.features.bursting_enabled && <PlanFeature label="Traffic bursting" />}
                    </div>
                    {!isCurrent && (
                      <div className="mt-3 flex items-center gap-1 text-xs font-medium text-blue-600">
                        {isUpgrade ? 'Upgrade' : 'Downgrade'}
                        <ArrowUpRight className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {upgrading && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" /> Changing plan and updating resources...
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-xs text-emerald-700">{success}</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <p className="text-[11px] text-gray-400">
            Changing plans updates your Stripe subscription line item and automatically adjusts wp.cloud resources. Proration is applied instantly.
          </p>
        </div>
      )}
    </div>
  );
}

function ResourceCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-gray-400">{icon}</span>
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function PlanFeature({ label }: { label: string }) {
  return (
    <p className="text-xs text-gray-600 flex items-center gap-1.5">
      <Check className="w-3 h-3 text-green-600 flex-shrink-0" />
      {label}
    </p>
  );
}
