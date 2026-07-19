/**
 * /admin/gates — the gate dashboard (charter §8, rebuild brief Phase 5.1).
 *
 * MRR by plan · clients by plan · Growth spots per industry (config) ·
 * churn %/mo · tickets/client/mo · CAC log (manual entry) · current gate
 * with pass requirements · kill-trigger banners.
 *
 * Data honesty: metrics compute from CURRENT production data (per-site
 * billing model) until cutover — each figure states its source. Phase 7
 * swaps the reads to the new-schema live views without changing this
 * page's shape. Gate/kill thresholds come from config/gates (never
 * hardcoded).
 */
import { createClient } from '@supabase/supabase-js';
import { AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import { GATES, KILL_TRIGGERS, METRIC_DEFINITIONS } from '@/config/gates';
import { CacEntryForm } from '@/components/admin/cac-entry-form';

export const dynamic = 'force-dynamic';

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}

const fmtMoney = (cents: number) => `$${Math.round(cents / 100).toLocaleString('en-US')}`;

interface CacEntry {
  month: string;
  spend_cents: number;
  hours: number;
  hourly_cents: number;
  closed_clients: number;
}

export default async function GatesPage() {
  const sb = svc();
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();

  // ── Live metrics from current production data (labeled) ──────────
  const [{ data: activeSites }, { data: cancelledThisMonth }, { count: ticketsThisMonth }, { data: cacRows }] =
    await Promise.all([
      sb.from('sites').select('id, user_id, product_id, products:product_id(name, slug, price_usd, price_cad)').eq('status', 'active'),
      sb.from('sites').select('id').eq('status', 'cancelled').gte('updated_at', monthStart),
      sb.from('tickets').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
      sb.from('platform_settings').select('key, value').like('key', 'cac:%'),
    ]);

  const sites = activeSites ?? [];
  const clients = new Set(sites.map((s: any) => s.user_id).filter(Boolean)).size;

  // MRR by plan (monthly-normalized from the plan price on each active site).
  const mrrByPlan = new Map<string, { cents: number; count: number }>();
  let mrrCents = 0;
  for (const s of sites as any[]) {
    const p = s.products ?? {};
    const cents = Number(p.price_usd ?? p.price_cad ?? 0);
    const name = p.name ?? '(no plan)';
    const row = mrrByPlan.get(name) ?? { cents: 0, count: 0 };
    row.cents += cents;
    row.count += 1;
    mrrByPlan.set(name, row);
    mrrCents += cents;
  }

  const cancelled = (cancelledThisMonth ?? []).length;
  const churnPct = sites.length + cancelled > 0 ? (cancelled / (sites.length + cancelled)) * 100 : 0;
  const ticketsPerClient = clients > 0 ? (ticketsThisMonth ?? 0) / clients : 0;

  // CAC (latest manual entry) + payback per the canonical definition.
  const cacEntries: CacEntry[] = (cacRows ?? [])
    .map((r: any) => ({ month: String(r.key).slice(4), ...(r.value as any) }))
    .sort((a: CacEntry, b: CacEntry) => (a.month < b.month ? 1 : -1));
  const latestCac = cacEntries[0] ?? null;
  const cacCents = latestCac && latestCac.closed_clients > 0
    ? Math.round((latestCac.spend_cents + latestCac.hours * latestCac.hourly_cents) / latestCac.closed_clients)
    : null;
  const avgRevPerClient = clients > 0 ? mrrCents / clients : 0;
  // Charter §2: COGS ≈ $10–15/site/mo → ≈90% gross margin (the charter's own arithmetic).
  const marginPerClient = avgRevPerClient * 0.9;
  const cacPaybackMonths = cacCents != null && marginPerClient > 0 ? cacCents / marginPerClient : null;

  // ── Gate + kill evaluation (thresholds from config only) ─────────
  const currentGate = [...GATES].reverse().find((g) => g.mrrCents != null && mrrCents >= g.mrrCents) ?? GATES[0];
  const nextGate = GATES.find((g) => g.mrrCents != null && mrrCents < (g.mrrCents ?? 0)) ?? null;

  const churnTrigger = KILL_TRIGGERS.find((k) => k.key === 'churn')!;
  const ticketTrigger = KILL_TRIGGERS.find((k) => k.key === 'tickets')!;
  const churnBreached = churnPct > (churnTrigger.threshold ?? Infinity);
  const ticketsBreached = ticketsPerClient > (ticketTrigger.threshold ?? Infinity);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Gates & kill triggers</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Charter §8 — the sequence is law. Metrics read current production billing until cutover;
          thresholds come from config.
        </p>
      </div>

      {/* ── Kill-trigger banners ── */}
      {(churnBreached || ticketsBreached) && (
        <div className="mb-6 space-y-3">
          {churnBreached && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">
                  Churn {churnPct.toFixed(1)}% this month — trigger fires at {churnTrigger.threshold}% for 2 consecutive months
                </p>
                <p className="text-sm text-red-600">{churnTrigger.consequence}</p>
              </div>
            </div>
          )}
          {ticketsBreached && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">
                  {ticketsPerClient.toFixed(1)} tickets/client this month — trigger at {ticketTrigger.threshold}
                </p>
                <p className="text-sm text-red-600">{ticketTrigger.consequence}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Core metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">MRR</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{fmtMoney(mrrCents)}</p>
          <p className="text-xs text-gray-400 mt-1">{METRIC_DEFINITIONS.mrr}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Active clients</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{clients}</p>
          <p className="text-xs text-gray-400 mt-1">{sites.length} active sites</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Churn (this month)</p>
          <p className={`text-2xl font-semibold mt-1 ${churnBreached ? 'text-red-600' : 'text-gray-900'}`}>
            {churnPct.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-400 mt-1">{METRIC_DEFINITIONS.churn} Approximated from cancellations.</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Tickets / client / mo</p>
          <p className={`text-2xl font-semibold mt-1 ${ticketsBreached ? 'text-red-600' : 'text-gray-900'}`}>
            {ticketsPerClient.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{ticketsThisMonth ?? 0} tickets this month</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* ── MRR by plan + spots ── */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">MRR by plan</h2>
          <table className="w-full text-sm">
            <tbody>
              {[...mrrByPlan.entries()].map(([name, row]) => (
                <tr key={name} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 text-gray-700">{name}</td>
                  <td className="py-2 text-gray-400">{row.count} × </td>
                  <td className="py-2 text-right font-medium text-gray-900">{fmtMoney(row.cents)}</td>
                </tr>
              ))}
              {mrrByPlan.size === 0 && (
                <tr><td className="py-2 text-gray-400">No active billing yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Gate ladder ── */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            The gates — currently at <span className="text-blue-600">Gate {currentGate.number}</span>
            {nextGate?.mrrCents ? (
              <span className="text-gray-400 font-normal"> · {fmtMoney(Math.max(0, nextGate.mrrCents - mrrCents))} to Gate {nextGate.number}</span>
            ) : null}
          </h2>
          <ol className="space-y-4">
            {GATES.map((g) => {
              const reached = g.mrrCents == null ? currentGate.number >= g.number : mrrCents >= g.mrrCents;
              return (
                <li key={g.number} className="flex gap-3">
                  {reached
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    : <Circle className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />}
                  <div>
                    <p className={`text-sm font-medium ${reached ? 'text-gray-900' : 'text-gray-500'}`}>
                      Gate {g.number} — {g.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{g.requirements.join(' · ')}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Unlocks: {g.unlocks}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* ── CAC log ── */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">CAC log</h2>
            <p className="text-xs text-gray-500 mt-0.5">{METRIC_DEFINITIONS.cac} {METRIC_DEFINITIONS.cacPayback}</p>
          </div>
          {cacCents != null && (
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900">{fmtMoney(cacCents)} <span className="text-xs font-normal text-gray-400">CAC ({latestCac?.month})</span></p>
              <p className="text-xs text-gray-500">
                Payback ≈ {cacPaybackMonths != null ? cacPaybackMonths.toFixed(1) : '—'} months
                <span className="text-gray-400"> (margin ≈ 90% of {fmtMoney(avgRevPerClient)}/client — charter §2 arithmetic; setup fees repay CAC inside 30 days by design)</span>
              </p>
            </div>
          )}
        </div>
        <CacEntryForm entries={cacEntries} />
      </div>
    </div>
  );
}
