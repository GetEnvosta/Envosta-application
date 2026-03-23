'use client';

import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Loader2, Server, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Service {
  id: string;
  label: string;
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
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setSaving(false); return; }

        setStatus('Updating domain on wp.cloud...');

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/site-info`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            },
            body: JSON.stringify({
              action: 'update-domain',
              siteId: newServiceId,
              domain: domainName,
            }),
          }
        );

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
      // Disconnect — just unlink in DB
      const { error } = await supabase
        .from('domains')
        .update({ service_id: null })
        .eq('id', domainId);

      if (error) {
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
              <option key={svc.id} value={svc.id}>
                {svc.label}
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
