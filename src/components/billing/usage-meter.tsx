'use client';

import { useState, useEffect } from 'react';
import { Gauge, TrendingUp, Calendar, Check, AlertTriangle } from 'lucide-react';

export function UsageMeter() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/usage/meter')
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse h-32 bg-gray-100 rounded-xl" />;
  if (!data) return null;

  const pct = Math.min(data.usage_percent, 150);
  const isOver = data.usage_percent > 100;
  const isNear = data.usage_percent >= 80;
  const barColor = isOver ? 'bg-red-500' : isNear ? 'bg-amber-500' : 'bg-brand-500';

  return (
    <div className={`rounded-xl border px-5 py-5 space-y-4 ${isOver ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-brand-600" /> Usage This Cycle
        </h2>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Calendar className="w-3 h-3" /> {data.days_remaining} days left
        </span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-2xl font-bold text-gray-900">{data.usage_this_cycle}</span>
          <span className="text-sm text-gray-500">of {data.included_credits} included</span>
        </div>
        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        {isOver && (
          <p className="text-xs text-red-600 mt-1 font-medium">
            {data.current_overage} credits over included — ${data.current_overage} overage
          </p>
        )}
      </div>

      {/* Projection */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-500">Projected</span>
        </div>
        <span className={`font-medium ${data.projected_overage > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
          {data.projected_total} credits
          {data.projected_overage > 0 ? ` (+$${data.projected_overage} overage)` : ' — within plan'}
        </span>
      </div>

      {/* Status */}
      {data.projected_overage > 0 ? (
        <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>Estimated bill: <strong>${data.estimated_bill}</strong> ($36 subscription + ${data.projected_overage} overage). Charged at cycle end.</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-emerald-700">
          <Check className="w-3.5 h-3.5" />
          <span>On track — no overage expected. Estimated bill: <strong>$36</strong></span>
        </div>
      )}
    </div>
  );
}
