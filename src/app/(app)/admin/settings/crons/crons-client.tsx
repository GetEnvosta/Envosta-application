'use client';

/**
 * Settings → Crons interactive list: pause/resume toggle + "Run now" trigger
 * with inline result, plus last-run info. Talks to /api/admin/cron-toggle and
 * /api/admin/run-cron.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Loader2, Clock, CheckCircle, AlertTriangle, PauseCircle } from 'lucide-react';

interface CronState {
  enabled: boolean;
  lastRunAt?: string;
  lastStatus?: string;
  lastDurationMs?: number;
  lastError?: string | null;
}
interface Row {
  name: string;
  path: string;
  schedule: string;
  scheduleHuman: string;
  description: string;
  state: CronState;
}

function timeAgo(iso?: string): string {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '—';
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function CronsClient({ rows: initial }: { rows: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial);
  const [running, setRunning] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { ok: boolean; text: string } | undefined>>({});

  function setEnabled(name: string, enabled: boolean) {
    setRows((rs) => rs.map((r) => (r.name === name ? { ...r, state: { ...r.state, enabled } } : r)));
  }

  async function toggle(name: string, enabled: boolean) {
    setToggling(name);
    setEnabled(name, enabled); // optimistic
    try {
      const res = await fetch('/api/admin/cron-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, enabled }),
      });
      if (!res.ok) setEnabled(name, !enabled); // revert
    } catch {
      setEnabled(name, !enabled);
    } finally {
      setToggling(null);
    }
  }

  async function runNow(name: string) {
    setRunning(name);
    setResults((p) => ({ ...p, [name]: undefined }));
    try {
      const res = await fetch('/api/admin/run-cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      const ok = res.ok && data.ok;
      const text = ok
        ? `Ran OK · ${data.durationMs ?? '?'}ms`
        : data.error || `HTTP ${data.httpStatus ?? res.status}`;
      setResults((p) => ({ ...p, [name]: { ok, text } }));
      router.refresh();
    } catch {
      setResults((p) => ({ ...p, [name]: { ok: false, text: 'Connection error' } }));
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const st = r.state;
        const result = results[r.name];
        const statusBadge = st.lastStatus === 'ok' ? 'badge-green' : st.lastStatus ? 'badge-red' : 'badge-gray';
        return (
          <div key={r.name} className={`card p-4 ${st.enabled ? '' : 'opacity-70'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-gray-900 font-mono">{r.name}</h3>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />{r.scheduleHuman}
                  </span>
                  {!st.enabled && (
                    <span className="badge-yellow inline-flex items-center gap-1">
                      <PauseCircle className="w-3 h-3" />paused
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">{r.description}</p>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-400 flex-wrap">
                  <span className="font-mono">{r.schedule}</span>
                  <span>·</span>
                  <span>last run {timeAgo(st.lastRunAt)}</span>
                  {st.lastStatus && (
                    <span className={statusBadge}>
                      {st.lastStatus}{st.lastDurationMs != null ? ` · ${st.lastDurationMs}ms` : ''}
                    </span>
                  )}
                </div>
                {st.lastError && <p className="text-[11px] text-red-500 mt-1 truncate">err: {st.lastError}</p>}
                {result && (
                  <p className={`text-xs mt-2 inline-flex items-center gap-1 ${result.ok ? 'text-green-600' : 'text-red-600'}`}>
                    {result.ok ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    {result.text}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => toggle(r.name, !st.enabled)}
                  disabled={toggling === r.name}
                  className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50"
                  style={{ background: st.enabled ? '#4f46e5' : '#d1d5db' }}
                  title={st.enabled ? 'Pause (skip work, stays scheduled)' : 'Resume'}
                  aria-label={st.enabled ? 'Pause cron' : 'Resume cron'}
                >
                  <span
                    className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
                    style={{ transform: st.enabled ? 'translateX(17px)' : 'translateX(3px)' }}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => runNow(r.name)}
                  disabled={running === r.name || !st.enabled}
                  className="btn-admin-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 disabled:opacity-50"
                  title={st.enabled ? 'Trigger now' : 'Resume to run'}
                >
                  {running === r.name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  Run now
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
