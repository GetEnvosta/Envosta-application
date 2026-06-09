'use client';

import { useState } from 'react';
import { Loader2, ShieldCheck, RefreshCw } from 'lucide-react';

type Attribution = { plan?: string; ok?: boolean; error?: string | null; at?: string } | null | undefined;

/**
 * Admin: shows whether a site has the Jetpack partner license attached
 * (from sites.metadata.jetpack_attribution) and lets an admin (re-)attach it
 * via /api/admin/jetpack-provision.
 */
export function JetpackStatus({ siteId, initial }: { siteId: string; initial: Attribution }) {
  const [status, setStatus] = useState<Attribution>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function reattach() {
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/admin/jetpack-provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId }),
      });
      const data = await res.json();
      if (!res.ok) setErr(data.error ?? 'Failed');
      else setStatus({ plan: data.plan, ok: true, at: new Date().toISOString() });
    } catch {
      setErr('Network error');
    }
    setBusy(false);
  }

  const licensed = status?.ok === true;
  const label = licensed
    ? `Licensed — ${status?.plan ?? 'free'}`
    : status
      ? `Not attached${status?.error ? ` (${status.error})` : ''}`
      : 'Not attached yet';

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <ShieldCheck className={`w-4 h-4 ${licensed ? 'text-emerald-600' : 'text-gray-300'}`} />
        <div>
          <p className="text-sm font-medium text-gray-900">Jetpack partner license</p>
          <p className={`text-xs ${licensed ? 'text-emerald-600' : 'text-gray-500'}`}>{label}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {err && <span className="text-xs text-red-600">{err}</span>}
        <button onClick={reattach} disabled={busy} className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {licensed ? 'Re-attach' : 'Attach license'}
        </button>
      </div>
    </div>
  );
}
