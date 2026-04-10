'use client';

import { useState, useEffect } from 'react';
import { Loader2, Shield } from 'lucide-react';

interface Guardrails {
  max_php_workers: number | null;
  max_ssd_gb: number | null;
  bursting_enabled: boolean;
  monthly_ai_token_limit: number | null;
}

export function SiteGuardrails({ siteId }: { siteId: string }) {
  const [guardrails, setGuardrails] = useState<Guardrails>({
    max_php_workers: null,
    max_ssd_gb: null,
    bursting_enabled: false,
    monthly_ai_token_limit: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/site-guardrails?siteId=${siteId}`)
      .then((r) => r.json())
      .then(setGuardrails)
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
        body: JSON.stringify({ siteId, ...guardrails }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
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
        <h3 className="text-sm font-semibold text-gray-900">Spending Guardrails</h3>
      </div>
      <p className="text-xs text-gray-500 -mt-2">Set limits on resource usage to control monthly credit spend.</p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Max PHP Workers</label>
          <input
            type="number"
            value={guardrails.max_php_workers ?? ''}
            onChange={(e) =>
              setGuardrails({ ...guardrails, max_php_workers: e.target.value ? parseInt(e.target.value) : null })
            }
            placeholder="No limit"
            min={1}
            max={16}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Max SSD (GB)</label>
          <input
            type="number"
            value={guardrails.max_ssd_gb ?? ''}
            onChange={(e) =>
              setGuardrails({ ...guardrails, max_ssd_gb: e.target.value ? parseInt(e.target.value) : null })
            }
            placeholder="No limit"
            min={5}
            max={500}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Monthly AI Token Limit</label>
          <input
            type="number"
            value={guardrails.monthly_ai_token_limit ?? ''}
            onChange={(e) =>
              setGuardrails({
                ...guardrails,
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
              checked={guardrails.bursting_enabled}
              onChange={(e) => setGuardrails({ ...guardrails, bursting_enabled: e.target.checked })}
              className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-700">Enable Bursting</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-50 transition-colors"
        >
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          {saved ? 'Saved!' : 'Save Guardrails'}
        </button>
      </div>
    </div>
  );
}
