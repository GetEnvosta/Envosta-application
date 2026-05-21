'use client';

import { useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * "Mark resolved" action for an unresolved sync_drift row on the
 * /admin/audit Sync & Drift tab. POSTs to /api/admin/drift/[id]/resolve.
 */
export function ResolveDriftButton({ driftId }: { driftId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleResolve() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/drift/${driftId}/resolve`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? 'Failed');
        setLoading(false);
        return;
      }
      router.refresh();
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  }

  if (error) {
    return <span className="text-xs text-red-600">{error}</span>;
  }

  return (
    <button
      onClick={handleResolve}
      disabled={loading}
      className="btn-admin-secondary text-xs py-1 px-2.5 inline-flex items-center gap-1"
    >
      {loading ? (
        <><Loader2 className="w-3 h-3 animate-spin" /> Resolving</>
      ) : (
        <><Check className="w-3 h-3" /> Mark resolved</>
      )}
    </button>
  );
}
