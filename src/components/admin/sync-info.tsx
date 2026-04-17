'use client';

import { useState } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface SyncInfoProps {
  type: 'sites' | 'domains';
  dbCount: number;
}

export function SyncInfo({ type, dbCount }: SyncInfoProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    checkedAt: string;
    apiCount?: number;
    dbCount: number;
    matched?: number;
    issues: number;
    inApiNotDb?: string[];
    inDbNotApi?: string[];
  } | null>(null);

  async function runSync() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/sync-check', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (type === 'sites') {
          const wp = data.wpcloud;
          setResult({
            checkedAt: data.checkedAt,
            apiCount: wp.apiCount,
            dbCount: wp.dbCount,
            matched: wp.matched,
            issues: wp.inApiNotDb.length + wp.inDbNotApi.length + wp.sitesNoUser.length,
            inApiNotDb: wp.inApiNotDb,
            inDbNotApi: wp.inDbNotApi,
          });
        } else {
          const dom = data.domains;
          setResult({
            checkedAt: data.checkedAt,
            dbCount: dom.total,
            issues: dom.noUser.length + dom.orphanedUser.length,
          });
        }
      }
    } catch { /* non-fatal */ }
    setLoading(false);
  }

  return (
    <div className="text-xs text-gray-400">
      <div className="flex items-center gap-3">
        {result && (
          <>
            {result.issues === 0 ? (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <CheckCircle className="w-3 h-3" />
                {type === 'sites'
                  ? `${result.apiCount} in API · ${result.dbCount} in DB · ${result.matched} matched`
                  : `${result.dbCount} domains · all linked`
                }
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-600">
                <AlertTriangle className="w-3 h-3" />
                {result.issues} sync issue{result.issues !== 1 ? 's' : ''}
                {type === 'sites' && ` · ${result.apiCount} in API · ${result.dbCount} in DB · ${result.matched} matched`}
              </span>
            )}
            <span className="text-gray-300">·</span>
            <span>Checked {new Date(result.checkedAt).toLocaleTimeString()}</span>
          </>
        )}
        <button onClick={runSync} disabled={loading}
          className="inline-flex items-center gap-1 text-gray-400 hover:text-admin-600 transition-colors">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {result ? 'Recheck' : 'Check sync'}
        </button>
      </div>
      {result && result.issues > 0 && (result.inApiNotDb?.length || result.inDbNotApi?.length) ? (
        <div className="mt-2 pl-4 space-y-1 text-[11px]">
          {result.inApiNotDb?.map((s, i) => (
            <div key={`api-${i}`} className="text-amber-600">In wp.cloud but not in DB: {s}</div>
          ))}
          {result.inDbNotApi?.map((s, i) => (
            <div key={`db-${i}`} className="text-amber-600">In DB but not in wp.cloud: {s}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
