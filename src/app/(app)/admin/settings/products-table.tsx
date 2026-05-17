'use client';

/**
 * <ProductsTable> — shared client table for non-plan, non-TLD products
 * (plan_addon, one_time_service). Used by /admin/settings/addons and
 * /admin/settings/services with a fixed type filter passed in.
 *
 * Inline-editable monthly + yearly CAD price columns, status toggle,
 * per-row Sync-to-Stripe button (visible whether synced or not — re-sync
 * is the recommended path after a price change), and a deep-edit link.
 * Saving routes through /api/admin/products/[id]/update-pricing; sync
 * routes through /api/admin/products/[id]/sync-stripe.
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, AlertTriangle, Pencil, Plus, Loader2 } from 'lucide-react';
import { InlinePriceCell } from './plans/inline-price-cell';

interface Row {
  id: string;
  name: string;
  slug: string;
  price_cad: number | null;
  price_yearly_cad: number | null;
  billing: string | null;
  is_active: boolean;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
}

async function postPricing(id: string, body: any) {
  const res = await fetch(`/api/admin/products/${id}/update-pricing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, error: data?.error as string | undefined };
}

export function ProductsTable({
  rows,
  emptyLabel,
  newHref,
  newLabel,
  showYearly = true,
}: {
  rows: Row[];
  emptyLabel: string;
  newHref: string;
  newLabel: string;
  showYearly?: boolean;
}) {
  const router = useRouter();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [, startToggle] = useTransition();
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  function toggleActive(row: Row) {
    setTogglingId(row.id);
    startToggle(async () => {
      const { ok, error } = await postPricing(row.id, { is_active: !row.is_active });
      setTogglingId(null);
      if (!ok) alert(error ?? 'Failed to toggle status');
      router.refresh();
    });
  }

  async function syncOne(id: string) {
    setSyncingId(id);
    setSyncMsg(null);
    try {
      const res = await fetch(`/api/admin/products/${id}/sync-stripe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setSyncMsg({ id, text: 'Synced', ok: true });
        router.refresh();
      } else {
        setSyncMsg({ id, text: data.error ?? 'Sync failed', ok: false });
      }
    } catch (e: any) {
      setSyncMsg({ id, text: e?.message ?? 'Sync failed', ok: false });
    }
    setSyncingId(null);
    setTimeout(() => setSyncMsg(null), 3000);
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {rows.length} {rows.length === 1 ? 'item' : 'items'}
        </p>
        <Link
          href={newHref}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800"
        >
          <Plus className="w-3.5 h-3.5" /> {newLabel}
        </Link>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price (CAD)</th>
            {showYearly && (
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yearly (CAD)</th>
            )}
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billing</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stripe</th>
            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={showYearly ? 7 : 6} className="p-12 text-center text-sm text-gray-400">
                {emptyLabel}
              </td>
            </tr>
          ) : rows.map(row => {
            const synced = Boolean(row.stripe_product_id && row.stripe_price_id);
            const showingSyncMsg = syncMsg?.id === row.id;
            const isSyncing = syncingId === row.id;
            return (
            <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-5 py-3.5">
                <p className="font-medium text-gray-900">{row.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{row.slug}</p>
              </td>
              <td className="px-3 py-3.5">
                <InlinePriceCell
                  value={row.price_cad}
                  currency="cad"
                  dashOnZero
                  onSave={async (cents) => postPricing(row.id, { price_cad: cents })}
                />
              </td>
              {showYearly && (
                <td className="px-3 py-3.5">
                  <InlinePriceCell
                    value={row.price_yearly_cad}
                    currency="cad"
                    dashOnZero
                    onSave={async (cents) => postPricing(row.id, { price_yearly_cad: cents })}
                  />
                </td>
              )}
              <td className="px-3 py-3.5 text-xs text-gray-500 capitalize">
                {row.billing?.replace('_', ' ') ?? '—'}
              </td>
              <td className="px-3 py-3.5">
                <button
                  onClick={() => toggleActive(row)}
                  disabled={togglingId === row.id}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                    row.is_active ? 'bg-emerald-500' : 'bg-gray-300'
                  } ${togglingId === row.id ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                  title={row.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition ${
                      row.is_active ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                  {togglingId === row.id && (
                    <Loader2 className="absolute -right-5 w-3 h-3 animate-spin text-gray-400" />
                  )}
                </button>
              </td>
              <td className="px-3 py-3.5">
                <button
                  type="button"
                  onClick={() => syncOne(row.id)}
                  disabled={isSyncing}
                  className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 ring-1 transition disabled:opacity-50 ${
                    synced
                      ? 'text-emerald-700 bg-emerald-50 ring-emerald-600/10 hover:bg-emerald-100'
                      : 'text-amber-700 bg-amber-50 ring-amber-600/10 hover:bg-amber-100'
                  }`}
                  title={synced ? 'Re-sync this product to Stripe' : 'Sync this product to Stripe'}
                >
                  {isSyncing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : synced ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <AlertTriangle className="w-3 h-3" />
                  )}
                  {isSyncing ? 'Syncing' : synced ? 'Synced' : 'Sync'}
                </button>
              </td>
              <td className="px-3 py-3.5 text-right">
                <div className="inline-flex items-center gap-3 justify-end">
                  {showingSyncMsg && (
                    <span className={`text-xs ${syncMsg.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                      {syncMsg.text}
                    </span>
                  )}
                  <Link
                    href={`/admin/settings/plans/${row.id}`}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </Link>
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
