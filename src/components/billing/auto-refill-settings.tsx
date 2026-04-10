'use client';

import { useState, useEffect } from 'react';
import { Loader2, Zap } from 'lucide-react';

const REFILL_AMOUNTS = [25, 50, 100, 250, 500];

export function AutoRefillSettings() {
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState(10);
  const [refillAmount, setRefillAmount] = useState(50);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/credits/auto-refill')
      .then((r) => r.json())
      .then((data) => {
        setEnabled(data.enabled ?? false);
        setThreshold(data.threshold ?? 10);
        setRefillAmount(data.refill_amount ?? 50);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch('/api/credits/auto-refill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, threshold, refill_amount: refillAmount }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Save error:', e);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="animate-pulse h-24 bg-gray-100 rounded" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-gray-700">Auto-Refill</span>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            enabled ? 'bg-brand-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-4.5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="space-y-3 pl-6 border-l-2 border-brand-100">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              When balance drops below
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                max={1000}
                className="w-20 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
              />
              <span className="text-xs text-gray-500">credits</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Auto-purchase amount
            </label>
            <div className="flex flex-wrap gap-1.5">
              {REFILL_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setRefillAmount(amt)}
                  className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                    refillAmount === amt
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                  }`}
                >
                  {amt} credits (${amt})
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-50 transition-colors"
        >
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
