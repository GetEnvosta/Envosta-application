/**
 * Outbound API-call logger. Wraps a fetch-style call so every request
 * to wp.cloud / OpenSRS / Stripe / Resend is recorded in the
 * api_calls table along with its timing, request payload, response, and
 * any error. Used by integration wrappers in Phases 3+.
 *
 * The api_calls table has RLS enabled but no client policies — only
 * service-role can insert. This file constructs a service-role client
 * inline per the convention in src/lib/supabase-server.ts.
 */
import { createClient } from '@supabase/supabase-js';

export type ApiProvider = 'stripe' | 'wpcloud' | 'opensrs' | 'resend';

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
 * outbound call you want recorded automatically. The callback should
 * perform the upstream call and return `{ status, body }` where
 * `status` is the HTTP status and `body` is the parsed response.
 *
 * The wrapper records duration + status + body into `api_calls`,
 * then returns the `body` cast to `T`. Errors thrown inside `fn`
 * are recorded with the `error` column populated and re-thrown.
 *
 * Used by src/lib/integrations/{wpcloud,opensrs}.ts to log every
 * outbound call to the api_calls table without each call site
 * repeating boilerplate.
 */
export async function withApiCallLogging<T = unknown>(
  meta: Omit<ApiCallLogParams, 'durationMs' | 'responseStatus' | 'responsePayload' | 'error'>,
  fn: () => Promise<{ status: number; body: unknown }>,
): Promise<T> {
  const start = Date.now();
  try {
    const { status, body } = await fn();
    const durationMs = Date.now() - start;
    await recordApiCall({
      ...meta,
      durationMs,
      responseStatus: status,
      responsePayload: body,
    });
    return body as T;
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
