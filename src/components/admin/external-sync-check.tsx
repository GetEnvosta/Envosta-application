'use client';

import { useState } from 'react';
import { Loader2, Server, Globe, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

interface SyncResult {
  wpcloud: { inApiNotDb: string[]; inDbNotApi: string[]; sitesNoUser: string[]; matched: number };
  domains: { total: number; noUser: string[]; orphanedUser: string[] };
  opensrs: { checked: boolean; error?: string };
}

export function ExternalSyncCheck() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState('');

  async function runCheck() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/admin/sync-check', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error ?? 'Check failed');
      }
    } catch { setError('Connection error'); }
    setLoading(false);
  }

  return (
    <div className="card p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">External Service Sync</h2>
          <p className="text-xs text-gray-500 mt-0.5">Compare wp.cloud and OpenSRS records against your database.</p>
        </div>
        <button onClick={runCheck} disabled={loading} className="btn-admin text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {loading ? 'Checking...' : 'Run Check'}
        </button>
      </div>

      {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

      {result && (
        <div className="space-y-3">
          {/* wp.cloud */}
          <div className={`rounded-lg border px-4 py-3 ${result.wpcloud.inApiNotDb.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Server className="w-4 h-4 text-gray-500" />
              <p className="text-sm font-medium text-gray-900">wp.cloud Sites</p>
              <span className="text-xs text-gray-500">{result.wpcloud.matched} matched</span>
            </div>
            {result.wpcloud.inApiNotDb.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-amber-700 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> In wp.cloud but NOT in your database:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {result.wpcloud.inApiNotDb.map(s => (
                    <span key={s} className="text-xs font-mono bg-white border border-amber-200 rounded px-2 py-0.5">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {result.wpcloud.inDbNotApi.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-amber-700 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> In database but NOT in wp.cloud:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {result.wpcloud.inDbNotApi.map(s => (
                    <span key={s} className="text-xs font-mono bg-white border border-amber-200 rounded px-2 py-0.5">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {result.wpcloud.inApiNotDb.length === 0 && result.wpcloud.inDbNotApi.length === 0 && (
              <p className="text-xs text-emerald-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> All synced</p>
            )}
          </div>

          {/* Domains */}
          <div className={`rounded-lg border px-4 py-3 ${result.domains.noUser.length + result.domains.orphanedUser.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-4 h-4 text-gray-500" />
              <p className="text-sm font-medium text-gray-900">Domains</p>
              <span className="text-xs text-gray-500">{result.domains.total} total</span>
            </div>
            {result.domains.noUser.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-amber-700 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> No customer attached:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {result.domains.noUser.map(d => <span key={d} className="text-xs font-mono bg-white border border-amber-200 rounded px-2 py-0.5">{d}</span>)}
                </div>
              </div>
            )}
            {result.domains.orphanedUser.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-amber-700 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Customer deleted:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {result.domains.orphanedUser.map(d => <span key={d} className="text-xs font-mono bg-white border border-amber-200 rounded px-2 py-0.5">{d}</span>)}
                </div>
              </div>
            )}
            {result.domains.noUser.length === 0 && result.domains.orphanedUser.length === 0 && (
              <p className="text-xs text-emerald-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> All domains have valid customers</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
