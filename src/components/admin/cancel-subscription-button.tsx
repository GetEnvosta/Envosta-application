'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Loader2, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CancelSubscriptionButton({ serviceId, siteName }: { serviceId: string; siteName: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleCancel() {
    if (!confirm(`Cancel the subscription for "${siteName}"?\n\nThis will:\n• Stop billing immediately\n• Keep the site accessible for 30 days\n• Unlink all domains\n\nThis cannot be undone.`)) return;

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Not authenticated'); setLoading(false); return; }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/site-info`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({ action: 'delete-site', siteId: serviceId }),
        }
      );

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
