'use client';

import { useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

/**
 * Admin: re-apply the site's current plan resources (workers/memory/storage)
 * to wp.cloud + the DB. Useful after a plan's metadata changes, since those
 * edits don't retro-apply to already-provisioned sites.
 */
export function ReapplyPlanButton({ siteId }: { siteId: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function run() {
    setBusy(true); setMsg(''); setErr('');
    try {
      const res = await fetch('/api/admin/reapply-plan-resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? 'Failed');
      } else {
        const r = data.results?.[0];
        setMsg(r ? `${r.workers}w · ${r.storage}GB · ${r.memory}MB${r.failed?.length ? ` — ${r.failed.length} wp.cloud key(s) failed` : ' applied'}` : 'Done');
      }
    } catch {
      setErr('Network error');
    }
    setBusy(false);
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button onClick={run} disabled={busy} className="btn-admin text-sm inline-flex items-center gap-2">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Re-sync to plan
      </button>
      {msg && <span className="text-xs text-green-600">{msg}</span>}
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}
