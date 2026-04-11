'use client';

import { useState } from 'react';
import { Loader2, Check, X } from 'lucide-react';

interface PricingRow {
  id: string;
  service_type: string;
  metric: string;
  credits_per_unit: number;
  description: string | null;
  is_active: boolean;
}

const SERVICE_LABELS: Record<string, string> = {
  wordpress: 'WordPress Hosting',
  ai_tokens: 'AI Tokens',
  twilio_receptionist: 'AI Receptionist',
  twilio_number: 'Phone Numbers',
  vapi: 'Vapi (Voice)',
  resend: 'Resend (Email)',
};

const METRIC_LABELS: Record<string, string> = {
  php_worker: 'Per PHP worker/mo',
  ssd_gb: 'Per GB storage/mo',
  bursting: 'Bursting enabled/mo',
  per_1k_tokens: 'Per 1,000 tokens',
  per_minute: 'Per minute',
  per_month: 'Per number/mo',
  per_sms: 'Per SMS',
  per_email: 'Per email',
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
    } catch (e) {
      console.error('Save error:', e);
    } finally {
      setSaving(null);
      setEditingId(null);
    }
  }

  async function toggleActive(row: PricingRow) {
    await handleSave(row.id, { is_active: !row.is_active });
  }

  const grouped: Record<string, PricingRow[]> = {};
  for (const row of pricing) {
    if (!grouped[row.service_type]) grouped[row.service_type] = [];
    grouped[row.service_type].push(row);
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Service</th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Metric</th>
            <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Rate (credits)</th>
            <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Active</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(grouped).map(([serviceType, rows]) => (
            rows.map((row, idx) => (
              <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                {idx === 0 && (
                  <td className="px-4 py-2.5 text-sm font-medium text-gray-900" rowSpan={rows.length}>
                    {SERVICE_LABELS[serviceType] ?? serviceType}
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
                  <button onClick={() => toggleActive(row)} disabled={saving === row.id}
                    className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full transition-colors ${
                      row.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}>
                    {row.is_active ? 'Active' : 'Off'}
                  </button>
                </td>
              </tr>
            ))
          ))}
        </tbody>
      </table>
    </div>
  );
}
