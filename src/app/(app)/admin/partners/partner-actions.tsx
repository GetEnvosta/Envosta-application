'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export function PartnerActions({ userId, status, featured }: { userId: string; status: string; featured?: boolean }) {
  const [loading, setLoading] = useState('');

  async function handleAction(action: string) {
    setLoading(action);
    try {
      await fetch('/api/admin/partners/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      });
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading('');
    }
  }

  async function toggleFeatured() {
    setLoading('featured');
    try {
      await fetch('/api/admin/partners/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, featured: !featured }),
      });
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading('');
    }
  }

  return (
    <div className="flex items-center gap-1.5 justify-end">
      {status === 'pending' && (
        <>
          <button
            onClick={() => handleAction('approve')}
            disabled={!!loading}
            className="px-2.5 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md disabled:opacity-50"
          >
            {loading === 'approve' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Approve'}
          </button>
          <button
            onClick={() => handleAction('reject')}
            disabled={!!loading}
            className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
          >
            Reject
          </button>
        </>
      )}
      {status === 'approved' && (
        <>
          <button
            onClick={toggleFeatured}
            disabled={!!loading}
            className="px-2.5 py-1 text-xs font-medium text-sky-600 hover:bg-sky-50 rounded-md disabled:opacity-50"
          >
            {loading === 'featured' ? <Loader2 className="w-3 h-3 animate-spin" /> : featured ? 'Unfeature' : 'Feature'}
          </button>
          <button
            onClick={() => handleAction('suspend')}
            disabled={!!loading}
            className="px-2.5 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 rounded-md disabled:opacity-50"
          >
            Suspend
          </button>
          <button
            onClick={() => handleAction('remove')}
            disabled={!!loading}
            className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
          >
            Remove
          </button>
        </>
      )}
      {status === 'suspended' && (
        <button
          onClick={() => handleAction('approve')}
          disabled={!!loading}
          className="px-2.5 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-md disabled:opacity-50"
        >
          Reinstate
        </button>
      )}
    </div>
  );
}
