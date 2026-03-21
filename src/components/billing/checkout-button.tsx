'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Loader2 } from 'lucide-react';

export function CheckoutButton({ priceId, className, label = 'Upgrade' }: { priceId: string; className?: string; label?: string }) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    const supabase = createClient();

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      alert('Please log in first');
      setLoading(false);
      return;
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-checkout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ priceId }),
      }
    );

    const data = await res.json();

    if (!res.ok || !data?.url) {
      alert(data?.error ?? 'Checkout failed');
      setLoading(false);
      return;
    }
    window.location.href = data.url;
  }

  return (
    <button onClick={handleCheckout} className={`btn-primary ${className ?? ''}`} disabled={loading}>
      {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting…</> : label}
    </button>
  );
}
