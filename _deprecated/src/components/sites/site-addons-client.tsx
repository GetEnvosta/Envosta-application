'use client';

/**
 * Interactive add/remove buttons for site add-ons. Renders one row per
 * available add-on showing price + what it changes; each row toggles
 * between "Add" (not attached) and "Remove" (active on this site).
 *
 * On click, shows a native confirm() and POSTs to
 * /api/account/addons/{add,remove}. router.refresh() pulls the new
 * state on success.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Minus, Check } from 'lucide-react';
import { formatCents } from '@/lib/utils';

export interface SiteAddonRow {
  productId: string;
  slug: string;
  name: string;
  description: string | null;
  priceCadMonthly: number | null;
  priceCadYearly: number | null;
  isActive: boolean;
  effectsSummary: string | null;
}

export function SiteAddonsClient({
  siteId,
  rows,
  billingPeriod,
}: {
  siteId: string;
  rows: SiteAddonRow[];
  billingPeriod: 'monthly' | 'yearly';
}) {
  const router = useRouter();
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [errorBySlug, setErrorBySlug] = useState<Record<string, string>>({});

  async function toggle(row: SiteAddonRow) {
    const action: 'add' | 'remove' = row.isActive ? 'remove' : 'add';
    const price = billingPeriod === 'yearly' ? row.priceCadYearly : row.priceCadMonthly;

    const verb = action === 'add' ? 'Add' : 'Remove';
    const priceStr = price != null
      ? ` for ${formatCents(price)} CAD/${billingPeriod === 'yearly' ? 'yr' : 'mo'}`
      : '';
    const confirmMsg = action === 'add'
      ? `${verb} ${row.name}${priceStr}?${row.effectsSummary ? `\n\n${row.effectsSummary}` : ''}`
      : `${verb} ${row.name} from this site? You'll be credited for the unused portion.`;

    if (!confirm(confirmMsg)) return;

    setBusySlug(row.slug);
    setErrorBySlug((m) => ({ ...m, [row.slug]: '' }));
    try {
      const res = await fetch(`/api/account/addons/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, addonSlug: row.slug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorBySlug((m) => ({ ...m, [row.slug]: data?.error ?? `${verb} failed (${res.status})` }));
        setBusySlug(null);
        return;
      }
      router.refresh();
      // Hold busy until refresh propagates
      setTimeout(() => setBusySlug(null), 600);
    } catch (e: any) {
      setErrorBySlug((m) => ({ ...m, [row.slug]: e?.message ?? 'Network error' }));
      setBusySlug(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="text-xs text-gray-400 italic">No add-ons available yet.</div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const price = billingPeriod === 'yearly' ? row.priceCadYearly : row.priceCadMonthly;
        const busy = busySlug === row.slug;
        const err = errorBySlug[row.slug];

        return (
          <div
            key={row.slug}
            className={`flex items-start justify-between gap-4 rounded-xl border px-4 py-3 transition-colors ${
              row.isActive ? 'border-emerald-200 bg-emerald-50/40' : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900">{row.name}</p>
                {row.isActive && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    <Check className="w-3 h-3" /> Active
                  </span>
                )}
              </div>
              {row.description && (
                <p className="text-xs text-gray-500 mt-0.5">{row.description}</p>
              )}
              {row.effectsSummary && (
                <p className="text-xs text-gray-600 mt-1 font-mono">{row.effectsSummary}</p>
              )}
              {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {formatCents(price)}<span className="text-[10px] text-gray-400">/{billingPeriod === 'yearly' ? 'yr' : 'mo'}</span>
              </span>
              <button
                onClick={() => toggle(row)}
                disabled={busy}
                className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 transition-colors ${
                  row.isActive
                    ? 'text-gray-600 hover:text-red-600 hover:bg-red-50 border border-gray-200 hover:border-red-200'
                    : 'text-white bg-gray-900 hover:bg-black border border-gray-900'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {busy ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : row.isActive ? (
                  <Minus className="w-3 h-3" />
                ) : (
                  <Plus className="w-3 h-3" />
                )}
                {busy ? '…' : row.isActive ? 'Remove' : 'Add'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
