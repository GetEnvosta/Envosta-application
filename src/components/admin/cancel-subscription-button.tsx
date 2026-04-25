'use client';

import { useState } from 'react';
import { Loader2, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CancelSubscriptionButton({ siteId, siteName }: { siteId: string; siteName: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleCancel() {
    if (!confirm(`Cancel the subscription for "${siteName}"?\n\nThis will:\n• Pause billing immediately (the subscription stays in Stripe so you can resume later)\n• Flag every site on this subscription for deletion at the end of the current billing period\n• Unlink all domains\n\nIf the customer doesn't resume before the period ends, all attached sites will be permanently deleted.`)) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/site-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-site', siteId: siteId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to cancel');
        setLoading(false);
        return;
      }

      router.refresh();
    } catch {
      setError('Connection error');
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleCancel}
        disabled={loading}
        className="inline-flex items-center gap-2 text-xs text-red-600 hover:text-red-700 font-medium"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
        Cancel Subscription
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
