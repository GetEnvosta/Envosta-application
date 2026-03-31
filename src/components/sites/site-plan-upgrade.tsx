'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Loader2, ArrowRight, Check, Sparkles, CreditCard } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  slug: string;
  price_cad: number;
  price_yearly_cad: number;
  sort_order: number;
  metadata: any;
  features: string[];
}

export function SitePlanUpgrade({ siteId, currentPlanSlug, currentSortOrder }: {
  siteId: string;
  currentPlanSlug: string;
  currentSortOrder: number;
}) {
  const [nextPlan, setNextPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.from('products')
      .select('id, name, slug, price_cad, price_yearly_cad, sort_order, metadata, features')
      .eq('type', 'hosting_plan')
      .eq('is_active', true)
      .gt('sort_order', currentSortOrder)
      .order('sort_order', { ascending: true })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) setNextPlan(data[0] as Plan);
        setLoading(false);
      });
  }, [currentSortOrder]);

  async function handleUpgrade() {
    if (!nextPlan) return;
    setUpgrading(true);
    setMsg('');
    try {
      const res = await fetch('/api/site-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change-plan', siteId, newPlanId: nextPlan.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg('Plan upgraded! Changes are being applied.');
        window.location.reload();
      } else {
        setMsg(data.error ?? 'Upgrade failed');
      }
    } catch { setMsg('Connection error'); }
    setUpgrading(false);
  }

  if (loading || !nextPlan) return null;

  const pm = nextPlan.metadata ?? {};
  const features = Array.isArray(nextPlan.features) ? nextPlan.features.slice(0, 4) : [];
  const price = (nextPlan.price_cad / 100).toFixed(0);

  return (
    <div className="rounded-xl border-2 border-brand-200 bg-gradient-to-r from-brand-50/50 to-white p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-brand-600" />
            <p className="text-sm font-semibold text-gray-900">Upgrade to {nextPlan.name}</p>
            <span className="text-xs font-semibold text-brand-600">${price}/mo</span>
          </div>
          <p className="text-xs text-gray-500 mb-2">
            {pm.storage_gb ?? 50}GB storage &middot; {pm.php_workers_default ?? 4} workers &middot; {pm.php_memory_mb ?? 1024}MB memory
          </p>
          {features.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {features.map((f: string) => (
                <span key={f} className="text-[11px] text-gray-500 flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-500" /> {f}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={handleUpgrade}
          disabled={upgrading}
          className="btn-primary text-sm py-2 px-4 shrink-0"
        >
          {upgrading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Upgrading...</> : <>Upgrade <ArrowRight className="w-3.5 h-3.5" /></>}
        </button>
      </div>
      {msg && (
        <p className={`text-xs mt-2 ${msg.includes('fail') || msg.includes('error') ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>
      )}
    </div>
  );
}

export function TrialActivate({ siteId, planName, trialEnd }: {
  siteId: string;
  planName: string;
  trialEnd: string;
}) {
  const [activating, setActivating] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleActivate() {
    setActivating(true);
    setMsg('');
    try {
      const res = await fetch('/api/site-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end-trial', siteId }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg('Trial ended! Your plan is now active.');
        window.location.reload();
      } else {
        setMsg(data.error ?? 'Failed to activate');
      }
    } catch { setMsg('Connection error'); }
    setActivating(false);
  }

  const daysLeft = Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / 86400000));

  return (
    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-emerald-900">Free trial &middot; {daysLeft} days remaining</p>
          <p className="text-xs text-emerald-700 mt-0.5">
            {planName} plan. Your card will be charged when the trial ends on {new Date(trialEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.
          </p>
        </div>
        <button
          onClick={handleActivate}
          disabled={activating}
          className="btn-primary text-sm py-2 px-4 shrink-0"
        >
          {activating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Activating...</> : <><CreditCard className="w-3.5 h-3.5" /> Start Plan Now</>}
        </button>
      </div>
      {msg && (
        <p className={`text-xs mt-2 ${msg.includes('fail') || msg.includes('error') ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>
      )}
    </div>
  );
}
