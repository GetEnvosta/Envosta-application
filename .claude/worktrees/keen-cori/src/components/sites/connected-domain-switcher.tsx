'use client';

import { useState, useTransition } from 'react';
import { Globe, Loader2, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Domain {
  id: string;
  domain_name: string;
  site_id: string | null;
}

export function ConnectedDomainSwitcher({
  siteId,
  currentDomainId,
  domains,
}: {
  siteId: string;
  currentDomainId: string | null;
  domains: Domain[];
}) {
  const [selectedId, setSelectedId] = useState(currentDomainId ?? '');
  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const router = useRouter();

  async function handleChange(newDomainId: string) {
    const previousId = selectedId;
    setSelectedId(newDomainId);
    setSaving(true);
    setStatus(null);

    const newDomain = domains.find((d) => d.id === newDomainId);

    // Unlink the previously connected domain (if any) via API (browser client blocked by RLS)
    if (previousId) {
      await fetch('/api/domains', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId: previousId, action: 'disconnect' }),
      });
    }

    if (newDomainId && newDomain) {
      // Call the update-domain action to update wp.cloud + DNS + DB in one shot
      try {
        setStatus('Updating domain on wp.cloud...');

        const res = await fetch('/api/site-actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update-domain',
            siteId,
            domain: newDomain.domain_name,
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

        setStatus(data.dnsSetup ? 'Domain connected — DNS configured automatically' : 'Domain connected — update your DNS A records to point to the site IP');
      } catch (e) {
        setStatus(null);
        alert('Failed to connect domain.');
        setSelectedId(previousId);
        setSaving(false);
        return;
      }
    } else if (!newDomainId) {
      // Disconnect — revert wp.cloud to temporary domain
      try {
        setStatus('Reverting to temporary domain...');
        const res = await fetch('/api/site-actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'disconnect-domain', siteId }),
        });
        const data = await res.json();
        if (res.ok) {
          setStatus(data.tempDomain ? `Reverted to ${data.tempDomain}` : 'Domain disconnected');
        } else {
          setStatus(data.error ?? 'Failed to disconnect');
        }
      } catch {
        setStatus('Domain unlinked from database');
      }
    }

    setSaving(false);
    startTransition(() => {
      router.refresh();
    });
  }

  // Available domains: those not connected to another site, or the currently connected one
  const availableDomains = domains.filter(
    (d) => !d.site_id || d.site_id === siteId
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Globe className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={selectedId}
            onChange={(e) => handleChange(e.target.value)}
            disabled={saving || isPending}
            className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
          >
            <option value="">Use staging domain (no custom domain)</option>
            {availableDomains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.domain_name}
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
