/**
 * Read helpers for the upstream mirror tables — `wpcloud_sites`,
 * `opensrs_domains`, plus the reconciliation bookkeeping tables
 * `sync_drift` and `sync_runs`.
 *
 * These tables mirror wp.cloud / OpenSRS state. They are populated by
 * the provisioning routes and refreshed by the reconciliation crons
 * (`/api/cron/reconcile-wpcloud`, `/api/cron/reconcile-opensrs`). This
 * file is read-only — mutations belong in those routes/crons.
 */
import { createClient } from '@/lib/supabase-server';

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
