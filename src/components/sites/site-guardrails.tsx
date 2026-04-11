'use client';

import { useState, useEffect } from 'react';
import { Loader2, Shield, Server, HardDrive, Zap, Brain, TrendingUp } from 'lucide-react';

export function SiteGuardrails({ siteId }: { siteId: string }) {
  const [config, setConfig] = useState({
    php_workers: 2,
    ssd_gb: 25,
    bursting_enabled: false,
    monthly_ai_token_limit: null as number | null,
  });
  const [usageMeter, setUsageMeter] = useState({ usage_this_cycle: 0, included_credits: 36, projected_overage: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/site-guardrails?siteId=${siteId}`).then(r => r.json()),
      fetch('/api/usage/meter').then(r => r.json()),
    ]).then(([configData, meterData]) => {
      setConfig({
        php_workers: configData.php_workers ?? 2,
        ssd_gb: configData.ssd_gb ?? 25,
        bursting_enabled: configData.bursting_enabled ?? false,
        monthly_ai_token_limit: configData.monthly_ai_token_limit ?? null,
      });
      setUsageMeter(meterData);
    }).catch(console.error).finally(() => setLoading(false));
  }, [siteId]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/site-guardrails', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, ...config }),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  if (loading) return <div className="animate-pulse h-32 bg-gray-100 rounded" />;

  const thisSiteCost = (config.php_workers * 8) + (config.ssd_gb * 0.8) + (config.bursting_enabled ? 10 : 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-4 h-4 text-brand-600" />
        <h3 className="text-sm font-semibold text-gray-900">Site Resources</h3>
      </div>
      <p className="text-xs text-gray-500 -mt-2">
        Scale your site's resources. Changes affect your monthly usage and are billed at cycle end.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-1.5 text-xs text-gray-500 mb-1"><Server className="w-3 h-3" /> PHP Workers</label>
          <input type="number" value={config.php_workers}
            onChange={(e) => setConfig({ ...config, php_workers: Math.max(1, Math.min(16, parseInt(e.target.value) || 1)) })}
            min={1} max={16}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
          <p className="text-[10px] text-gray-400 mt-0.5">8 cr/worker/mo — <span className="font-medium text-gray-600">{config.php_workers * 8} cr</span></p>
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-xs text-gray-500 mb-1"><HardDrive className="w-3 h-3" /> SSD Storage (GB)</label>
          <input type="number" value={config.ssd_gb}
            onChange={(e) => setConfig({ ...config, ssd_gb: Math.max(5, Math.min(500, parseInt(e.target.value) || 5)) })}
            min={5} max={500}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
          <p className="text-[10px] text-gray-400 mt-0.5">0.80 cr/GB/mo — <span className="font-medium text-gray-600">{(config.ssd_gb * 0.8).toFixed(1)} cr</span></p>
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-xs text-gray-500 mb-1"><Brain className="w-3 h-3" /> Monthly AI Token Limit</label>
          <input type="number" value={config.monthly_ai_token_limit ?? ''}
            onChange={(e) => setConfig({ ...config, monthly_ai_token_limit: e.target.value ? parseInt(e.target.value) : null })}
            placeholder="No limit" min={1000} step={1000}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
          <p className="text-[10px] text-gray-400 mt-0.5">AI billed per-use</p>
        </div>
        <div className="flex flex-col justify-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={config.bursting_enabled}
              onChange={(e) => setConfig({ ...config, bursting_enabled: e.target.checked })}
              className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
            <span className="text-sm text-gray-700 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Enable Bursting
            </span>
          </label>
          <p className="text-[10px] text-gray-400 ml-6 mt-0.5">{config.bursting_enabled ? '10 cr/mo' : '—'}</p>
        </div>
      </div>

      {/* Impact preview */}
      <div className="rounded-xl bg-gray-50 px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> This site adds</span>
          <span className="text-sm font-bold text-gray-900">{thisSiteCost} cr/mo</span>
        </div>
        {thisSiteCost > usageMeter.included_credits && (
          <p className="text-xs text-amber-600">
            This site alone exceeds your {usageMeter.included_credits} included credits.
            Overage of ${Math.round(thisSiteCost - usageMeter.included_credits)} will be charged at cycle end.
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-50 transition-colors">
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          {saved ? 'Saved & Applied!' : 'Save & Apply'}
        </button>
      </div>
    </div>
  );
}
