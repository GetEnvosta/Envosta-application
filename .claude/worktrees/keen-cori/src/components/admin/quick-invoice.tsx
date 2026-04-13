'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Send, Loader2, DollarSign } from 'lucide-react';

export function QuickInvoice({ stripeCustomerId, customerName }: { stripeCustomerId: string; customerName: string }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState('');

  async function handleSend() {
    if (!amount || !description) return;
    setSending(true);
    setResult('');

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setResult('Not authenticated'); setSending(false); return; }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({
            customInvoice: true,
            stripeCustomerId,
            amount: Math.round(parseFloat(amount) * 100),
            description,
          }),
        }
      );
      const data = await res.json();
      if (res.ok && data.url) {
        setResult('Invoice created — payment link sent');
        setAmount('');
        setDescription('');
        setOpen(false);
      } else {
        setResult(data.error ?? 'Failed');
      }
    } catch {
      setResult('Failed');
    }
    setSending(false);
  }

  if (!open) {
    return (
      <div className="flex items-center gap-2">
        <button onClick={() => setOpen(true)} className="btn-admin-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5" /> Send Invoice
        </button>
        {result && <span className="text-xs text-green-600">{result}</span>}
      </div>
    );
  }

  return (
    <div className="card p-4 mt-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Send Custom Invoice to {customerName}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div>
          <label className="label">Amount (CAD)</label>
          <input type="number" step="0.01" className="input" placeholder="250.00" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Description</label>
          <input className="input" placeholder="e.g. Migration assistance, custom development" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={handleSend} disabled={sending || !amount || !description} className="btn-admin text-xs py-2 px-3.5 inline-flex items-center gap-1.5">
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Send Invoice
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
        {result && <span className="text-xs text-red-600">{result}</span>}
      </div>
    </div>
  );
}
