'use client';

import { useState } from 'react';
import { Loader2, Percent } from 'lucide-react';

/**
 * Admin toggle for a customer's reseller flag. A reseller gets a flat
 * platform discount on every per-site subscription they own. Posts to
 * /api/admin/set-reseller (admin-gated).
 */
export function ResellerToggle({ userId, initialReseller }: { userId: string; initialReseller: boolean }) {
  const [reseller, setReseller] = useState(initialReseller);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function toggle() {
    const next = !reseller;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/set-reseller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reseller: next }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? 'Failed');
      else setReseller(next);
    } catch {
      setError('Network error');
    }
    setSaving(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      title="Resellers get a flat discount on every site subscription they own"
      className={`inline-flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg border transition-colors disabled:opacity-50 ${
        reseller
          ? 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100'
          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
    >
      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Percent className="w-3 h-3" />}
      {reseller ? 'Reseller' : 'Mark reseller'}
      {error && <span className="text-red-600 ml-1">{error}</span>}
    </button>
  );
}
