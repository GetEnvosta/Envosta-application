'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export function ManageBillingButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch('/api/billing-portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setLoading(false);
    } catch {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleClick} disabled={loading} className="btn-secondary inline-flex items-center gap-2">
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      Manage Billing
    </button>
  );
}
