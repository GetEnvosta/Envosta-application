'use client';

import { useState } from 'react';
import { CreditCard, Loader2, Check, AlertCircle } from 'lucide-react';

interface Props {
  customerId: string;
  customerName: string;
}

export function ChargeCard({ customerId, customerName }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [charging, setCharging] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleCharge() {
    if (!amount || !description.trim()) return;

    const amountCents = Math.round(parseFloat(amount) * 100);
    if (amountCents < 100) { setResult({ ok: false, message: 'Minimum charge is $1.00' }); return; }
    if (!confirm(`Charge ${customerName} $${parseFloat(amount).toFixed(2)} CAD for "${description}"?`)) return;

    setCharging(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/charge-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          amount: amountCents,
          description: description.trim(),
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setResult({ ok: true, message: `Charged $${(data.amount_paid / 100).toFixed(2)} successfully` });
        setAmount('');
        setDescription('');
        setTimeout(() => { setOpen(false); setResult(null); }, 3000);
      } else {
        setResult({ ok: false, message: data.error ?? 'Charge failed' });
      }
    } catch {
      setResult({ ok: false, message: 'Connection error' });
    }
    setCharging(false);
  }

  if (!open) {
    return (
      <div className="flex items-center gap-2">
        <button onClick={() => setOpen(true)} className="btn-admin text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5" /> Charge Card
        </button>
        {result && (
          <span className={`text-xs ${result.ok ? 'text-emerald-600' : 'text-red-600'}`}>{result.message}</span>
        )}
      </div>
    );
  }

  return (
    <div className="card p-4 mt-4 border-indigo-100">
      <h4 className="text-sm font-semibold text-gray-900 mb-1">Charge Card on File</h4>
      <p className="text-xs text-gray-500 mb-3">
        This will immediately charge {customerName}&apos;s default payment method. They will receive a Stripe receipt.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div>
          <label className="label">Amount (CAD)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input type="number" step="0.01" min="1" className="input pl-7" placeholder="250.00"
              value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Description</label>
          <input className="input" placeholder="e.g. Studio design work, custom development, migration"
            value={description} onChange={e => setDescription(e.target.value)} />
        </div>
      </div>

      {result && (
        <div className={`flex items-center gap-2 mb-3 text-xs ${result.ok ? 'text-emerald-600' : 'text-red-600'}`}>
          {result.ok ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {result.message}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={handleCharge} disabled={charging || !amount || !description.trim()}
          className="btn-admin text-xs py-2 px-3.5 inline-flex items-center gap-1.5">
          {charging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
          Charge ${amount ? parseFloat(amount).toFixed(2) : '0.00'}
        </button>
        <button onClick={() => { setOpen(false); setResult(null); }} className="text-xs text-gray-500 hover:text-gray-700">
          Cancel
        </button>
      </div>
    </div>
  );
}
