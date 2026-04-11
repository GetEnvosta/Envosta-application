'use client';

import { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';

const SERVICE_LABELS: Record<string, string> = {
  wordpress: 'WordPress Hosting',
  ai_tokens: 'AI Tokens',
  twilio: 'Twilio (SMS)',
  resend: 'Resend (Email)',
  manual: 'Manual Adjustment',
};

const SERVICE_COLORS: Record<string, string> = {
  wordpress: 'bg-blue-500',
  ai_tokens: 'bg-purple-500',
  twilio: 'bg-rose-500',
  resend: 'bg-teal-500',
  manual: 'bg-gray-500',
};

export function UsageBreakdown() {
  const [usage, setUsage] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/usage')
      .then((r) => r.json())
      .then(setUsage)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-32 bg-gray-100 rounded" />
      </div>
    );
  }

  const entries = Object.entries(usage ?? {}).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, val]) => sum + val, 0);

  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No credit usage this month</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
        <span>Current month usage</span>
        <span className="font-medium text-gray-700">{total} credits total</span>
      </div>

      {/* Stacked bar */}
      <div className="h-3 rounded-full bg-gray-100 overflow-hidden flex">
        {entries.map(([svc, amount]) => (
          <div
            key={svc}
            className={`${SERVICE_COLORS[svc] ?? 'bg-gray-400'} transition-all`}
            style={{ width: `${(amount / total) * 100}%` }}
            title={`${SERVICE_LABELS[svc] ?? svc}: ${amount} credits`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2">
        {entries.map(([svc, amount]) => (
          <div key={svc} className="flex items-center gap-2 text-sm">
            <div className={`w-2.5 h-2.5 rounded-full ${SERVICE_COLORS[svc] ?? 'bg-gray-400'}`} />
            <span className="text-gray-600 flex-1">{SERVICE_LABELS[svc] ?? svc}</span>
            <span className="font-medium text-gray-900">{amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
