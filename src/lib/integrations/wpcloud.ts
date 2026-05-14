/**
 * wp.cloud Atomic API client.
 *
 * Called from Vercel API routes. Vercel's static IPs (184.72.2.216,
 * 54.241.78.174) are whitelisted at wp.cloud so direct HTTPS calls
 * work without any proxy layer.
 *
 * Auth: `Auth: <WPCLOUD_API_KEY>` header. The Atomic API uses
 * application/x-www-form-urlencoded for POST bodies and JSON-encodes
 * responses.
 *
 * Every request is wrapped in `withApiCallLogging` so the `api_calls`
 * table gets a row with timing, status, and parsed body. Non-2xx
 * responses throw `WpCloudError`.
 *
 * Base URL: `https://atomic-api.wordpress.com` (override via
 * `WPCLOUD_BASE_URL` env var).
 */
import { withApiCallLogging } from '../api-call-logger';

const DEFAULT_WPCLOUD_BASE_URL = 'https://atomic-api.wordpress.com';

// ─── Types ───────────────────────────────────────────────────

export interface WpCloudSite {
  atomic_site_id?: string | number;
  wpcom_blog_id?: string | number;
  domain_name?: string;
  status?: string;
  geo_affinity?: string;
  php_version?: string;
  space_quota?: string;
  // The Atomic API returns additional fields per site — keep the type
  // open-ended rather than fighting upstream schema drift.
  [key: string]: unknown;
}

export interface WpCloudBackup {
  id?: string;
  name?: string;
  type?: string;
  created_at?: string;
  size_bytes?: number;
  [key: string]: unknown;
}

/**
 * Error thrown when wp.cloud returns a non-2xx response. Carries the
 * HTTP status, the parsed body (if any), and the request path so
 * callers can log and surface a useful error.
 */
export class WpCloudError extends Error {
  public readonly status: number;
  public readonly body: unknown;
  public readonly path: string;

  constructor(message: string, status: number, body: unknown, path: string) {
    super(message);
    this.name = 'WpCloudError';
    this.status = status;
    this.body = body;
    this.path = path;
  }
}

// ─── Client surface ─────────────────────────────────────────

export interface WpCloudClient {
  /**
   * Create a wp.cloud Atomic site.
   * Maps to `POST /api/v1.0/create-site/{client}/{id}`.
   * Returns the upstream site identifier (`site_id`) plus a status
   * string. The Atomic API actually returns more fields than this —
   * see `wpcloud_sites.upstream_payload` for the full mirror.
   *
   * `extraBody` lets advanced callers (e.g. the Stripe webhook +
   * provision-site internal route) pass the full atomic-create body
   * — admin_user / admin_pass / admin_email / domain_name / space_quota
   * / meta {} / persist_data {} — rather than the minimal subset.
   */
  createSite(params: {
    label: string;
    region: string;
    phpVersion: string;
    planId: string;
    userId: string;
    extraBody?: Record<string, unknown>;
    siteIdentifier?: string;
  }): Promise<{ site_id: string; status: string; raw: Record<string, unknown> }>;

  /**
   * Lightweight connectivity probe. Calls `GET /get-php-versions/{client}/verbose`
   * — a read-only, parameter-light endpoint that returns 200 if auth +
   * IP whitelist are correct. Used by the admin health-check UI to
   * confirm Vercel→wp.cloud reachability without depending on the
   * (currently buggy) list-sites endpoint.
   *
   * Returns the raw response body on success; throws WpCloudError on
   * non-2xx.
   */
  ping(): Promise<unknown>;

  /**
   * Fetch a wp.cloud site's primary IP address.
   * Maps to `GET /api/v1.0/get-ips/{client}/{siteRef}`. `siteRef` may
   * be a wp.cloud site ID or a domain name.
   */
  getSiteIp(siteRef: string): Promise<{ ip: string | null; raw: unknown }>;

  /**
   * Fetch a single site's details. Maps to
   * `GET /api/v1.0/get-site/{wpCloudSiteId}/extra`.
   */
  getSite(siteId: string): Promise<WpCloudSite>;

  /**
   * List all wp.cloud sites in the reseller account.
   * Maps to `GET /api/v1.0/get-sites/{client}/+`. Pagination params
   * are accepted but currently ignored (the Atomic API returns the
   * full list for our client size).
   */
  listSites(opts?: { limit?: number; offset?: number }): Promise<{
    sites: WpCloudSite[];
    total: number;
  }>;

  /**
   * Update a single site-meta key on wp.cloud.
   * Maps to `POST /api/v1.0/site-meta/{wpCloudSiteId}/{key}/update`
   * with body `{ value }`.
   */
  updateSiteMeta(siteId: string, key: string, value: string): Promise<void>;

  /**
   * Delete a wp.cloud Atomic site.
   * Maps to `POST /api/v1.0/delete-site/{client}/{siteId}`.
   */
  deleteSite(siteId: string): Promise<void>;

  /**
   * Point a wp.cloud site at a new primary domain.
   * Maps to `POST /api/v1.0/update-site-domain/{client}/{id}/{domain}/{keep}`.
   */
  setDomain(siteId: string, domain: string): Promise<void>;

  /**
   * Set the SSL mode for a wp.cloud site.
   * Maps to wp.cloud's site-meta SSL endpoint (key `ssl_mode`).
   */
  setSslMode(siteId: string, mode: 'flexible' | 'strict' | 'off'): Promise<void>;

  /**
   * Trigger an on-demand backup for a site.
   * Maps to `POST /api/v1.0/on-demand-backup/create/{id}/{type}`.
   */
  createBackup(siteId: string): Promise<{ backup_id: string }>;

  /**
   * List all backups for a site.
   * Maps to `GET /api/v1.0/site-backups-list/{client}/{id}`.
   */
  listBackups(siteId: string): Promise<{ backups: WpCloudBackup[] }>;

  /**
   * Run an arbitrary WP-CLI command on a wp.cloud site.
   * Maps to `POST /api/v1.0/task-create/{client}/run-wp-cli-command`.
   * Tasks run async — the response contains a task_id you can poll.
   *
   * Pass either:
   *   - a full string ("plugin install akismet --activate"), or
   *   - an array of pre-tokenized args (["plugin", "install", …]) —
   *     preferred when args may contain whitespace (e.g. URLs).
   */
  runWpCli(siteId: string, command: string | string[]): Promise<{
    task_id: string;
    output?: string;
    status?: number;
    ok?: boolean;
    raw?: unknown;
  }>;

  /**
   * Install / activate / deactivate / delete / unlock a plugin or theme.
   * Maps to `POST /api/v1.0/site-manage-software/{type}/{id}`.
   * `unlock` toggles off the "hosting-managed" flag on plugins that
   * wp.cloud auto-installs (e.g. Jetpack) so the customer can remove
   * them.
   */
  manageSoftware(
    siteId: string,
    action: 'install' | 'activate' | 'deactivate' | 'delete' | 'unlock',
    type: 'plugin' | 'theme',
    slug: string,
  ): Promise<{ task_id: string; status?: number; message?: string }>;

  /**
   * List all wp.cloud sites for the reseller client.
   * Maps to `GET /api/v1.0/get-sites/{client}/+`. Used by admin sync
   * tooling — same upstream call as `listSites()` but returns the raw
   * payload so callers can inspect ID variants (atomic_site_id /
   * wpcom_blog_id / blog_id / domain_name).
   */
  listAllSitesRaw(): Promise<unknown[]>;
}

// ─── Implementation ────────────────────────────────────────

interface WpCloudEnv {
  baseUrl: string;
  apiKey: string;
  client: string;
}

function readEnv(): WpCloudEnv {
  const baseUrl = (process.env.WPCLOUD_BASE_URL ?? DEFAULT_WPCLOUD_BASE_URL).replace(/\/$/, '');
  const apiKey = process.env.WPCLOUD_API_KEY ?? '';
  const client = process.env.WPCLOUD_CLIENT ?? 'envosta';
  if (!apiKey) {
    // Don't throw at module load — let the per-call logger surface
    // the failure when the request actually goes out, so admin
    // tooling can still introspect this file.
    console.warn('[wpcloud] WPCLOUD_API_KEY is not set');
  }
  return { baseUrl, apiKey, client };
}

/**
 * Encode a Record into application/x-www-form-urlencoded. Nested
 * objects use bracket notation (`meta[key]=value`) — matches what
 * supabase/functions/_shared/deps.ts:wpcloudPost does today.
 */
function encodeFormBody(body: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === null) {
      params.append(key, '');
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
        params.append(`${key}[${subKey}]`, String(subValue ?? ''));
      }
    } else if (Array.isArray(value)) {
      for (const item of value) {
        params.append(`${key}[]`, String(item ?? ''));
      }
    } else {
      params.append(key, String(value));
    }
  }
  return params.toString();
}

async function parseResponseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function wpcloudFetch(
  env: WpCloudEnv,
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; body: unknown }> {
  const url = `${env.baseUrl}${path}`;
  const init: RequestInit = {
    method,
    headers: {
      Auth: env.apiKey,
      ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
  };
  if (method === 'POST') {
    init.body = body ? encodeFormBody(body) : '';
  }
  const res = await fetch(url, init);
  const parsed = await parseResponseBody(res);
  if (!res.ok) {
    throw new WpCloudError(
      `wp.cloud ${method} ${path} returned ${res.status}`,
      res.status,
      parsed,
      path,
    );
  }
  return { status: res.status, body: parsed };
}

/**
 * Construct a wp.cloud client bound to current env vars. Env is read
 * at call time (not module load) so per-request env overrides (e.g.
 * a test harness mutating process.env) work as expected.
 */
export function createWpCloudClient(): WpCloudClient {
  const env = readEnv();

  /**
   * Helper: extract the response payload that wp.cloud nests under
   * `.data` for most endpoints. Some endpoints return the payload at
   * the top level; we tolerate both shapes.
   */
  const unwrap = (raw: unknown): any => {
    if (raw && typeof raw === 'object' && 'data' in raw) {
      const d = (raw as { data?: unknown }).data;
      return d ?? raw;
    }
    return raw;
  };

  return {
    async createSite(params) {
      const siteIdentifier = params.siteIdentifier ?? Date.now().toString();
      const path = `/api/v1.0/create-site/${env.client}/${siteIdentifier}`;
      // Default minimal body — callers that need the full surface
      // (admin_user/pass, domain_name, space_quota, meta, …) supply it
      // via `extraBody` and we merge.
      const baseBody: Record<string, unknown> = {
        admin_email: `${params.userId}@envosta-internal.local`,
        php_version: params.phpVersion,
        geo_affinity: params.region,
        db_charset: 'utf8mb4',
        persist_data: {
          envosta_label: params.label,
          envosta_user_id: params.userId,
          envosta_plan: params.planId,
        },
      };
      const requestPayload: Record<string, unknown> = {
        ...baseBody,
        ...(params.extraBody ?? {}),
      };
      // If no domain hint provided, default to demo_domain to match the
      // legacy edge-function behaviour for minimal callers.
      if (!('domain_name' in requestPayload) && !('demo_domain' in requestPayload)) {
        requestPayload.demo_domain = true;
      }

      const raw = await withApiCallLogging<unknown>(
        { provider: 'wpcloud', method: 'POST', path, requestPayload },
        () => wpcloudFetch(env, 'POST', path, requestPayload),
      );

      const data = unwrap(raw) as Record<string, unknown>;
      const siteId =
        String(
          (data?.atomic_site_id as string | number | undefined) ??
            (data?.wpcom_blog_id as string | number | undefined) ??
            (data?.job_id as string | number | undefined) ??
            '',
        );
      if (!siteId) {
        throw new WpCloudError('wp.cloud createSite returned no site_id', 200, data, path);
      }
      return {
        site_id: siteId,
        status: (data?.status as string | undefined) ?? 'provisioning',
        raw: data,
      };
    },

    async ping() {
      const path = `/api/v1.0/get-php-versions/${env.client}/verbose`;
      const raw = await withApiCallLogging<unknown>(
        { provider: 'wpcloud', method: 'GET', path },
        () => wpcloudFetch(env, 'GET', path),
      );
      return unwrap(raw);
    },

    async getSiteIp(siteRef) {
      const path = `/api/v1.0/get-ips/${env.client}/${siteRef}`;
      const raw = await withApiCallLogging<unknown>(
        { provider: 'wpcloud', method: 'GET', path },
        () => wpcloudFetch(env, 'GET', path),
      );
      const data = unwrap(raw) as Record<string, unknown>;
      const ip =
        (data?.ip_address as string | undefined) ??
        (Array.isArray(data?.suggested) ? (data!.suggested as unknown[])[0] as string | undefined : undefined) ??
        (Array.isArray(data?.ipv4) ? (data!.ipv4 as unknown[])[0] as string | undefined : undefined) ??
        null;
      return { ip, raw: data };
    },

    async listAllSitesRaw() {
      const path = `/api/v1.0/get-sites/${env.client}/+`;
      const raw = await withApiCallLogging<unknown>(
        { provider: 'wpcloud', method: 'GET', path },
        () => wpcloudFetch(env, 'GET', path),
      );
      const data = unwrap(raw);
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object') return Object.values(data as Record<string, unknown>);
      return [];
    },

    async getSite(siteId) {
      const path = `/api/v1.0/get-site/${siteId}/extra`;
      const raw = await withApiCallLogging<unknown>(
        { provider: 'wpcloud', method: 'GET', path },
        () => wpcloudFetch(env, 'GET', path),
      );
      return unwrap(raw) as WpCloudSite;
    },

    async listSites(_opts) {
      const path = `/api/v1.0/get-sites/${env.client}/+`;
      const raw = await withApiCallLogging<unknown>(
        { provider: 'wpcloud', method: 'GET', path },
        () => wpcloudFetch(env, 'GET', path),
      );
      const data = unwrap(raw);
      // Atomic returns either an array of sites or an object keyed by id.
      let sites: WpCloudSite[] = [];
      if (Array.isArray(data)) {
        sites = data as WpCloudSite[];
      } else if (data && typeof data === 'object') {
        sites = Object.values(data as Record<string, WpCloudSite>);
      }
      return { sites, total: sites.length };
    },

    async updateSiteMeta(siteId, key, value) {
      const path = `/api/v1.0/site-meta/${siteId}/${encodeURIComponent(key)}/update`;
      const requestPayload = { value };
      await withApiCallLogging<unknown>(
        { provider: 'wpcloud', method: 'POST', path, requestPayload },
        () => wpcloudFetch(env, 'POST', path, requestPayload),
      );
    },

    async deleteSite(siteId) {
      const path = `/api/v1.0/delete-site/${env.client}/${siteId}`;
      await withApiCallLogging<unknown>(
        { provider: 'wpcloud', method: 'POST', path },
        () => wpcloudFetch(env, 'POST', path),
      );
    },

    async setDomain(siteId, domain) {
      // `keep=1` keeps the old domain attached as a redirect (matches
      // what site-info/index.ts does today).
      const path = `/api/v1.0/update-site-domain/${env.client}/${siteId}/${encodeURIComponent(domain)}/1`;
      await withApiCallLogging<unknown>(
        { provider: 'wpcloud', method: 'POST', path },
        () => wpcloudFetch(env, 'POST', path),
      );
    },

    async setSslMode(siteId, mode) {
      // wp.cloud exposes SSL mode via site-meta (key=ssl_mode). Values
      // 'flexible' / 'strict' / 'off' match the Atomic SSL config.
      const path = `/api/v1.0/site-meta/${siteId}/ssl_mode/update`;
      const requestPayload = { value: mode };
      await withApiCallLogging<unknown>(
        { provider: 'wpcloud', method: 'POST', path, requestPayload },
        () => wpcloudFetch(env, 'POST', path, requestPayload),
      );
    },

    async createBackup(siteId) {
      // The Atomic on-demand backup endpoint takes a backup `type` —
      // `on_demand` is the default; pass it explicitly for clarity.
      const path = `/api/v1.0/on-demand-backup/create/${siteId}/on_demand`;
      const raw = await withApiCallLogging<unknown>(
        { provider: 'wpcloud', method: 'POST', path },
        () => wpcloudFetch(env, 'POST', path),
      );
      const data = unwrap(raw) as Record<string, unknown>;
      const backupId =
        String(
          (data?.backup_id as string | undefined) ??
            (data?.id as string | undefined) ??
            (data?.task_id as string | undefined) ??
            '',
        );
      return { backup_id: backupId };
    },

    async listBackups(siteId) {
      const path = `/api/v1.0/site-backups-list/${env.client}/${siteId}`;
      const raw = await withApiCallLogging<unknown>(
        { provider: 'wpcloud', method: 'GET', path },
        () => wpcloudFetch(env, 'GET', path),
      );
      const data = unwrap(raw);
      let backups: WpCloudBackup[] = [];
      if (Array.isArray(data)) {
        backups = data as WpCloudBackup[];
      } else if (data && typeof data === 'object' && Array.isArray((data as any).backups)) {
        backups = (data as any).backups;
      } else if (data && typeof data === 'object') {
        backups = Object.values(data as Record<string, WpCloudBackup>);
      }
      return { backups };
    },

    async runWpCli(siteId, command) {
      const path = `/api/v1.0/task-create/${env.client}/run-wp-cli-command`;
      // `command` is either a full WP-CLI arg string
      // ("plugin install akismet --activate") or a pre-tokenized array
      // (preferred — preserves whitespace inside args, e.g. URLs).
      const args = Array.isArray(command) ? command.filter(Boolean) : command.split(/\s+/).filter(Boolean);
      const requestPayload: Record<string, unknown> = {
        site_ids: [siteId],
        args,
      };
      const raw = await withApiCallLogging<unknown>(
        { provider: 'wpcloud', method: 'POST', path, requestPayload },
        () => wpcloudFetch(env, 'POST', path, requestPayload),
      );
      const data = unwrap(raw) as Record<string, unknown>;
      return {
        task_id: String(
          (data?.task_id as string | undefined) ??
            (data?.atomic_task_id as string | undefined) ??
            '',
        ),
        output: data?.output as string | undefined,
        status: 200,
        ok: true,
        raw: data,
      };
    },

    async manageSoftware(siteId, action, type, slug) {
      const path = `/api/v1.0/site-manage-software/${type}/${siteId}`;
      // wp.cloud's API uses "remove" for delete; map for ergonomics.
      // `unlock` is passed through verbatim — it removes the
      // hosting-managed flag from a pre-installed plugin (Jetpack /
      // Akismet) so users can deactivate/delete it.
      const upstreamAction = action === 'delete' ? 'remove' : action;
      const requestPayload: Record<string, unknown> = {
        action: upstreamAction,
        slug,
      };
      const raw = await withApiCallLogging<unknown>(
        { provider: 'wpcloud', method: 'POST', path, requestPayload },
        () => wpcloudFetch(env, 'POST', path, requestPayload),
      );
      const data = unwrap(raw) as Record<string, unknown>;
      return {
        task_id: String(
          (data?.task_id as string | undefined) ??
            (data?.atomic_task_id as string | undefined) ??
            '',
        ),
        status: (data?.status as number | undefined) ?? 200,
        message: data?.message as string | undefined,
      };
    },
  };
}
