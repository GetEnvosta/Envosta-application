'use client';

import { useState } from 'react';
import { Loader2, Trash2, Flag, Undo2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Action = 'flag' | 'unflag' | 'delete';

export function CleanupActions({ siteId, status, label }: { siteId: string; status: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState('');

  async function run(action: Action, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(action);
    setError('');
    try {
      const res = await fetch('/api/admin/cleanup-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, action }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? `${action} failed`);
        setBusy(null);
        return;
      }
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Network error');
      setBusy(null);
    }
  }

  const isFlagged = status === 'flagged_for_deletion';

  return (
    <div className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-red-600 mr-2">{error}</span>}
      {isFlagged ? (
        <>
          <button
            onClick={() => run('unflag', `Move "${label}" back to paused?`)}
            disabled={!!busy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            {busy === 'unflag' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
            Unflag
          </button>
          <button
            onClick={() => run('delete', `Permanently delete "${label}"? This calls wp.cloud and cannot be undone.`)}
            disabled={!!busy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 transition-colors"
          >
            {busy === 'delete' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            Delete
          </button>
        </>
      ) : (
        <button
          onClick={() => run('flag', `Flag "${label}" for deletion? It stays online until you confirm the delete.`)}
          disabled={!!busy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-amber-700 hover:text-white hover:bg-amber-600 border border-amber-200 hover:border-amber-600 transition-colors"
        >
          {busy === 'flag' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Flag className="w-3 h-3" />}
          Flag for deletion
        </button>
      )}
    </div>
  );
}
