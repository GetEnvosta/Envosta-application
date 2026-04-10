'use client';

import { useState } from 'react';
import { Loader2, Plus, Minus } from 'lucide-react';

export function AdminCreditAdjust({ userId }: { userId: string }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function handleAdjust(positive: boolean) {
    const num = parseInt(amount, 10);
    if (!num || num <= 0 || !description.trim()) {
      setMessage('Enter a valid amount and description');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/credits/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: positive ? num : -num,
          description: description.trim(),
        }),
      });

      if (res.ok) {
        setMessage(`${positive ? 'Added' : 'Removed'} ${num} credits`);
        setAmount('');
        setDescription('');
        // Refresh page to show updated balance
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const err = await res.json();
        setMessage(err.error ?? 'Failed');
      }
    } catch (e) {
      setMessage('Error adjusting credits');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <label className="block text-xs text-gray-500 mb-1">Amount</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="50"
          min={1}
          className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-admin-400 focus:ring-1 focus:ring-admin-400 outline-none"
        />
      </div>
      <div className="flex-[2]">
        <label className="block text-xs text-gray-500 mb-1">Reason</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Manual adjustment reason"
          className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-admin-400 focus:ring-1 focus:ring-admin-400 outline-none"
        />
      </div>
      <button
        onClick={() => handleAdjust(true)}
        disabled={saving}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
        Add
      </button>
      <button
        onClick={() => handleAdjust(false)}
        disabled={saving}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Minus className="w-3 h-3" />}
        Remove
      </button>
      {message && <span className="text-xs text-gray-500">{message}</span>}
    </div>
  );
}
