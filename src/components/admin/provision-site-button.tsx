'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Server, Check } from 'lucide-react';

export function ProvisionSiteButton({
  subscriptionId,
  userId,
  planId,
  planName,
}: {
  subscriptionId: string;
  userId: string;
  planId: string | null;
  planName: string;
}) {
  const [state, setState] = useState<'idle' | 'provisioning' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const router = useRouter();

  async function handleProvision() {
    if (!confirm(`Create and provision a new site for this subscription (${planName})? This will call wp.cloud.`)) return;
    setState('provisioning');
    setMessage('');

    try {
      const res = await fetch('/api/admin/provision-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId, userId, planId }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setState('done');
        setMessage(data.warning ?? 'Site provisioned');
        router.refresh();
      } else {
        setState('error');
        setMessage(data.error ?? 'Failed');
      }
    } catch {
      setState('error');
      setMessage('Request failed');
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={handleProvision}
        disabled={state === 'provisioning' || state === 'done'}
        className={`text-xs font-medium inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
          state === 'done'
            ? 'bg-emerald-50 text-emerald-700'
            : state === 'error'
            ? 'bg-red-50 text-red-600 hover:bg-red-100'
            : 'bg-admin-50 text-admin-700 hover:bg-admin-100'
        }`}
      >
        {state === 'provisioning' && <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Provisioning...</>}
        {state === 'done' && <><Check className="w-3.5 h-3.5" /> Provisioned</>}
        {state === 'error' && <><Server className="w-3.5 h-3.5" /> Retry</>}
        {state === 'idle' && <><Server className="w-3.5 h-3.5" /> Provision Site</>}
      </button>
      {message && <span className="text-xs text-gray-500">{message}</span>}
    </div>
  );
}
