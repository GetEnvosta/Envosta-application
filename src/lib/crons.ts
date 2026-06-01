/**
 * Cron registry + runtime state, surfaced in Settings → Crons.
 *
 * Schedules are owned by vercel.json (Vercel triggers each route on that
 * schedule) — they CANNOT be changed at runtime, so the manifest below mirrors
 * vercel.json for display only. Keep them in sync.
 *
 * Enable/disable + last-run state live in the `platform_settings` KV table
 * under `cron:<name>` keys (service-role only). "Disabled" does NOT stop Vercel
 * from hitting the route — the route still fires but `guardCron()` makes it
 * skip its work. Every state read/write here is FAIL-OPEN: if platform_settings
 * is unreachable, crons run normally.
 */
import { createClient } from '@supabase/supabase-js';

export interface CronDef {
  name: string;          // path segment, e.g. 'health-check'
  path: string;          // '/api/cron/health-check'
  schedule: string;      // raw cron expression (mirror of vercel.json)
  scheduleHuman: string; // human-readable schedule
  description: string;
}

// ⚠️ Keep in sync with vercel.json `crons`.
export const CRONS: CronDef[] = [
  { name: 'retry-stuck-provisions', path: '/api/cron/retry-stuck-provisions', schedule: '*/5 * * * *', scheduleHuman: 'Every 5 minutes', description: 'Retries sites stuck in provisioning with backoff (max 5 attempts).' },
  { name: 'reconcile-wpcloud', path: '/api/cron/reconcile-wpcloud', schedule: '0 * * * *', scheduleHuman: 'Hourly', description: 'Reconciles site state against wp.cloud and records any drift.' },
  { name: 'drift-alerter', path: '/api/cron/drift-alerter', schedule: '0 */6 * * *', scheduleHuman: 'Every 6 hours', description: 'Emails admin about unresolved reconciliation drift.' },
  { name: 'cleanup-abandoned-signups', path: '/api/cron/cleanup-abandoned-signups', schedule: '0 3 * * *', scheduleHuman: 'Daily · 03:00 UTC', description: 'Clears abandoned signup records.' },
  { name: 'delete-expired-sites', path: '/api/cron/delete-expired-sites', schedule: '0 4 * * *', scheduleHuman: 'Daily · 04:00 UTC', description: 'Permanently deletes sites flagged for deletion past their grace period.' },
  { name: 'reconcile-opensrs', path: '/api/cron/reconcile-opensrs', schedule: '0 4 * * *', scheduleHuman: 'Daily · 04:00 UTC', description: 'Reconciles domain state against OpenSRS and records any drift.' },
  { name: 'cleanup-unclaimed', path: '/api/cron/cleanup-unclaimed', schedule: '0 5 * * *', scheduleHuman: 'Daily · 05:00 UTC', description: 'Removes stale unclaimed accounts.' },
  { name: 'health-check', path: '/api/cron/health-check', schedule: '0 6 * * *', scheduleHuman: 'Daily · 06:00 UTC', description: 'Daily site-sync health check; emails admin on issues and sends domain-expiry warnings.' },
  { name: 'process-domain-renewals', path: '/api/cron/process-domain-renewals', schedule: '0 9 * * *', scheduleHuman: 'Daily · 09:00 UTC', description: 'Charges and renews domains nearing expiry via OpenSRS.' },
];

export interface CronState {
  enabled: boolean;
  lastRunAt?: string;
  lastStatus?: string;          // 'ok' | 'http_<code>' | 'error'
  lastDurationMs?: number;
  lastError?: string | null;
}

export const isValidCron = (name: string): boolean => CRONS.some((c) => c.name === name);

const keyFor = (name: string) => `cron:${name}`;

function svc() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });
}

/** Read every cron's state. Returns name → state (missing rows = default enabled). */
export async function getAllCronStates(): Promise<Record<string, CronState>> {
  const out: Record<string, CronState> = {};
  try {
    const sb = svc();
    const { data } = await sb.from('platform_settings').select('key, value').like('key', 'cron:%');
    for (const row of data ?? []) {
      const name = String(row.key).slice('cron:'.length);
      out[name] = { enabled: true, ...((row.value as Partial<CronState>) ?? {}) };
    }
  } catch {
    // ignore — caller renders defaults (all enabled)
  }
  return out;
}

/**
 * Call at the TOP of a cron route (after the CRON_SECRET auth check). Stamps
 * lastRunAt and returns whether the cron is enabled. FAIL-OPEN: any error →
 * enabled:true, so a settings hiccup never stops a real cron.
 */
export async function guardCron(name: string): Promise<{ enabled: boolean }> {
  try {
    const sb = svc();
    const { data } = await sb.from('platform_settings').select('value').eq('key', keyFor(name)).maybeSingle();
    const state = (data?.value as CronState) ?? { enabled: true };
    const enabled = state.enabled !== false;
    await sb.from('platform_settings').upsert(
      { key: keyFor(name), value: { ...state, enabled, lastRunAt: new Date().toISOString() } },
      { onConflict: 'key' },
    );
    return { enabled };
  } catch {
    return { enabled: true };
  }
}

/** Record the outcome of a manual "Run now" trigger. Merge, best-effort. */
export async function recordCronResult(
  name: string,
  result: { status: string; durationMs: number; error?: string | null },
): Promise<void> {
  try {
    const sb = svc();
    const { data } = await sb.from('platform_settings').select('value').eq('key', keyFor(name)).maybeSingle();
    const state = (data?.value as CronState) ?? { enabled: true };
    await sb.from('platform_settings').upsert(
      {
        key: keyFor(name),
        value: { ...state, lastStatus: result.status, lastDurationMs: result.durationMs, lastError: result.error ?? null },
      },
      { onConflict: 'key' },
    );
  } catch {
    // best effort
  }
}

/** Enable/disable a cron (Settings → Crons toggle). */
export async function setCronEnabled(name: string, enabled: boolean): Promise<void> {
  const sb = svc();
  const { data } = await sb.from('platform_settings').select('value').eq('key', keyFor(name)).maybeSingle();
  const state = (data?.value as CronState) ?? { enabled: true };
  await sb.from('platform_settings').upsert(
    { key: keyFor(name), value: { ...state, enabled } },
    { onConflict: 'key' },
  );
}
