'use client';

/**
 * <InvoiceForm> — single component for creating a custom Stripe invoice.
 *
 * Two modes:
 *   - mode="quick"  : compact inline button that toggles a small inline form.
 *                     Customer is fixed (passed via stripeCustomerId).
 *                     Used inside customer detail headers.
 *   - mode="full"   : full card with customer dropdown — used on the
 *                     /admin/products/invoices page where the admin picks
 *                     the customer.
 *
 * Both modes call the same Supabase Edge Function with `customInvoice: true`.
 */

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Send, Loader2, DollarSign } from 'lucide-react';

type Customer = { id: string; full_name: string | null; email: string; stripe_customer_id: string | null };

type Props =
  | { mode: 'quick'; stripeCustomerId: string; customerName: string }
  | { mode: 'full'; customers: Customer[] };

export function InvoiceForm(props: Props) {
  const [open, setOpen] = useState(props.mode === 'full');
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function reset() {
    setAmount('');
    setDescription('');
    setCustomerId('');
  }

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!amount || !description) return;
    if (props.mode === 'full' && !customerId) return;

    setSending(true);
    setError('');
    setSuccess('');

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Not authenticated'); setSending(false); return; }

      const body: Record<string, any> = {
        customInvoice: true,
        amount: Math.round(parseFloat(amount) * 100),
        description,
      };
      if (props.mode === 'quick') body.stripeCustomerId = props.stripeCustomerId;
      else body.targetCustomerId = customerId;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
          },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? 'Failed to create invoice');
        setSending(false);
        return;
      }

      setSuccess(props.mode === 'quick'
        ? 'Invoice created — payment link sent'
        : `Invoice sent to customer.${data.invoiceUrl ? ' Payment link created.' : ''}`);
      reset();
      if (props.mode === 'quick') setOpen(false);
    } catch (err) {
      setError(String(err));
    }
    setSending(false);
  }

  // ─── Quick mode ─────────────────────────────────────────────
  if (props.mode === 'quick' && !open) {
    return (
      <div className="flex items-center gap-2">
        <button onClick={() => setOpen(true)} className="btn-admin-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5" /> Send Invoice
        </button>
        {success && <span className="text-xs text-green-600">{success}</span>}
      </div>
    );
  }

  if (props.mode === 'quick') {
    return (
      <div className="card p-4 mt-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Send Custom Invoice to {props.customerName}</h4>
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
          <button onClick={() => handleSend()} disabled={sending || !amount || !description} className="btn-admin text-xs py-2 px-3.5 inline-flex items-center gap-1.5">
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Send Invoice
          </button>
          <button onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </div>
    );
  }

  // ─── Full mode ─────────────────────────────────────────────
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
            {props.customers.map(c => (
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
              <input type="number" step="0.01" min="1" className="input pl-7" placeholder="150.00"
                value={amount} onChange={e => setAmount(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <input type="text" className="input" placeholder="Website design consultation"
              value={description} onChange={e => setDescription(e.target.value)} required />
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
