'use client';

import { useState, useEffect } from 'react';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';

export function SpendingCap() {
  const [cap, setCap] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/usage/cap')
      .then(r => r.json())
      .then(data => {
        setCap(data.spending_cap);
        setInput(data.spending_cap ? String(data.spending_cap) : '');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const value = input.trim() ? parseInt(input, 10) : null;

    try {
      const res = await fetch('/api/usage/cap', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spending_cap: value }),
      });
      if (res.ok) {
        setCap(value);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  if (loading) return <div className="animate-pulse h-16 bg-gray-100 rounded" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-brand-600" />
        <h3 className="text-sm font-semibold text-gray-900">Spending Cap</h3>
      </div>
      <p className="text-xs text-gray-500">
        Set a maximum monthly bill. Variable usage will pause when the cap is hit.
        Infrastructure is checked when you change site settings.
      </p>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
          <input
            type="number"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="No cap"
            min={36}
            className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
          />
        </div>
        <span className="text-xs text-gray-400">USD/mo</span>
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-50 transition-colors">
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          {saved ? 'Saved!' : 'Set Cap'}
        </button>
      </div>

      {cap && (
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-500" />
          Variable usage (AI, calls) will pause when your bill reaches ${cap}.
        </p>
      )}
      {!cap && (
        <p className="text-xs text-gray-400">No cap set — you'll be billed for all usage at cycle end.</p>
      )}
    </div>
  );
}
