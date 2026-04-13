'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export function WhoisPrivacyToggle({
  domainName,
  initialValue,
}: {
  domainName: string;
  initialValue: boolean;
}) {
  const [enabled, setEnabled] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function toggle() {
    const newValue = !enabled;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set-whois-privacy',
          domainName,
          enabled: newValue,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to update');
        setLoading(false);
        return;
      }

      setEnabled(newValue);
    } catch {
      setError('Connection error');
    }
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggle}
        disabled={loading}
        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
        style={{
          background: enabled ? '#2563eb' : '#d1d5db',
          opacity: loading ? 0.5 : 1,
        }}
      >
        <span
          className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
          style={{ transform: enabled ? 'translateX(22px)' : 'translateX(4px)' }}
        />
      </button>
      <span className="text-sm text-gray-600">
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin inline" />
        ) : (
          enabled ? 'WHOIS privacy on' : 'WHOIS privacy off'
        )}
      </span>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
