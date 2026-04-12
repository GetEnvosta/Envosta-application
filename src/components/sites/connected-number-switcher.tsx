'use client';

import { useState, useTransition } from 'react';
import { Phone, Loader2, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PhoneNumber {
  id: string;
  phone_number: string;
  site_id: string | null;
}

export function ConnectedNumberSwitcher({
  siteId,
  currentNumberId,
  numbers,
}: {
  siteId: string;
  currentNumberId: string | null;
  numbers: PhoneNumber[];
}) {
  const [selectedId, setSelectedId] = useState(currentNumberId ?? '');
  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const router = useRouter();

  async function handleChange(newNumberId: string) {
    const previousId = selectedId;
    setSelectedId(newNumberId);
    setSaving(true);
    setStatus(null);

    try {
      const res = await fetch('/api/phone-numbers/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          phoneNumberId: newNumberId || null,
          previousPhoneNumberId: previousId || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus(newNumberId ? 'Phone number connected to site' : 'Phone number disconnected');
      } else {
        setStatus(null);
        alert(data.error ?? 'Failed to update');
        setSelectedId(previousId);
      }
    } catch {
      setStatus(null);
      alert('Failed to update phone number link');
      setSelectedId(previousId);
    }

    setSaving(false);
    startTransition(() => router.refresh());
  }

  // Available: numbers not linked to another site, or the currently linked one
  const availableNumbers = numbers.filter(
    (n) => !n.site_id || n.site_id === siteId
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Phone className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={selectedId}
            onChange={(e) => handleChange(e.target.value)}
            disabled={saving || isPending}
            className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
          >
            <option value="">No phone number connected</option>
            {availableNumbers.map((n) => (
              <option key={n.id} value={n.id}>
                {n.phone_number}
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
      {availableNumbers.length === 0 && (
        <p className="text-xs text-gray-400 mt-2">No phone numbers available. Buy one from the dashboard first.</p>
      )}
    </div>
  );
}
