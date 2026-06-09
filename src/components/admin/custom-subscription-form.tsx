'use client';

/**
 * Admin tool for creating a bespoke Enterprise subscription for
 * a specific customer. Renders inside the admin customer detail page;
 * POSTs to /api/admin/custom-subscription which creates the per-customer
 * Stripe Price + Subscription and stamps users.metadata.custom_plan_*.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';

export function CustomSubscriptionForm({ userId, userEmail }: { userId: string; userEmail: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ subscriptionId: string } | null>(null);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const form = e.currentTarget;
    const data = new FormData(form);
    const planSlug = String(data.get('planSlug') ?? 'enterprise');
    const currency = String(data.get('currency') ?? 'usd') as 'usd' | 'cad';
    const monthlyDollars = Number(data.get('monthlyDollars'));
    const yearlyDollarsRaw = String(data.get('yearlyDollars') ?? '').trim();
    const yearlyDollars = yearlyDollarsRaw ? Number(yearlyDollarsRaw) : null;
    const sitesOverrideRaw = String(data.get('sitesOverride') ?? '').trim();
    const sitesOverride = sitesOverrideRaw ? Number(sitesOverrideRaw) : null;

    if (!Number.isFinite(monthlyDollars) || monthlyDollars < 1) {
      setError('Monthly price must be at least $1.');
      setSubmitting(false);
      return;
    }
    if (yearlyDollars != null && (!Number.isFinite(yearlyDollars) || yearlyDollars < 1)) {
      setError('Yearly price must be at least $1 (or leave blank).');
      setSubmitting(false);
      return;
    }
    if (sitesOverride != null && (!Number.isFinite(sitesOverride) || sitesOverride < 1)) {
      setError('Sites override must be a positive number (or leave blank).');
      setSubmitting(false);
      return;
    }

    const confirmMsg = [
      `Create custom ${planSlug.toUpperCase()} subscription for ${userEmail ?? userId}?`,
      ``,
      `Monthly: $${monthlyDollars.toFixed(2)} ${currency.toUpperCase()}`,
      yearlyDollars ? `Yearly: $${yearlyDollars.toFixed(2)} ${currency.toUpperCase()}` : '',
      sitesOverride ? `Sites cap: ${sitesOverride}` : '',
      ``,
      `The customer will be charged immediately (prorated). This cannot be undone via UI — you'd cancel via Stripe Dashboard.`,
    ].filter(Boolean).join('\n');
    if (!confirm(confirmMsg)) {
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/custom-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          planSlug,
          currency,
          monthlyCents: Math.round(monthlyDollars * 100),
          yearlyCents: yearlyDollars != null ? Math.round(yearlyDollars * 100) : undefined,
          sitesOverride: sitesOverride ?? undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? `Failed (${res.status})`);
        setSubmitting(false);
        return;
      }
      setResult({ subscriptionId: json.subscriptionId });
      setTimeout(() => { router.refresh(); }, 500);
    } catch (e: any) {
      setError(e?.message ?? 'Network error');
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors"
      >
        <Sparkles className="w-3 h-3" /> Create custom subscription (Enterprise)
      </button>
    );
  }

  if (result) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
        <p className="text-sm font-medium text-emerald-900">Subscription created</p>
        <p className="text-xs text-emerald-700 mt-0.5 font-mono">{result.subscriptionId}</p>
        <p className="text-xs text-emerald-700 mt-2">
          Refreshing… The customer will see their new plan on next dashboard load.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-purple-200 bg-purple-50/40 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-purple-900 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> Custom subscription
        </h3>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(''); }}
          className="text-xs text-gray-500 hover:text-gray-700"
        >Cancel</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="planSlug" className="block text-[11px] font-medium text-gray-600 mb-1">Plan</label>
          <select id="planSlug" name="planSlug" defaultValue="enterprise" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white">
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
        <div>
          <label htmlFor="currency" className="block text-[11px] font-medium text-gray-600 mb-1">Currency</label>
          <select id="currency" name="currency" defaultValue="cad" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white">
            <option value="cad">CAD</option>
            <option value="usd">USD</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="monthlyDollars" className="block text-[11px] font-medium text-gray-600 mb-1">Monthly price (whole dollars) *</label>
          <input
            id="monthlyDollars" name="monthlyDollars" type="number" min="1" step="0.01" required
            placeholder="e.g. 2300"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
          />
        </div>
        <div>
          <label htmlFor="yearlyDollars" className="block text-[11px] font-medium text-gray-600 mb-1">Yearly price (optional)</label>
          <input
            id="yearlyDollars" name="yearlyDollars" type="number" min="1" step="0.01"
            placeholder="e.g. 20700"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
          />
        </div>
      </div>

      <div>
        <label htmlFor="sitesOverride" className="block text-[11px] font-medium text-gray-600 mb-1">
          Sites cap override (optional — overrides plan default)
        </label>
        <input
          id="sitesOverride" name="sitesOverride" type="number" min="1" step="1"
          placeholder="e.g. 50 (leave blank for plan default)"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {submitting ? 'Creating in Stripe…' : 'Create Stripe subscription'}
      </button>
    </form>
  );
}
