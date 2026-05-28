'use client';

/**
 * Admin action buttons for the site cleanup queue (paused →
 * flagged_for_deletion → deleted). Renders inline on a site row inside
 * /admin/services?view=cleanup; POSTs to /api/admin/cleanup-site.
 *
 * Status semantics:
 *   - status='paused'        → show "Flag for deletion" button
 *   - status='flagged_for_deletion' (legacy) → show Unflag + Delete
 *   - status='cancelled' WITH flagged_for_deletion_at != null (new
 *     workflow path) → also show Unflag + Delete
 *
 * The parent computes `isFlagged` (handles both states); fall back to
 * the legacy check if the prop wasn't passed.
 */
import { useState } from 'react';
import { Loader2, Trash2, Flag, Undo2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Action = 'flag' | 'unflag' | 'delete';

export function CleanupActions({ siteId, status, label, isFlagged }: { siteId: string; status: string; label: string; isFlagged?: boolean }) {
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

  const flagged = isFlagged ?? (status === 'flagged_for_deletion');

  return (
    <div className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-red-600 mr-2">{error}</span>}
      {flagged ? (
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
