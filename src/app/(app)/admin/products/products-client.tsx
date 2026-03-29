'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

export function ProductsClient() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState('');

  async function handleSyncAll() {
    setSyncing(true);
    setResult('');
    try {
      const res = await fetch('/api/admin/sync-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'sync_all' }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(`Synced: ${data.results?.length ?? 0} products`);
        setTimeout(() => { setResult(''); window.location.reload(); }, 2000);
      } else {
        setResult(data.error ?? 'Sync failed');
      }
    } catch { setResult('Sync failed'); }
    setSyncing(false);
  }

  return (
    <div className="inline-flex items-center gap-2">
      {result && <span className="text-xs text-gray-500">{result}</span>}
      <button
        onClick={handleSyncAll}
        disabled={syncing}
        className="btn-admin-secondary text-sm py-2 px-3.5 inline-flex items-center gap-1.5"
      >
        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Syncing...' : 'Sync All to Stripe'}
      </button>
    </div>
  );
}
