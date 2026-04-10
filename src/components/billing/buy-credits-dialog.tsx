'use client';

import { useState } from 'react';
import { Loader2, ShoppingCart } from 'lucide-react';

const PRESETS = [25, 50, 100, 250, 500];

export function BuyCreditsButton() {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(100);
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(false);

  const effectiveQty = custom ? parseInt(custom, 10) : quantity;
  const isValid = effectiveQty >= 10 && effectiveQty <= 10000;

  async function handlePurchase() {
    if (!isValid) return;
    setLoading(true);
    try {
      const res = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: effectiveQty }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error('Purchase error:', e);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
      >
        <ShoppingCart className="w-4 h-4" />
        Buy Credits
      </button>
    );
  }

  return (
    <div className="card p-5 border-brand-200 bg-brand-50/30">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Purchase Credits</h3>
      <p className="text-xs text-gray-500 mb-4">1 credit = $1 CAD. Purchased credits never expire.</p>

      <div className="flex flex-wrap gap-2 mb-3">
        {PRESETS.map((amt) => (
          <button
            key={amt}
            onClick={() => { setQuantity(amt); setCustom(''); }}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              !custom && quantity === amt
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-700 border-gray-200 hover:border-brand-300'
            }`}
          >
            {amt}
          </button>
        ))}
        <input
          type="number"
          placeholder="Custom"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          min={10}
          max={10000}
          className="w-24 px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-700">
          Total: <span className="font-semibold">${effectiveQty?.toFixed(2) ?? '0.00'} CAD</span>
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setOpen(false)}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handlePurchase}
            disabled={!isValid || loading}
            className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-50 transition-colors"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Purchase {effectiveQty || 0} Credits
          </button>
        </div>
      </div>
    </div>
  );
}
