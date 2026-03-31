'use client';

import { useState } from 'react';
import { Loader2, Terminal } from 'lucide-react';

export function AdminErrorLogs({ siteId }: { siteId: string }) {
  const [logs, setLogs] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function fetchLogs() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/site-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'error-logs', siteId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to fetch logs'); setLoading(false); return; }
      const logText = typeof data === 'string' ? data : data?.logs ?? data?.data ?? JSON.stringify(data, null, 2);
      setLogs(logText);
    } catch { setError('Connection error'); }
    setLoading(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-gray-400" /> PHP Error Logs
        </h2>
        <button onClick={fetchLogs} disabled={loading} className="btn-admin text-xs py-1.5 px-3">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Fetch Logs'}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      {logs !== null && (
        <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-lg overflow-x-auto max-h-64 overflow-y-auto font-mono whitespace-pre-wrap">
          {logs || 'No error logs found.'}
        </pre>
      )}
    </div>
  );
}
