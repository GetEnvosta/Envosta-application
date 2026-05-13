'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';

export function DomainRetryRegister({
  domainId,
  domainName,
  siteId,
  userId,
  errorMessage,
  errorCode,
}: {
  domainId: string;
  domainName: string;
  siteId: string | null;
  userId: string;
  errorMessage?: string;
  errorCode?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  async function handleRetry() {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      let token = session?.access_token;
      if (!token) {
        const { data: { session: refreshed } } = await supabase.auth.refreshSession();
        token = refreshed?.access_token ?? undefined;
      }
      if (!token) { setError('Not authenticated — sign in again'); setLoading(false); return; }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/register-domain`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
          },
          body: JSON.stringify({
            action: 'register',
            domainName,
            serviceId: siteId,
            userId,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `Registration failed (${res.status})`);

      setSuccess('Domain registered successfully!');
      setTimeout(() => router.refresh(), 1500);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4.5 h-4.5 text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-red-900">Registration Failed</h3>
          {errorMessage && (
            <p className="text-xs text-red-700 mt-1">{errorMessage}</p>
          )}
          {errorCode && (
            <p className="text-[10px] text-red-400 font-mono mt-0.5">Error code: {errorCode}</p>
          )}

          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={handleRetry}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              {loading ? 'Retrying...' : 'Retry Registration'}
            </button>

            {error && <span className="text-xs text-red-600">{error}</span>}
            {success && <span className="text-xs text-emerald-600">{success}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
