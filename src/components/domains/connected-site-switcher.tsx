'use client';

import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Loader2, Server, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Service {
  id: string;
  label: string;
  status?: string;
  isTrialing?: boolean;
}

export function ConnectedSiteSwitcher({
  domainId,
  domainName,
  currentServiceId,
  services,
}: {
  domainId: string;
  domainName: string;
  currentServiceId: string | null;
  services: Service[];
}) {
  const [selectedId, setSelectedId] = useState(currentServiceId ?? '');
  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const router = useRouter();

  async function handleChange(newServiceId: string) {
    const previousId = selectedId;
    setSelectedId(newServiceId);
    setSaving(true);
    setStatus(null);

    const supabase = createClient();

    if (newServiceId) {
      // Call update-domain to update wp.cloud + DNS + DB
      try {
        setStatus('Updating domain on wp.cloud...');

        const res = await fetch('/api/site-actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update-domain',
            siteId: newServiceId,
            domain: domainName,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setStatus(null);
          alert(data?.error ?? 'Failed to update domain on hosting.');
          setSelectedId(previousId);
          setSaving(false);
          return;
        }

        setStatus(data.dnsSetup ? 'Connected — DNS configured automatically' : 'Connected — update your DNS A records');
      } catch (e) {
        setStatus(null);
        alert('Failed to connect to site.');
        setSelectedId(previousId);
        setSaving(false);
        return;
      }
    } else {
      // Disconnect — unlink via API (browser client can't update due to RLS)
      try {
        const res = await fetch('/api/domains', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domainId, action: 'disconnect' }),
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data?.error ?? 'Failed to disconnect domain.');
          setSelectedId(previousId);
          setSaving(false);
          return;
        }
      } catch {
        alert('Failed to disconnect domain.');
        setSelectedId(previousId);
        setSaving(false);
        return;
      }
      setStatus(null);
    }

    setSaving(false);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Server className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={selectedId}
            onChange={(e) => handleChange(e.target.value)}
            disabled={saving || isPending}
            className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
          >
            <option value="">Not connected</option>
            {services.map((svc) => (
              <option key={svc.id} value={svc.id} disabled={svc.isTrialing}>
                {svc.label}{svc.isTrialing ? ' (Can\'t connect on free trial)' : ''}
              </option>
            ))}
          </select>
        </div>
        {(saving || isPending) && (
          <Loader2 className="w-4 h-4 text-brand-600 animate-spin shrink-0" />
        )}
      </div>
      {status && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600">
          <CheckCircle className="w-3.5 h-3.5" />
          {status}
        </div>
      )}
    </div>
  );
}
