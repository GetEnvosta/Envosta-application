'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export function SyncAllPlansButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState('');
  const router = useRouter();

  async function handleSync() {
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
        setResult(`Synced ${data.results?.length ?? 0} products`);
        router.refresh();
      } else {
        setResult(`Error: ${data.error ?? 'Sync failed'}`);
      }
    } catch {
      setResult('Error: Connection failed');
    }
    setSyncing(false);
    setTimeout(() => setResult(''), 3000);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="btn-admin-secondary text-sm py-2 px-3.5 inline-flex items-center gap-1.5"
      >
        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Syncing…' : 'Sync All to Stripe'}
      </button>
      {result && (
        <span className={`text-xs ${result.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
          {result}
        </span>
      )}
    </div>
  );
}
