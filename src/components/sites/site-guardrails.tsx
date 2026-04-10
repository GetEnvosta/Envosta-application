'use client';

import { useState, useEffect } from 'react';
import { Loader2, Shield, Server, HardDrive, Zap, Brain } from 'lucide-react';

export function SiteGuardrails({ siteId }: { siteId: string }) {
  const [config, setConfig] = useState({
    php_workers: 2,
    ssd_gb: 10,
    bursting_enabled: false,
    monthly_ai_token_limit: null as number | null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/site-guardrails?siteId=${siteId}`)
      .then((r) => r.json())
      .then((data) => setConfig({
        php_workers: data.php_workers ?? 2,
        ssd_gb: data.ssd_gb ?? 10,
        bursting_enabled: data.bursting_enabled ?? false,
        monthly_ai_token_limit: data.monthly_ai_token_limit ?? null,
      }))
      .catch(console.error)
      .finally(() => setLoading(false));
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
        <h3 className="text-sm font-semibold text-gray-900">Site Resources & Guardrails</h3>
      </div>
      <p className="text-xs text-gray-500 -mt-2">
        Adjust your site's resources. Changes apply to wp.cloud and affect monthly credit cost.
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
          <p className="text-[10px] text-gray-400 mt-0.5">5 credits/worker/month</p>
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
          <p className="text-[10px] text-gray-400 mt-0.5">0.50 credits/GB/month</p>
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
        </div>
        <div className="flex items-end pb-1">
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
          <p className="text-[10px] text-gray-400 ml-6">10 credits/month</p>
        </div>
      </div>

      {/* Cost preview */}
      <div className="bg-gray-50 rounded-lg px-4 py-3">
        <p className="text-xs text-gray-500">
          Estimated monthly cost:{' '}
          <span className="font-semibold text-gray-900">
            {(config.php_workers * 5) + (config.ssd_gb * 0.5) + (config.bursting_enabled ? 10 : 0)} credits
          </span>
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-50 transition-colors"
        >
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          {saved ? 'Saved & Applied!' : 'Save & Apply to Site'}
        </button>
      </div>
    </div>
  );
}
