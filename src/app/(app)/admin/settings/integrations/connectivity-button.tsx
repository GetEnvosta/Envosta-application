'use client';

import { useState } from 'react';
import { Activity, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export function ConnectivityButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; diagnosis?: string[]; checks?: any } | null>(null);

  async function runCheck() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/connectivity-test', { cache: 'no-store' });
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setResult({ ok: false, diagnosis: [e?.message ?? 'Request failed'] });
    }
    setLoading(false);
  }

  return (
    <div>
      <button
        type="button"
        onClick={runCheck}
        disabled={loading}
        className="btn-admin-secondary text-sm py-2 px-3.5 inline-flex items-center gap-1.5"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
        {loading ? 'Running…' : 'Run connectivity test'}
      </button>

      {result && (
        <div className={`mt-3 rounded-lg border p-3 text-xs ${
          result.ok
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : 'border-amber-200 bg-amber-50 text-amber-900'
        }`}>
          <div className="font-medium inline-flex items-center gap-1.5 mb-1.5">
            {result.ok
              ? <><CheckCircle className="w-3.5 h-3.5" /> All checks passed</>
              : <><AlertCircle className="w-3.5 h-3.5" /> Issues detected</>}
          </div>
          {result.diagnosis && (
            <ul className="space-y-0.5 list-disc list-inside">
              {result.diagnosis.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
