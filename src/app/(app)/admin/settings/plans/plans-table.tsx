'use client';

/**
 * Inline-editable hosting-plan price table for /admin/settings/plans.
 *
 * Each row owns its own optimistic local state for prices/active flag;
 * saves POST to /api/admin/products/[id]/update-pricing. Per-row "Sync to
 * Stripe" buttons hit the existing /api/admin/sync-stripe endpoint with
 * { type: 'product', id }.
 */
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle, AlertTriangle, Pencil, RefreshCw, Plus } from 'lucide-react';
import { InlinePriceCell } from './inline-price-cell';

interface PlanRow {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  price_cad: number | null;
  price_yearly_cad: number | null;
  price_usd: number | null;
  price_yearly_usd: number | null;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  stripe_price_id_yearly: string | null;
  stripe_price_id_cad: string | null;
  stripe_price_id_yearly_cad: string | null;
  metadata: Record<string, any> | null;
}

export function PlansTable({ plans }: { plans: PlanRow[] }) {
  const router = useRouter();
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null);
  const [togglePending, startToggle] = useTransition();

  async function savePrice(id: string, field: keyof PlanRow, cents: number) {
    const res = await fetch(`/api/admin/products/${id}/update-pricing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: cents }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { error: data.error ?? `HTTP ${res.status}` };
    }
    return {};
  }

  async function toggleActive(id: string, next: boolean) {
    startToggle(async () => {
      await fetch(`/api/admin/products/${id}/update-pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: next }),
      });
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

  if (plans.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-sm text-gray-400 mb-3">No hosting plans yet.</p>
        <Link href="/admin/settings/plans/new" className="btn-admin inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create first plan
        </Link>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/60">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sites</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly CAD</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yearly CAD</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly USD</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yearly USD</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stripe</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {plans.map(plan => {
            const sites = plan.metadata?.sites_allowed ?? 1;
            const synced = Boolean(plan.stripe_product_id && plan.stripe_price_id);
            const showingSyncMsg = syncMsg?.id === plan.id;
            return (
              <tr key={plan.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3.5">
                  <p className="font-medium text-gray-900">{plan.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5 font-mono">{plan.slug}</p>
                </td>
                <td className="px-3 py-3.5 text-gray-700 tabular-nums">{sites}</td>
                <td className="px-3 py-3.5">
                  <InlinePriceCell
                    value={plan.price_cad}
                    currency="cad"
                    dashOnZero
                    onSave={cents => savePrice(plan.id, 'price_cad', cents)}
                  />
                </td>
                <td className="px-3 py-3.5">
                  <InlinePriceCell
                    value={plan.price_yearly_cad}
                    currency="cad"
                    dashOnZero
                    onSave={cents => savePrice(plan.id, 'price_yearly_cad', cents)}
                  />
                </td>
                <td className="px-3 py-3.5">
                  <InlinePriceCell
                    value={plan.price_usd}
                    currency="usd"
                    dashOnZero
                    onSave={cents => savePrice(plan.id, 'price_usd', cents)}
                  />
                </td>
                <td className="px-3 py-3.5">
                  <InlinePriceCell
                    value={plan.price_yearly_usd}
                    currency="usd"
                    dashOnZero
                    onSave={cents => savePrice(plan.id, 'price_yearly_usd', cents)}
                  />
                </td>
                <td className="px-3 py-3.5">
                  {synced ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5 ring-1 ring-emerald-600/10">
                      <CheckCircle className="w-3 h-3" /> Synced
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 rounded-full px-2 py-0.5 ring-1 ring-amber-600/10">
                      <AlertTriangle className="w-3 h-3" /> Not synced
                    </span>
                  )}
                </td>
                <td className="px-3 py-3.5">
                  <button
                    type="button"
                    onClick={() => toggleActive(plan.id, !plan.is_active)}
                    disabled={togglePending}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      plan.is_active ? 'bg-indigo-600' : 'bg-gray-200'
                    } disabled:opacity-60`}
                    aria-label={plan.is_active ? 'Deactivate plan' : 'Activate plan'}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                      plan.is_active ? 'translate-x-[18px]' : 'translate-x-1'
                    }`} />
                  </button>
                </td>
                <td className="px-3 py-3.5 text-right">
                  <div className="inline-flex items-center gap-3 justify-end">
                    {showingSyncMsg && (
                      <span className={`text-xs ${syncMsg.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                        {syncMsg.text}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => syncOne(plan.id)}
                      disabled={syncingId === plan.id}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 disabled:opacity-50"
                      title="Push current DB pricing to Stripe"
                    >
                      <RefreshCw className={`w-3 h-3 ${syncingId === plan.id ? 'animate-spin' : ''}`} />
                      {syncingId === plan.id ? 'Syncing' : 'Sync'}
                    </button>
                    <Link
                      href={`/admin/settings/plans/${plan.id}`}
                      className="text-xs text-gray-600 hover:text-gray-900 font-medium inline-flex items-center gap-1"
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
