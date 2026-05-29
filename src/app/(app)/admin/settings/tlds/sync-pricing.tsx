'use client';

/**
 * "Check OpenSRS pricing (+25%)" button for /admin/settings/tlds.
 *
 * Flow: click → POST /api/admin/sync-tld-pricing {mode:'preview'} → render a
 * comparison table. USD = OpenSRS × 1.25 (fixed); CAD = USD × the FX rate, which
 * is editable and recomputed LOCALLY (no re-probe of OpenSRS). Nothing is written
 * until "Apply" → POST {mode:'apply'} with the reviewed rows.
 *
 * Only the register price is synced. Renewal prices are left untouched.
 */
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Loader2, Check, AlertTriangle, X, DollarSign } from 'lucide-react';

interface PreviewRow {
  tld: string;
  displayName: string;
  status: 'ok' | 'error';
  error?: string;
  openSrsUsd: number | null;
  openSrsRenewUsd: number | null;
  currentUsdCents: number | null;
  currentCadCents: number | null;
  currentRenewUsdCents: number | null;
  currentRenewCadCents: number | null;
  proposedUsdCents: number | null;
  proposedRenewUsdCents: number | null;
}

interface PreviewResponse {
  markup: number;
  fxRate: number;
  fxSource: string;
  counts: { total: number; ok: number; failed: number };
  rows: PreviewRow[];
}

const fmt = (cents: number | null | undefined) =>
  cents == null ? '—' : `$${(cents / 100).toFixed(2)}`;

export function SyncPricingButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'preview' | 'applying'>('idle');
  const [data, setData] = useState<PreviewResponse | null>(null);
  const [fxRate, setFxRate] = useState(1.38);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState<{ applied: number; errors: { tld: string; error: string }[] } | null>(null);

  // CAD recomputed live from the editable FX rate (USD is the fixed anchor).
  const rowsWithCad = useMemo(() => {
    if (!data) return [];
    return data.rows.map(r => ({
      ...r,
      proposedCadCents: r.proposedUsdCents != null ? Math.round(r.proposedUsdCents * fxRate) : null,
      proposedRenewCadCents: r.proposedRenewUsdCents != null ? Math.round(r.proposedRenewUsdCents * fxRate) : null,
    }));
  }, [data, fxRate]);

  const okRows = rowsWithCad.filter(r => r.status === 'ok');

  async function runPreview() {
    setStatus('loading');
    setError('');
    setApplied(null);
    try {
      const res = await fetch('/api/admin/sync-tld-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'preview' }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? `HTTP ${res.status}`); setStatus('idle'); return; }
      setData(json);
      setFxRate(json.fxRate);
      setStatus('preview');
    } catch {
      setError('Connection error reaching OpenSRS check.');
      setStatus('idle');
    }
  }

  async function apply() {
    if (okRows.length === 0) return;
    setStatus('applying');
    setError('');
    try {
      const items = okRows.map(r => ({
        tld: r.tld,
        usdCents: r.proposedUsdCents,
        cadCents: r.proposedCadCents,
        renewUsdCents: r.proposedRenewUsdCents,
        renewCadCents: r.proposedRenewCadCents,
      }));
      const res = await fetch('/api/admin/sync-tld-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'apply', items }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? `HTTP ${res.status}`); setStatus('preview'); return; }
      setApplied({ applied: json.applied ?? 0, errors: json.errors ?? [] });
      setStatus('preview');
      router.refresh();
    } catch {
      setError('Connection error while applying prices.');
      setStatus('preview');
    }
  }

  function close() {
    setOpen(false);
    setStatus('idle');
    setData(null);
    setApplied(null);
    setError('');
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); runPreview(); }}
        className="btn-admin text-sm inline-flex items-center gap-1.5"
      >
        <DollarSign className="w-4 h-4" />
        Check OpenSRS pricing (+25%)
      </button>
    );
  }

  return (
    <div className="card p-5 mb-4 border-indigo-100">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">OpenSRS price check — register + renew, +25%</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            USD = OpenSRS cost × 1.25. CAD = USD × the rate below. Each cell shows registration on top, renewal
            (<span className="font-medium">ren</span>) below. Nothing is saved until you click Apply.
          </p>
        </div>
        <button type="button" onClick={close} className="text-gray-400 hover:text-gray-600" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-xs text-red-700 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      {applied && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-green-50 border border-green-100 text-xs text-green-700 flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 shrink-0" />
          Applied {applied.applied} price{applied.applied === 1 ? '' : 's'}.
          {applied.errors.length > 0 && ` ${applied.errors.length} failed: ${applied.errors.map(e => e.tld).join(', ')}.`}
        </div>
      )}

      {status === 'loading' && (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Probing OpenSRS for each active TLD…
        </div>
      )}

      {(status === 'preview' || status === 'applying') && data && (
        <>
          {/* FX rate control */}
          <div className="flex flex-wrap items-center gap-3 mb-3 px-3 py-2.5 rounded-lg bg-gray-50 text-sm">
            <label className="text-xs font-medium text-gray-600">USD → CAD rate</label>
            <input
              type="number"
              step="0.0001"
              min="0.5"
              max="3"
              value={fxRate}
              onChange={e => setFxRate(Number(e.target.value) || 0)}
              className="input w-28 py-1 text-sm tabular-nums"
            />
            <span className={`text-[11px] px-1.5 py-0.5 rounded ${data.fxSource === 'fallback' ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600'}`}>
              {data.fxSource === 'fallback' ? 'live rate unavailable — fallback' : data.fxSource === 'manual' ? 'manual' : 'live · Frankfurter'}
            </span>
            <button type="button" onClick={runPreview} className="btn-admin-secondary text-xs inline-flex items-center gap-1 ml-auto">
              <RefreshCw className="w-3 h-3" /> Re-probe OpenSRS
            </button>
          </div>

          <p className="text-xs text-gray-500 mb-2">
            {data.counts.ok} ready · {data.counts.failed > 0 && <span className="text-amber-600">{data.counts.failed} skipped</span>}
            {data.counts.failed === 0 && <span>0 skipped</span>}
          </p>

          {/* Comparison table */}
          <div className="overflow-x-auto border border-gray-100 rounded-lg max-h-[55vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50/95 backdrop-blur">
                <tr className="border-b border-gray-100">
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TLD</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">OpenSRS</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">New USD</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">New CAD</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rowsWithCad.map(r => (
                  <tr key={r.tld} className={r.status === 'error' ? 'bg-amber-50/40' : 'hover:bg-gray-50/50'}>
                    <td className="px-3 py-2 align-top">
                      <span className="font-mono text-gray-900">.{r.tld}</span>
                      {r.status === 'error' && (
                        <span className="block text-[11px] text-amber-600 mt-0.5">{r.error}</span>
                      )}
                    </td>
                    {/* OpenSRS cost */}
                    <td className="px-3 py-2 text-right tabular-nums align-top text-gray-500">
                      <div>{r.openSrsUsd == null ? '—' : `$${r.openSrsUsd.toFixed(2)}`}</div>
                      {r.openSrsRenewUsd != null && (
                        <div className="text-[11px] text-gray-400">ren ${r.openSrsRenewUsd.toFixed(2)}</div>
                      )}
                    </td>
                    {/* Proposed USD */}
                    <td className="px-3 py-2 text-right tabular-nums align-top">
                      <div className="font-medium text-gray-900">{fmt(r.proposedUsdCents)}</div>
                      {r.proposedRenewUsdCents != null && (
                        <div className="text-[11px] text-gray-400">ren {fmt(r.proposedRenewUsdCents)}</div>
                      )}
                    </td>
                    {/* Proposed CAD */}
                    <td className="px-3 py-2 text-right tabular-nums align-top">
                      <div className="font-medium text-gray-900">{fmt(r.proposedCadCents)}</div>
                      {r.proposedRenewCadCents != null && (
                        <div className="text-[11px] text-gray-400">ren {fmt(r.proposedRenewCadCents)}</div>
                      )}
                    </td>
                    {/* Current */}
                    <td className="px-3 py-2 text-right tabular-nums align-top text-xs text-gray-400">
                      <div>{fmt(r.currentUsdCents)} / {fmt(r.currentCadCents)}</div>
                      <div className="text-[11px]">ren {fmt(r.currentRenewUsdCents)} / {fmt(r.currentRenewCadCents)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Apply */}
          <div className="flex items-center justify-end gap-2 mt-4">
            <button type="button" onClick={close} className="btn-admin-secondary text-sm">Cancel</button>
            <button
              type="button"
              onClick={apply}
              disabled={status === 'applying' || okRows.length === 0}
              className="btn-admin text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {status === 'applying' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Apply {okRows.length} price{okRows.length === 1 ? '' : 's'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
