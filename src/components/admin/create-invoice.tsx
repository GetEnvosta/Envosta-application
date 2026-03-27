'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Loader2, Send, DollarSign } from 'lucide-react';

export function CreateInvoiceForm({ customers }: { customers: { id: string; full_name: string | null; email: string; stripe_customer_id: string | null }[] }) {
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId || !amount || !description) return;

    setSending(true);
    setError('');
    setSuccess('');

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Not authenticated'); setSending(false); return; }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({
            customInvoice: true,
            targetCustomerId: customerId,
            amount: Math.round(parseFloat(amount) * 100),
            description,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? 'Failed to create invoice');
        setSending(false);
        return;
      }

      setSuccess(`Invoice sent to customer. ${data.invoiceUrl ? 'Payment link created.' : ''}`);
      setAmount('');
      setDescription('');
      setCustomerId('');
      setSending(false);
    } catch (e) {
      setError(String(e));
      setSending(false);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-gray-400" />
        Create Custom Invoice
      </h2>
      <p className="text-sm text-gray-500 mb-4">Send a one-time charge to any customer for custom work.</p>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 mb-4">{success}</div>
      )}

      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label className="label">Customer</label>
          <select className="input" value={customerId} onChange={e => setCustomerId(e.target.value)} required>
            <option value="">Select a customer...</option>
            {customers.map(c => (
              <option key={c.id} value={c.stripe_customer_id ?? ''}>
                {c.full_name ?? c.email ?? c.stripe_customer_id}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Amount (CAD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                step="0.01"
                min="1"
                className="input pl-7"
                placeholder="150.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <input
              type="text"
              className="input"
              placeholder="Website design consultation"
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
            />
          </div>
        </div>

        <button type="submit" disabled={sending} className="btn-admin inline-flex items-center gap-2">
          {sending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
          ) : (
            <><Send className="w-4 h-4" /> Send Invoice</>
          )}
        </button>
      </form>
    </div>
  );
}
