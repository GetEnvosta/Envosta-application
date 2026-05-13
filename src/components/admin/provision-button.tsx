'use client';

import { useState } from 'react';
import { Loader2, Rocket } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * Admin "Provision on wp.cloud" button. Triggers wp.cloud provisioning
 * for an existing sites row.
 *
 * Phase 2C: instead of POSTing the wp.cloud edge function directly from
 * the browser (which would originate from the user's IP and bypass the
 * whitelist), we now POST to /api/admin/provision-site so the wp.cloud
 * call happens server-side from a Vercel static IP.
 */
export function ProvisionButton({ siteId, label }: { siteId: string; label: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  async function handleProvision() {
    if (!confirm(`Provision WordPress site "${label}" on wp.cloud?\n\nThis will create a live WordPress installation.`)) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/provision-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? 'Provisioning failed');
        setLoading(false);
        return;
      }

      setSuccess(`Site provisioned: ${data.domain ?? data.url ?? 'Success'}`);
      setLoading(false);
      setTimeout(() => router.refresh(), 1500);
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  }

  if (success) {
    return <span className="text-xs text-emerald-600 font-medium">{success}</span>;
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={handleProvision}
        disabled={loading}
        className="btn-admin text-xs py-1 px-2.5 inline-flex items-center gap-1"
      >
        {loading ? (
          <><Loader2 className="w-3 h-3 animate-spin" /> Provisioning...</>
        ) : (
          <><Rocket className="w-3 h-3" /> Provision</>
        )}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
