'use client';

import { useState, useEffect } from 'react';
import { CalendarClock, Server, Phone, AlertTriangle, Check, Coins } from 'lucide-react';

const PLAN_CREDITS = 50;

export function NextCyclePreview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/credits/balance')
      .then(r => r.json())
      .then(balance => {
        // Also fetch mandatory amount from a new endpoint
        fetch('/api/credits/mandatory')
          .then(r => r.json())
          .then(mandatory => {
            setData({ ...balance, ...mandatory });
          });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse h-32 bg-gray-100 rounded" />;
  if (!data) return null;

  const mandatory = data.mandatory_monthly_credits ?? 0;
  const planDeposit = PLAN_CREDITS;
  const covered = mandatory <= planDeposit;
  const shortfall = covered ? 0 : Math.ceil(mandatory - planDeposit);
  const headroom = covered ? Math.round((planDeposit - mandatory) * 100) / 100 : 0;

  return (
    <div className={`rounded-xl border px-5 py-4 space-y-3 ${
      !covered ? 'border-amber-200 bg-amber-50/50' : 'border-gray-200 bg-gray-50/30'
    }`}>
      <div className="flex items-center gap-2">
        <CalendarClock className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900">Next Billing Cycle</h3>
      </div>

      {/* Plan deposit */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500 flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5 text-emerald-500" /> Plan deposit
        </span>
        <span className="font-medium text-emerald-600">+{planDeposit} credits</span>
      </div>

      {/* Mandatory deductions */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500 flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5 text-gray-400" /> Infrastructure (mandatory)
        </span>
        <span className="font-medium text-gray-900">−{mandatory} credits</span>
      </div>

      <div className="border-t border-gray-200" />

      {/* Result */}
      {covered ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-emerald-700">Available for AI & usage</span>
          </div>
          <span className="text-sm font-bold text-emerald-600">{headroom} credits</span>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-800 font-medium">Additional charge needed</span>
            </div>
            <span className="text-sm font-bold text-amber-700">{shortfall} credits (${shortfall} CAD)</span>
          </div>
          <p className="text-xs text-amber-700">
            Your infrastructure costs {mandatory} credits/mo but your plan only deposits {planDeposit}.
            {data.auto_refill_enabled
              ? ` Auto-refill is on — you'll be charged automatically.`
              : ` Enable auto-refill or buy credits to cover the difference.`
            }
          </p>
        </div>
      )}

      {/* What makes up mandatory */}
      {mandatory > 0 && (
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer hover:text-gray-700 select-none">What's in my mandatory cost?</summary>
          <p className="mt-2 text-gray-500 leading-relaxed">
            Your mandatory cost includes all active WordPress sites (PHP workers × 5 cr + storage GB × 0.50 cr + bursting 10 cr if enabled)
            plus phone numbers (2 cr/mo each). This is charged automatically at the start of each billing cycle.
            Variable usage like AI calls and receptionist minutes are charged separately as you use them.
          </p>
        </details>
      )}
    </div>
  );
}
