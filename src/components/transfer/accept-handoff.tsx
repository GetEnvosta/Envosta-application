'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check } from 'lucide-react';

/**
 * Recipient-side accept control for a site handoff. Calls
 * /api/site-transfer/accept; routes the user to sign in or add a payment
 * method when the API asks for it, otherwise completes and redirects to the
 * site.
 */
export function AcceptHandoff({ token, siteId, toEmail }: { token: string; siteId: string; toEmail: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [authLink, setAuthLink] = useState('');
  const [needCard, setNeedCard] = useState(false);

  async function accept() {
    setBusy(true); setError(''); setAuthLink(''); setNeedCard(false);
    try {
      const res = await fetch('/api/site-transfer/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/dashboard/sites/${siteId}`);
        return;
      }
      if (data.needAuth) {
        const ret = encodeURIComponent(`/transfer/accept?token=${token}`);
        setAuthLink(`/auth/login?redirect=${ret}`);
        setError(`Sign in${toEmail ? ` as ${toEmail}` : ''} to accept this handoff.`);
      } else if (data.needPaymentMethod) {
        setNeedCard(true);
        setError('Add a payment method first, then come back and accept.');
      } else {
        setError(data.error ?? 'Could not accept the handoff.');
      }
    } catch {
      setError('Network error.');
    }
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <button onClick={accept} disabled={busy} className="btn-primary w-full text-sm py-2.5 inline-flex items-center justify-center gap-2 disabled:opacity-50">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Accept &amp; take over billing
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {authLink && <a href={authLink} className="btn-secondary w-full text-sm py-2 inline-flex items-center justify-center">Sign in to continue</a>}
      {needCard && <a href="/dashboard/billing" className="btn-secondary w-full text-sm py-2 inline-flex items-center justify-center">Add a payment method</a>}
      <p className="text-[11px] text-gray-400 text-center">Accepting starts your subscription for this site and ends the previous owner&apos;s (prorated).</p>
    </div>
  );
}
