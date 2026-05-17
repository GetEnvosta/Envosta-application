'use client';

/**
 * Inline-editable TLD price table for /admin/settings/tlds.
 *
 * Each row owns local pricing state; saves POST to /api/admin/update-tld-price
 * (which keys by `tld` rather than id). The active toggle and per-field saves
 * are sent as separate small writes so a single typo doesn't dirty the whole
 * row.
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { InlinePriceCell } from '../plans/inline-price-cell';

interface TldRow {
  id: string;
  tld: string;
  display_name: string;
  registry: string | null;
  is_active: boolean;
  register_price_cad_cents: number;
  renew_price_cad_cents: number;
  register_price_usd_cents: number | null;
  renew_price_usd_cents: number | null;
  min_registration_years: number | null;
  max_registration_years: number | null;
}

async function patchTld(tld: string, body: Record<string, unknown>): Promise<{ error?: string }> {
  const res = await fetch('/api/admin/update-tld-price', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tld, ...body }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: data.error ?? `HTTP ${res.status}` };
  }
  return {};
}

export function TldsTable({ tlds }: { tlds: TldRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggleActive(t: TldRow) {
    startTransition(async () => {
      await patchTld(t.tld, { is_active: !t.is_active });
      router.refresh();
    });
  }

  if (tlds.length === 0) {
    return (
      <div className="card p-12 text-center text-sm text-gray-400">
        No TLDs configured yet.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/60">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TLD</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registry</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Register CAD</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Renew CAD</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Register USD</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Renew USD</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Years</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {tlds.map(t => (
            <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-4 py-3.5">
                <p className="font-medium text-gray-900">{t.display_name}</p>
                <p className="text-xs text-gray-500 mt-0.5 font-mono">.{t.tld}</p>
              </td>
              <td className="px-3 py-3.5 text-xs text-gray-500">{t.registry ?? '—'}</td>
              <td className="px-3 py-3.5">
                <InlinePriceCell
                  value={t.register_price_cad_cents}
                  currency="cad"
                  onSave={cents => patchTld(t.tld, { register_price_cad_cents: cents })}
                />
              </td>
              <td className="px-3 py-3.5">
                <InlinePriceCell
                  value={t.renew_price_cad_cents}
                  currency="cad"
                  onSave={cents => patchTld(t.tld, { renew_price_cad_cents: cents })}
                />
              </td>
              <td className="px-3 py-3.5">
                <InlinePriceCell
                  value={t.register_price_usd_cents}
                  currency="usd"
                  dashOnZero
                  onSave={cents => patchTld(t.tld, { register_price_usd_cents: cents })}
                />
              </td>
              <td className="px-3 py-3.5">
                <InlinePriceCell
                  value={t.renew_price_usd_cents}
                  currency="usd"
                  dashOnZero
                  onSave={cents => patchTld(t.tld, { renew_price_usd_cents: cents })}
                />
              </td>
              <td className="px-3 py-3.5 text-xs text-gray-500 tabular-nums">
                {t.min_registration_years ?? 1}–{t.max_registration_years ?? 10}
              </td>
              <td className="px-3 py-3.5">
                <button
                  type="button"
                  onClick={() => toggleActive(t)}
                  disabled={pending}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    t.is_active ? 'bg-indigo-600' : 'bg-gray-200'
                  } disabled:opacity-60`}
                  aria-label={t.is_active ? 'Deactivate TLD' : 'Activate TLD'}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                    t.is_active ? 'translate-x-[18px]' : 'translate-x-1'
                  }`} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
