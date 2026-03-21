'use client';

import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Loader2, Server } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Service {
  id: string;
  label: string;
}

export function ConnectedSiteSwitcher({
  domainId,
  currentServiceId,
  services,
}: {
  domainId: string;
  currentServiceId: string | null;
  services: Service[];
}) {
  const [selectedId, setSelectedId] = useState(currentServiceId ?? '');
  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleChange(newServiceId: string) {
    setSelectedId(newServiceId);
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from('domains')
      .update({ service_id: newServiceId || null })
      .eq('id', domainId);

    setSaving(false);

    if (error) {
      alert('Failed to update connected site.');
      setSelectedId(currentServiceId ?? '');
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
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
  );
}
