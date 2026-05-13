/**
 * Outbound API-call logger. Wraps a fetch-style call so every request
 * to wp.cloud / OpenSRS / Stripe / Jetpack / Resend is recorded in the
 * api_calls table along with its timing, request payload, response, and
 * any error. Used by integration wrappers in Phases 3+.
 *
 * The api_calls table has RLS enabled but no client policies — only
 * service-role can insert. This file constructs a service-role client
 * inline per the convention in src/lib/supabase-server.ts.
 */
import { createClient } from '@supabase/supabase-js';

export type ApiProvider = 'stripe' | 'wpcloud' | 'opensrs' | 'jetpack' | 'resend';

export interface ApiCallLogParams {
  provider: ApiProvider;
  method: string;
  path: string;
  requestPayload?: unknown;
  responseStatus?: number;
  responsePayload?: unknown;
  durationMs?: number;
  error?: unknown;
  jobId?: string;
}

export async function recordApiCall(params: ApiCallLogParams): Promise<void> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } }
  );

  const { error } = await sb.from('api_calls').insert({
    provider: params.provider,
    method: params.method.toUpperCase(),
    path: params.path,
    request_payload: params.requestPayload ?? null,
    response_status: params.responseStatus ?? null,
    response_payload: params.responsePayload ?? null,
    duration_ms: params.durationMs ?? null,
    error: params.error ?? null,
    job_id: params.jobId ?? null,
  });

  if (error) {
    // Never throw from logging — fall back to console so callers don't
    // need to wrap recordApiCall in try/catch.
    console.error('recordApiCall failed', { provider: params.provider, path: params.path, error });
  }
}

/**
 * Convenience wrapper: time + log + propagate. Use this around an
 * outbound call you want recorded automatically.
 *
 * Phase 3+ will swap inline fetch calls (in src/app/api/**) and
 * supabase/functions/_shared/{deps,opensrs,jetpack}.ts) to use this
 * wrapper so the api_calls table fills up automatically.
 */
export async function withApiCallLogging<T>(
  meta: Omit<ApiCallLogParams, 'durationMs' | 'responseStatus' | 'responsePayload' | 'error'>,
  fn: () => Promise<{ data: T; status?: number; payload?: unknown }>,
): Promise<T> {
  const start = Date.now();
  try {
    const { data, status, payload } = await fn();
    const durationMs = Date.now() - start;
    await recordApiCall({
      ...meta,
      durationMs,
      responseStatus: status,
      responsePayload: payload,
    });
    return data;
  } catch (err) {
    const durationMs = Date.now() - start;
    await recordApiCall({
      ...meta,
      durationMs,
      error: err instanceof Error ? { message: err.message, name: err.name } : { value: String(err) },
    });
    throw err;
  }
}
