'use client';

import { useState, useEffect } from 'react';
import { Loader2, Shield, Server, HardDrive, Zap, Brain, AlertTriangle, Check, Info } from 'lucide-react';

const PLAN_CREDITS = 50; // base plan monthly deposit

export function SiteGuardrails({ siteId }: { siteId: string }) {
  const [config, setConfig] = useState({
    php_workers: 2,
    ssd_gb: 25,
    bursting_enabled: false,
    monthly_ai_token_limit: null as number | null,
  });
  const [creditCtx, setCreditCtx] = useState({
    subscription_credits: 50,
    purchased_credits: 0,
    auto_refill_enabled: false,
    auto_refill_amount: 50,
    other_sites_committed_cost: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/site-guardrails?siteId=${siteId}`)
      .then((r) => r.json())
      .then((data) => {
        setConfig({
          php_workers: data.php_workers ?? 2,
          ssd_gb: data.ssd_gb ?? 25,
          bursting_enabled: data.bursting_enabled ?? false,
          monthly_ai_token_limit: data.monthly_ai_token_limit ?? null,
        });
        setCreditCtx({
          subscription_credits: data.subscription_credits ?? 50,
          purchased_credits: data.purchased_credits ?? 0,
          auto_refill_enabled: data.auto_refill_enabled ?? false,
          auto_refill_amount: data.auto_refill_amount ?? 50,
          other_sites_committed_cost: data.other_sites_committed_cost ?? 0,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [siteId]);

  // Calculate costs
  const thisSiteCost = (config.php_workers * 5) + (config.ssd_gb * 0.5) + (config.bursting_enabled ? 10 : 0);
  const totalCommitted = thisSiteCost + creditCtx.other_sites_committed_cost;
  const remaining = PLAN_CREDITS - totalCommitted;
  const exceedsPlan = totalCommitted > PLAN_CREDITS;
  const shortfall = exceedsPlan ? Math.ceil(totalCommitted - PLAN_CREDITS) : 0;
  const canSave = !exceedsPlan || creditCtx.auto_refill_enabled || creditCtx.purchased_credits >= shortfall;

  async function handleSave() {
    if (!canSave) {
      setError('Enable auto-refill or purchase credits to cover the shortfall before saving.');
      return;
    }
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const res = await fetch('/api/site-guardrails', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, ...config }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      console.error('Save error:', e);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="animate-pulse h-32 bg-gray-100 rounded" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-4 h-4 text-brand-600" />
        <h3 className="text-sm font-semibold text-gray-900">Site Resources</h3>
      </div>
      <p className="text-xs text-gray-500 -mt-2">
        Adjust your site's resources. Changes apply to wp.cloud and are billed monthly via credits.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
            <Server className="w-3 h-3" /> PHP Workers
          </label>
          <input
            type="number"
            value={config.php_workers}
            onChange={(e) => setConfig({ ...config, php_workers: Math.max(1, Math.min(16, parseInt(e.target.value) || 1)) })}
            min={1}
            max={16}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
          />
          <p className="text-[10px] text-gray-400 mt-0.5">5 credits/worker/mo — <span className="font-medium text-gray-600">{config.php_workers * 5} credits</span></p>
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
            <HardDrive className="w-3 h-3" /> SSD Storage (GB)
          </label>
          <input
            type="number"
            value={config.ssd_gb}
            onChange={(e) => setConfig({ ...config, ssd_gb: Math.max(5, Math.min(500, parseInt(e.target.value) || 5)) })}
            min={5}
            max={500}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
          />
          <p className="text-[10px] text-gray-400 mt-0.5">0.50 credits/GB/mo — <span className="font-medium text-gray-600">{config.ssd_gb * 0.5} credits</span></p>
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
            <Brain className="w-3 h-3" /> Monthly AI Token Limit
          </label>
          <input
            type="number"
            value={config.monthly_ai_token_limit ?? ''}
            onChange={(e) =>
              setConfig({
                ...config,
                monthly_ai_token_limit: e.target.value ? parseInt(e.target.value) : null,
              })
            }
            placeholder="No limit"
            min={1000}
            step={1000}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
          />
          <p className="text-[10px] text-gray-400 mt-0.5">AI usage billed per-request</p>
        </div>
        <div className="flex flex-col justify-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.bursting_enabled}
              onChange={(e) => setConfig({ ...config, bursting_enabled: e.target.checked })}
              className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-700 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Enable Bursting
            </span>
          </label>
          <p className="text-[10px] text-gray-400 ml-6 mt-0.5">{config.bursting_enabled ? '10 credits/mo' : '—'}</p>
        </div>
      </div>

      {/* ── Commitment Summary ── */}
      <div className={`rounded-xl border px-4 py-4 space-y-2 ${
        exceedsPlan ? 'border-amber-200 bg-amber-50/50' : 'border-gray-200 bg-gray-50'
      }`}>
        {/* This site cost */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">This site</span>
          <span className="text-sm font-semibold text-gray-900">{thisSiteCost} credits/mo</span>
        </div>

        {/* Other sites */}
        {creditCtx.other_sites_committed_cost > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Other sites</span>
            <span className="text-sm text-gray-600">{creditCtx.other_sites_committed_cost} credits/mo</span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* Total committed */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-700">Total monthly commitment</span>
          <span className={`text-sm font-bold ${exceedsPlan ? 'text-amber-700' : 'text-gray-900'}`}>
            {totalCommitted} credits/mo
          </span>
        </div>

        {/* Plan coverage */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Your plan includes</span>
          <span className="text-sm text-gray-600">{PLAN_CREDITS} credits/mo</span>
        </div>

        {/* Result */}
        {!exceedsPlan ? (
          <div className="flex items-center gap-1.5 pt-1">
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs text-emerald-700">
              Covered by your plan. {remaining} credits remaining for AI & other services.
            </span>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            <div className="flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
              <span className="text-xs text-amber-800">
                Your hosting requires <strong>{shortfall} additional credits/mo</strong> (${shortfall} CAD) beyond your plan.
                {creditCtx.auto_refill_enabled
                  ? ` Auto-refill is on — you'll be charged automatically when your balance drops below ${creditCtx.auto_refill_amount} credits.`
                  : ' Enable auto-refill or purchase credits to cover this.'}
              </span>
            </div>

            {!creditCtx.auto_refill_enabled && (
              <a
                href="/dashboard/billing"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-800 underline underline-offset-2"
              >
                Go to Billing to enable auto-refill →
              </a>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> {error}
        </p>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || !canSave}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white rounded-lg disabled:opacity-50 transition-colors ${
            canSave ? 'bg-brand-600 hover:bg-brand-700' : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          {saved ? 'Saved & Applied!' : 'Save & Apply to Site'}
        </button>
      </div>
    </div>
  );
}
