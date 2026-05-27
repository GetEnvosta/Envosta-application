/**
 * /admin/audit — Phase 8 observability dashboard.
 *
 * Four tabs over the orchestration tables, selected by a `?tab=`
 * searchparam (single page, server-rendered, no client tab state):
 *   api       — outbound api_calls
 *   webhooks  — inbound webhook_events
 *   sync      — sync_runs + unresolved sync_drift (with resolve action)
 *   audit     — audit_log
 *
 * Vercel Workflows handles its own workflow run observability via
 * `npx workflow web`; the legacy `jobs` / `job_attempts` tables were
 * removed in migration 20260526000002.
 *
 * All reads go through src/services/mirrors.ts which uses a service-role
 * client (these tables are RLS-locked). The page itself gates on
 * role='admin' and redirects non-admins.
 */
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Activity, Webhook, RefreshCw, ScrollText, Search } from 'lucide-react';
import { getCurrentUser, getUserProfile } from '@/services/auth';
import { formatDateTime } from '@/lib/utils';
import { ResolveDriftButton } from '@/components/admin/resolve-drift-button';
import {
  getRecentApiCalls,
  getRecentWebhookEvents,
  getSyncRunsSvc,
  getSyncDriftSvc,
  getAuditLog,
} from '@/services/mirrors';

type SP = { [key: string]: string | undefined };

const TABS = [
  { id: 'api', label: 'API Calls', icon: Activity },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  { id: 'sync', label: 'Sync & Drift', icon: RefreshCw },
  { id: 'audit', label: 'Audit Log', icon: ScrollText },
] as const;

// ── small presentational helpers ───────────────────────────────────────
const TH = 'px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide';
const TD = 'px-4 py-2.5 text-gray-700';

function statusClassColor(status: number | null): string {
  if (status == null) return 'text-gray-400';
  if (status >= 200 && status < 300) return 'text-emerald-600';
  if (status >= 400 && status < 500) return 'text-amber-600';
  if (status >= 500) return 'text-red-600';
  return 'text-gray-600';
}

function truncate(v: unknown, n = 60): string {
  if (v == null) return '—';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function EmptyRow({ cols, label }: { cols: number; label: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center text-sm text-gray-400">
        {label}
      </td>
    </tr>
  );
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  // ── Admin-only gate ──
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');
  const profile = await getUserProfile(user.id);
  if (profile?.role !== 'admin') redirect('/admin');

  const sp = await searchParams;
  const tab = TABS.some((t) => t.id === sp.tab) ? (sp.tab as string) : 'api';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Observability</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            API calls, webhooks, reconciliation drift, jobs, and the audit log.
          </p>
        </div>
      </div>

      {/* Tab nav — searchparam-driven */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <Link
              key={t.id}
              href={`/admin/audit?tab=${t.id}`}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </Link>
          );
        })}
      </div>

      {tab === 'api' && <ApiCallsTab sp={sp} />}
      {tab === 'webhooks' && <WebhooksTab sp={sp} />}
      {tab === 'sync' && <SyncTab sp={sp} />}
      {tab === 'audit' && <AuditLogTab sp={sp} />}
    </div>
  );
}

// ── Tab 1 — API Calls ───────────────────────────────────────────────────
async function ApiCallsTab({ sp }: { sp: SP }) {
  const rows = await getRecentApiCalls({
    provider: sp.provider,
    statusClass: sp.statusClass,
    range: sp.range,
  });
  return (
    <div className="card overflow-hidden">
      <form method="GET" className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex flex-wrap gap-3">
        <input type="hidden" name="tab" value="api" />
        <select name="provider" defaultValue={sp.provider ?? ''} className="input w-auto">
          <option value="">All providers</option>
          {['stripe', 'wpcloud', 'opensrs', 'jetpack', 'resend'].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select name="statusClass" defaultValue={sp.statusClass ?? ''} className="input w-auto">
          <option value="">All statuses</option>
          <option value="2xx">2xx</option>
          <option value="4xx">4xx</option>
          <option value="5xx">5xx</option>
        </select>
        <select name="range" defaultValue={sp.range ?? ''} className="input w-auto">
          <option value="">All time</option>
          <option value="1h">Last 1h</option>
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7d</option>
        </select>
        <button type="submit" className="btn-admin">Filter</button>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className={TH}>Time</th>
              <th className={TH}>Provider</th>
              <th className={TH}>Method</th>
              <th className={TH}>Path</th>
              <th className={TH}>Status</th>
              <th className={TH}>Duration</th>
              <th className={TH}>Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <EmptyRow cols={7} label="No API calls match your filters." />
            ) : (
              rows.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className={`${TD} whitespace-nowrap text-xs text-gray-400`}>{formatDateTime(r.created_at)}</td>
                  <td className={TD}><span className="font-medium">{r.provider}</span></td>
                  <td className={`${TD} font-mono text-xs`}>{r.method}</td>
                  <td className={`${TD} font-mono text-xs`}>{truncate(r.path, 48)}</td>
                  <td className={`${TD} font-medium ${statusClassColor(r.response_status)}`}>{r.response_status ?? '—'}</td>
                  <td className={`${TD} text-xs`}>{r.duration_ms != null ? `${r.duration_ms}ms` : '—'}</td>
                  <td className={`${TD} text-xs text-red-500`}>{r.error ? truncate(r.error, 50) : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab 2 — Webhooks ────────────────────────────────────────────────────
async function WebhooksTab({ sp }: { sp: SP }) {
  const rows = await getRecentWebhookEvents({
    provider: sp.provider,
    processed: sp.processed,
  });
  return (
    <div className="card overflow-hidden">
      <form method="GET" className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex flex-wrap gap-3">
        <input type="hidden" name="tab" value="webhooks" />
        <select name="provider" defaultValue={sp.provider ?? ''} className="input w-auto">
          <option value="">All providers</option>
          {['stripe', 'wpcloud', 'opensrs'].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select name="processed" defaultValue={sp.processed ?? ''} className="input w-auto">
          <option value="">All</option>
          <option value="yes">Processed</option>
          <option value="no">Unprocessed</option>
        </select>
        <button type="submit" className="btn-admin">Filter</button>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className={TH}>Time</th>
              <th className={TH}>Provider</th>
              <th className={TH}>Event Type</th>
              <th className={TH}>Event ID</th>
              <th className={TH}>Signature</th>
              <th className={TH}>Processed</th>
              <th className={TH}>Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <EmptyRow cols={7} label="No webhook events match your filters." />
            ) : (
              rows.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className={`${TD} whitespace-nowrap text-xs text-gray-400`}>{formatDateTime(r.created_at)}</td>
                  <td className={TD}><span className="font-medium">{r.provider}</span></td>
                  <td className={`${TD} font-mono text-xs`}>{truncate(r.event_type, 40)}</td>
                  <td className={`${TD} font-mono text-xs text-gray-400`}>{truncate(r.provider_event_id, 28)}</td>
                  <td className={TD}>
                    <span className={r.signature_verified ? 'badge-green' : 'badge-red'}>
                      {r.signature_verified ? 'verified' : 'unverified'}
                    </span>
                  </td>
                  <td className={TD}>
                    <span className={r.processed ? 'badge-green' : 'badge-yellow'}>
                      {r.processed ? 'yes' : 'no'}
                    </span>
                  </td>
                  <td className={`${TD} text-xs text-red-500`}>{r.error ? truncate(r.error, 50) : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab 3 — Sync & Drift ────────────────────────────────────────────────
async function SyncTab({ sp }: { sp: SP }) {
  const [runs, drift] = await Promise.all([
    getSyncRunsSvc(25),
    getSyncDriftSvc({ resolved: sp.resolved }),
  ]);

  function runDuration(r: any): string {
    if (!r.completed_at) return '—';
    const ms = new Date(r.completed_at).getTime() - new Date(r.started_at).getTime();
    if (!Number.isFinite(ms) || ms < 0) return '—';
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
  }

  return (
    <div className="space-y-6">
      {/* Recent sync runs */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-sm font-semibold text-gray-900">Recent Reconciliation Runs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className={TH}>Provider</th>
                <th className={TH}>Resource</th>
                <th className={TH}>Status</th>
                <th className={TH}>Scanned</th>
                <th className={TH}>Drift</th>
                <th className={TH}>Started</th>
                <th className={TH}>Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {runs.length === 0 ? (
                <EmptyRow cols={7} label="No reconciliation runs yet." />
              ) : (
                runs.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className={TD}><span className="font-medium">{r.provider}</span></td>
                    <td className={`${TD} text-xs`}>{r.resource_type}</td>
                    <td className={TD}>
                      <span className={
                        r.status === 'completed' ? 'badge-green'
                        : r.status === 'failed' ? 'badge-red' : 'badge-blue'
                      }>{r.status}</span>
                    </td>
                    <td className={`${TD} text-xs`}>{r.records_scanned ?? 0}</td>
                    <td className={`${TD} text-xs`}>
                      {r.drift_detected ? <span className="text-amber-600 font-medium">{r.drift_detected}</span> : '0'}
                    </td>
                    <td className={`${TD} whitespace-nowrap text-xs text-gray-400`}>{formatDateTime(r.started_at)}</td>
                    <td className={`${TD} text-xs`}>{runDuration(r)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drift */}
      <div className="card overflow-hidden">
        <form method="GET" className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-900">Sync Drift</h2>
          <div className="flex items-center gap-2">
            <input type="hidden" name="tab" value="sync" />
            <select name="resolved" defaultValue={sp.resolved ?? ''} className="input w-auto">
              <option value="">Unresolved only</option>
              <option value="all">All</option>
            </select>
            <button type="submit" className="btn-admin">Filter</button>
          </div>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className={TH}>Provider</th>
                <th className={TH}>Resource Type</th>
                <th className={TH}>Resource ID</th>
                <th className={TH}>Drift Type</th>
                <th className={TH}>Detected</th>
                <th className={TH}>Alerted</th>
                <th className={TH}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {drift.length === 0 ? (
                <EmptyRow cols={7} label="No drift — everything is in sync." />
              ) : (
                drift.map((d: any) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className={TD}><span className="font-medium">{d.provider}</span></td>
                    <td className={`${TD} text-xs`}>{d.resource_type}</td>
                    <td className={`${TD} font-mono text-xs text-gray-400`}>{truncate(d.resource_id, 28)}</td>
                    <td className={TD}><span className="badge-yellow">{d.drift_type}</span></td>
                    <td className={`${TD} whitespace-nowrap text-xs text-gray-400`}>{formatDateTime(d.created_at)}</td>
                    <td className={`${TD} whitespace-nowrap text-xs text-gray-400`}>
                      {d.alerted_at ? formatDateTime(d.alerted_at) : '—'}
                    </td>
                    <td className={TD}>
                      {d.resolved
                        ? <span className="badge-green">resolved</span>
                        : <ResolveDriftButton driftId={d.id} />}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tab 4 — Audit Log ───────────────────────────────────────────────────
async function AuditLogTab({ sp }: { sp: SP }) {
  const rows = await getAuditLog({
    resourceType: sp.resourceType,
    action: sp.action,
    range: sp.range,
    resourceId: sp.resourceId,
  });
  return (
    <div className="card overflow-hidden">
      {sp.resourceId && (
        <div className="px-4 py-2.5 bg-admin-50 border-b border-gray-100 text-xs text-gray-600 flex items-center justify-between">
          <span>Filtered to resource <span className="font-mono">{sp.resourceId}</span></span>
          <Link href="/admin/audit?tab=audit" className="text-admin-600 hover:text-admin-700 font-medium">
            Clear
          </Link>
        </div>
      )}
      <form method="GET" className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex flex-wrap gap-3">
        <input type="hidden" name="tab" value="audit" />
        {sp.resourceId && <input type="hidden" name="resourceId" value={sp.resourceId} />}
        <input
          type="text"
          name="resourceType"
          defaultValue={sp.resourceType ?? ''}
          placeholder="Resource type"
          className="input w-auto"
        />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            name="action"
            defaultValue={sp.action ?? ''}
            placeholder="Action contains…"
            className="input pl-9 w-auto"
          />
        </div>
        <select name="range" defaultValue={sp.range ?? ''} className="input w-auto">
          <option value="">All time</option>
          <option value="1h">Last 1h</option>
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7d</option>
        </select>
        <button type="submit" className="btn-admin">Filter</button>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className={TH}>Time</th>
              <th className={TH}>Actor</th>
              <th className={TH}>Action</th>
              <th className={TH}>Resource Type</th>
              <th className={TH}>Resource ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <EmptyRow cols={5} label="No audit log entries match your filters." />
            ) : (
              rows.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className={`${TD} whitespace-nowrap text-xs text-gray-400`}>{formatDateTime(r.created_at)}</td>
                  <td className={TD}>
                    <span className="badge-gray">{r.actor_type}</span>
                  </td>
                  <td className={`${TD} font-mono text-xs`}>{r.action}</td>
                  <td className={`${TD} text-xs`}>{r.resource_type}</td>
                  <td className={`${TD} font-mono text-xs text-gray-400`}>
                    {r.resource_id
                      ? (
                        <Link
                          href={`/admin/audit?tab=audit&resourceId=${r.resource_id}`}
                          className="text-admin-600 hover:text-admin-700"
                        >
                          {truncate(r.resource_id, 28)}
                        </Link>
                      )
                      : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
