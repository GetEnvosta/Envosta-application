'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export function ChangeRequestActionsClient({ requestId }: { requestId: string }) {
  const [loading, setLoading] = useState('');

  async function handleAction(action: 'approve' | 'deny') {
    setLoading(action);
    try {
      await fetch('/api/admin/partners/change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
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
      <button
        onClick={() => handleAction('approve')}
        disabled={!!loading}
        className="px-2.5 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md disabled:opacity-50"
      >
        {loading === 'approve' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Approve'}
      </button>
      <button
        onClick={() => handleAction('deny')}
        disabled={!!loading}
        className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
      >
        {loading === 'deny' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Deny'}
      </button>
    </div>
  );
}
