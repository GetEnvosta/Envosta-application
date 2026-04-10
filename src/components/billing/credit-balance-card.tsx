'use client';

import { useState, useEffect } from 'react';
import { Coins, TrendingDown, Clock, RefreshCw } from 'lucide-react';

interface CreditBalance {
  subscription_credits: number;
  purchased_credits: number;
  total: number;
  expires_at: string | null;
}

export function CreditBalanceCard() {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/credits/balance')
      .then((r) => r.json())
      .then(setBalance)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-20 bg-gray-100 rounded" />
      </div>
    );
  }

  if (!balance) return null;

  const isNegative = balance.total < 0;
  const expiresDate = balance.expires_at
    ? new Date(balance.expires_at).toLocaleDateString('en-CA', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div className={`card p-6 ${isNegative ? 'border-red-200 bg-red-50/30' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Coins className="w-4 h-4 text-brand-600" />
          Credit Balance
        </h2>
        {isNegative && (
          <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full flex items-center gap-1">
            <TrendingDown className="w-3 h-3" /> Negative Balance
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">Total Credits</p>
          <p className={`text-2xl font-bold ${isNegative ? 'text-red-600' : 'text-gray-900'}`}>
            {balance.total}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Subscription
          </p>
          <p className="text-lg font-semibold text-gray-700">{balance.subscription_credits}</p>
          {expiresDate && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" /> Expires {expiresDate}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Purchased</p>
          <p className="text-lg font-semibold text-gray-700">{balance.purchased_credits}</p>
          <p className="text-xs text-gray-400 mt-0.5">Never expires</p>
        </div>
      </div>
    </div>
  );
}
