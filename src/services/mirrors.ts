/**
 * Read helpers for the upstream mirror tables — `wpcloud_sites`,
 * `opensrs_domains`, plus the reconciliation bookkeeping tables
 * `sync_drift` and `sync_runs` — and the orchestration/observability
 * tables (`api_calls`, `webhook_events`, `jobs`, `job_attempts`,
 * `audit_log`) surfaced by the /admin/audit dashboard.
 *
 * These tables mirror wp.cloud / OpenSRS state. They are populated by
 * the provisioning routes and refreshed by the reconciliation crons
 * (`/api/cron/reconcile-wpcloud`, `/api/cron/reconcile-opensrs`). This
 * file is read-only — mutations belong in those routes/crons.
 *
 * The orchestration tables are service-role-only (RLS denies anon),
 * so the observability helpers use a service-role client. Callers
 * (the /admin/audit page) must gate on `role='admin'` themselves.
 */
import { createClient } from '@/lib/supabase-server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

/** Service-role Supabase client for the RLS-locked observability tables. */
function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}

/**
 * The wp.cloud mirror row for a site, looked up by `sites.id`.
 * Returns null when the site has no mirror row yet (e.g. provisioning
 * hasn't completed or the reconcile cron hasn't run).
 */
export async function getWpCloudMirror(siteId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('wpcloud_sites')
    .select('*')
    .eq('site_id', siteId)
    .maybeSingle();
  return data ?? null;
}

/**
 * The OpenSRS mirror row for a domain, looked up by `domains.id`.
 * Returns null when the domain has no mirror row yet.
 */
export async function getOpenSrsMirror(domainId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('opensrs_domains')
    .select('*')
    .eq('domain_id', domainId)
    .maybeSingle();
  return data ?? null;
}

/**
 * Unresolved drift rows (sync_drift where resolved=false), newest
 * first. Used by the admin reconciliation dashboard to surface
 * everything the crons flagged that ops hasn't cleared yet.
 */
export async function getUnresolvedDrift(limit = 50) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('sync_drift')
    .select('*')
    .eq('resolved', false)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

/**
 * Recent reconciliation runs (sync_runs), newest first — across both
 * providers. Used by the admin dashboard to show sweep health.
 */
export async function getRecentSyncRuns(limit = 20) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('sync_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────────────
// Observability read helpers for /admin/audit. Service-role only.
// ─────────────────────────────────────────────────────────────────────

/** Map a "1h" / "24h" / "7d" range token to an ISO cutoff timestamp. */
function rangeCutoff(range?: string): string | null {
  const ms: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
  };
  const span = range ? ms[range] : undefined;
  return span ? new Date(Date.now() - span).toISOString() : null;
}

/**
 * Recent outbound API calls (api_calls), newest first.
 * Filters: provider, status class (2xx/4xx/5xx), time range.
 */
export async function getRecentApiCalls(filters: {
  provider?: string;
  statusClass?: string;
  range?: string;
  limit?: number;
} = {}) {
  const sb = svc();
  let q = sb
    .from('api_calls')
    .select('id, provider, method, path, response_status, duration_ms, error, created_at')
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 100);

  if (filters.provider && filters.provider !== 'all') {
    q = q.eq('provider', filters.provider);
  }
  if (filters.statusClass === '2xx') q = q.gte('response_status', 200).lt('response_status', 300);
  else if (filters.statusClass === '4xx') q = q.gte('response_status', 400).lt('response_status', 500);
  else if (filters.statusClass === '5xx') q = q.gte('response_status', 500).lt('response_status', 600);

  const cutoff = rangeCutoff(filters.range);
  if (cutoff) q = q.gte('created_at', cutoff);

  const { data } = await q;
  return data ?? [];
}

/**
 * Recent inbound webhook events (webhook_events), newest first.
 * Filters: provider, processed (yes/no).
 */
export async function getRecentWebhookEvents(filters: {
  provider?: string;
  processed?: string;
  limit?: number;
} = {}) {
  const sb = svc();
  let q = sb
    .from('webhook_events')
    .select('id, provider, event_type, provider_event_id, signature_verified, processed, error, created_at')
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 100);

  if (filters.provider && filters.provider !== 'all') {
    q = q.eq('provider', filters.provider);
  }
  if (filters.processed === 'yes') q = q.eq('processed', true);
  else if (filters.processed === 'no') q = q.eq('processed', false);

  const { data } = await q;
  return data ?? [];
}

/** Counts of jobs grouped by status — for the Jobs tab summary cards. */
export async function getJobStats(): Promise<Record<string, number>> {
  const sb = svc();
  const statuses = ['pending', 'running', 'completed', 'failed', 'dead_letter', 'cancelled'];
  const counts: Record<string, number> = {};
  await Promise.all(
    statuses.map(async (status) => {
      const { count } = await sb
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', status);
      counts[status] = count ?? 0;
    }),
  );
  return counts;
}

/** Recent jobs (jobs), newest first. Filter: status. */
export async function getRecentJobs(filters: { status?: string; limit?: number } = {}) {
  const sb = svc();
  let q = sb
    .from('jobs')
    .select('id, type, status, error, created_at, started_at, completed_at')
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 100);

  if (filters.status && filters.status !== 'all') {
    q = q.eq('status', filters.status);
  }

  const { data } = await q;
  return data ?? [];
}

/**
 * Recent audit_log rows, newest first.
 * Filters: resource_type, action (free-text contains), time range,
 * and a resourceId to pin to one resource's full history.
 */
export async function getAuditLog(filters: {
  resourceType?: string;
  action?: string;
  range?: string;
  resourceId?: string;
  limit?: number;
} = {}) {
  const sb = svc();
  let q = sb
    .from('audit_log')
    .select('id, actor_id, actor_type, action, resource_type, resource_id, created_at')
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 100);

  if (filters.resourceType && filters.resourceType !== 'all') {
    q = q.eq('resource_type', filters.resourceType);
  }
  if (filters.action) q = q.ilike('action', `%${filters.action}%`);
  if (filters.resourceId) q = q.eq('resource_id', filters.resourceId);

  const cutoff = rangeCutoff(filters.range);
  if (cutoff) q = q.gte('created_at', cutoff);

  const { data } = await q;
  return data ?? [];
}

/**
 * Recent sync_runs via the service-role client (the /admin/audit page
 * runs RLS-locked reads). Mirrors getRecentSyncRuns but service-role.
 */
export async function getSyncRunsSvc(limit = 25) {
  const sb = svc();
  const { data } = await sb
    .from('sync_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

/**
 * sync_drift rows for the /admin/audit Sync & Drift tab, via the
 * service-role client. `resolved` filter: 'unresolved' (default) | 'all'.
 */
export async function getSyncDriftSvc(filters: { resolved?: string; limit?: number } = {}) {
  const sb = svc();
  let q = sb
    .from('sync_drift')
    .select('id, provider, resource_type, resource_id, drift_type, resolved, resolved_at, alerted_at, created_at')
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 100);

  if (filters.resolved !== 'all') {
    q = q.eq('resolved', false);
  }

  const { data } = await q;
  return data ?? [];
}
