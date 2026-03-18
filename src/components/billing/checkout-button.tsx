'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Loader2 } from 'lucide-react';

export function CheckoutButton({ priceId, className }: { priceId: string; className?: string }) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke('stripe-checkout', {
      body: { priceId },
    });
    if (error || !data?.url) {
      alert(data?.error ?? error?.message ?? 'Checkout failed');
      setLoading(false);
      return;
    }
    window.location.href = data.url;
  }

  return (
    <button onClick={handleCheckout} className={`btn-primary ${className ?? ''}`} disabled={loading}>
      {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting…</> : 'Upgrade'}
    </button>
  );
}
