'use client';

/**
 * CAC log — manual monthly entry (charter §8: "CAC log (manual entry is
 * fine)"). Saves via /api/admin/cac-entry into platform_settings KV
 * (`cac:YYYY-MM`); Phase 6 migrates the log to the `cac_entries` table.
 */
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface CacEntry {
  month: string;
  spend_cents: number;
  hours: number;
  hourly_cents: number;
  closed_clients: number;
}

export function CacEntryForm({ entries }: { entries: CacEntry[] }) {
  const now = new Date();
  const defaultMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState(defaultMonth);
  const [spend, setSpend] = useState('');
  const [hours, setHours] = useState('');
  const [rate, setRate] = useState('');
  const [closed, setClosed] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function save() {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/cac-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          spendCents: Math.round((parseFloat(spend) || 0) * 100),
          hours: parseFloat(hours) || 0,
          hourlyCents: Math.round((parseFloat(rate) || 0) * 100),
          closedClients: parseInt(closed, 10) || 0,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setMsg(res.ok ? 'Saved — refresh to recompute.' : data.error ?? 'Save failed');
    } catch {
      setMsg('Network error');
    }
    setBusy(false);
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Month</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input w-full" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Spend ($)</label>
          <input type="number" min="0" value={spend} onChange={(e) => setSpend(e.target.value)} className="input w-full" placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hours</label>
          <input type="number" min="0" value={hours} onChange={(e) => setHours(e.target.value)} className="input w-full" placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Rate ($/h)</label>
          <input type="number" min="0" value={rate} onChange={(e) => setRate(e.target.value)} className="input w-full" placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Closed clients</label>
          <input type="number" min="0" value={closed} onChange={(e) => setClosed(e.target.value)} className="input w-full" placeholder="0" />
        </div>
        <button onClick={save} disabled={busy} className="btn-primary text-sm inline-flex items-center justify-center gap-2">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save month
        </button>
      </div>
      {msg && <p className="text-xs text-gray-500 mt-2">{msg}</p>}

      {entries.length > 0 && (
        <table className="w-full text-sm mt-5">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase tracking-wide">
              <th className="py-1.5">Month</th>
              <th className="py-1.5">Spend</th>
              <th className="py-1.5">Hours × rate</th>
              <th className="py-1.5">Closed</th>
              <th className="py-1.5 text-right">CAC</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const total = e.spend_cents + e.hours * e.hourly_cents;
              const cac = e.closed_clients > 0 ? total / e.closed_clients : null;
              return (
                <tr key={e.month} className="border-t border-gray-50">
                  <td className="py-2 text-gray-700">{e.month}</td>
                  <td className="py-2 text-gray-500">${Math.round(e.spend_cents / 100).toLocaleString()}</td>
                  <td className="py-2 text-gray-500">{e.hours}h × ${Math.round(e.hourly_cents / 100)}</td>
                  <td className="py-2 text-gray-500">{e.closed_clients}</td>
                  <td className="py-2 text-right font-medium text-gray-900">
                    {cac != null ? `$${Math.round(cac / 100).toLocaleString()}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
