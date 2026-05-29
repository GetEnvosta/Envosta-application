'use client';

import { useState } from 'react';
import { Loader2, Check, Server } from 'lucide-react';

const PHP_VERSIONS = ['8.2', '8.3', '8.4', '8.5'];

export function PhpVersionSelector({
  siteId,
  initialVersion,
}: {
  siteId: string;
  initialVersion?: string | null;
}) {
  const current = initialVersion && PHP_VERSIONS.includes(initialVersion) ? initialVersion : '8.4';
  const [applied, setApplied] = useState(current);
  const [selected, setSelected] = useState(current);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const dirty = selected !== applied;

  async function apply() {
    if (!dirty || saving) return;
    setSaving(true);
    setMsg('');
    setError('');
    try {
      const res = await fetch('/api/site-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-meta', siteId, key: 'php_version', value: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to update PHP version');
        return;
      }
      setApplied(selected);
      setMsg(`PHP ${selected} applied`);
      setTimeout(() => setMsg(''), 4000);
    } catch {
      setError('Connection error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Server className="w-4 h-4 text-gray-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900">PHP Version</p>
            <p className="text-xs text-gray-500">Higher versions are faster and more secure</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={saving}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 disabled:opacity-50"
          >
            {PHP_VERSIONS.map((v) => (
              <option key={v} value={v}>
                PHP {v}
              </option>
            ))}
          </select>
          <button
            onClick={apply}
            disabled={!dirty || saving}
            className="btn-primary text-xs py-1.5 px-3 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Apply
          </button>
        </div>
      </div>

      {dirty && !saving && (
        <p className="text-[11px] text-amber-600 mt-2">
          Switching PHP versions briefly restarts your site. Test your plugins afterward.
        </p>
      )}
      {msg && <p className="text-xs text-green-600 mt-2">{msg}</p>}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
