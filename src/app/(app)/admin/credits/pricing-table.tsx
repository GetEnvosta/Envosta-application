'use client';

import { useState } from 'react';
import { Loader2, Check, X, Database } from 'lucide-react';

interface PricingRow {
  id: string;
  service_type: string;
  metric: string;
  credits_per_unit: number;
  description: string | null;
  is_active: boolean;
}

const SERVICE_LABELS: Record<string, string> = {
  wordpress: 'wp.cloud',
};

const METRIC_LABELS: Record<string, string> = {
  php_worker: 'PHP Worker (per worker/mo)',
  ssd_gb: 'SSD Storage (per GB/mo)',
  bursting: 'Bursting (per site/mo)',
};

export function CreditPricingTable({ initialPricing }: { initialPricing: PricingRow[] }) {
  const [pricing, setPricing] = useState(initialPricing);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  async function handleSave(id: string, updates: Partial<PricingRow>) {
    setSaving(id);
    try {
      const res = await fetch('/api/admin/credits/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPricing(pricing.map((p) => (p.id === id ? { ...p, ...updated } : p)));
      }
    } catch (e) { console.error(e); }
    setSaving(null);
    setEditingId(null);
  }

  // Only show wp.cloud services, group by platform label
  const grouped: Record<string, PricingRow[]> = {};
  for (const row of pricing) {
    if (row.service_type !== 'wordpress') continue;
    const label = SERVICE_LABELS[row.service_type] ?? row.service_type;
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(row);
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full table-fixed">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="w-[25%] text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Service</th>
            <th className="w-[40%] text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Metric</th>
            <th className="w-[20%] text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Rate</th>
            <th className="w-[15%] text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Synced</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(grouped).map(([label, rows]) => (
            rows.map((row, idx) => (
              <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                {idx === 0 && (
                  <td className="px-4 py-2.5 text-sm font-medium text-gray-900" rowSpan={rows.length}>
                    {label}
                  </td>
                )}
                <td className="px-4 py-2.5 text-xs text-gray-600">
                  {METRIC_LABELS[row.metric] ?? row.metric}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {editingId === row.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                        step="0.01" min="0" autoFocus
                        className="w-20 px-2 py-1 text-sm text-right border border-gray-200 rounded focus:border-brand-400 outline-none" />
                      <button onClick={() => handleSave(row.id, { credits_per_unit: parseFloat(editValue) })}
                        disabled={saving === row.id} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                        {saving === row.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingId(row.id); setEditValue(String(row.credits_per_unit)); }}
                      className="text-sm font-medium text-gray-900 hover:text-brand-600 transition-colors">
                      {Number(row.credits_per_unit).toFixed(2)}
                    </button>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                    <Database className="w-3 h-3" /> DB
                  </span>
                </td>
              </tr>
            ))
          ))}
        </tbody>
      </table>
    </div>
  );
}
