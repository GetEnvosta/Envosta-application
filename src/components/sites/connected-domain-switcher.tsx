'use client';

import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Globe, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Domain {
  id: string;
  domain_name: string;
  service_id: string | null;
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
  const router = useRouter();

  async function handleChange(newDomainId: string) {
    const previousId = selectedId;
    setSelectedId(newDomainId);
    setSaving(true);

    const supabase = createClient();

    // Unlink the previously connected domain (if any)
    if (previousId) {
      await supabase
        .from('domains')
        .update({ service_id: null })
        .eq('id', previousId);
    }

    // Link the new domain to this site (if selected)
    if (newDomainId) {
      const { error } = await supabase
        .from('domains')
        .update({ service_id: siteId })
        .eq('id', newDomainId);

      if (error) {
        alert('Failed to update connected domain.');
        setSelectedId(previousId);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    startTransition(() => {
      router.refresh();
    });
  }

  // Available domains: those not connected to another site, or the currently connected one
  const availableDomains = domains.filter(
    (d) => !d.service_id || d.service_id === siteId
  );

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Globe className="w-4 h-4 text-gray-400 shrink-0" />
        <select
          value={selectedId}
          onChange={(e) => handleChange(e.target.value)}
          disabled={saving || isPending}
          className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
        >
          <option value="">No domain connected</option>
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
  );
}
