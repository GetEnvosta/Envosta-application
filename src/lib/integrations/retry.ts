/**
 * Generic retry-with-exponential-backoff for integration calls.
 *
 * Retries on errors where `error.retryable === true` OR network errors.
 * Default policy: 3 attempts, base delay 1000ms, factor 2 (1s, 2s, 4s).
 * Adds ±25% jitter to delays to avoid thundering herd on retries.
 */
import { IntegrationError, TimeoutIntegrationError } from './errors';

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  factor: number;
  timeoutMs?: number;
}

const DEFAULT_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  factor: 2,
};

function jitter(ms: number): number {
  return Math.round(ms * (0.75 + Math.random() * 0.5));
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  policy: Partial<RetryPolicy> = {},
): Promise<T> {
  const p = { ...DEFAULT_POLICY, ...policy };
  let lastErr: unknown;
  for (let attempt = 1; attempt <= p.maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      const retryable =
        (err instanceof IntegrationError && err.retryable)
          || err instanceof TimeoutIntegrationError
          || (err instanceof Error && /ECONNRESET|ETIMEDOUT|ENOTFOUND|fetch failed/i.test(err.message));
      if (!retryable || attempt === p.maxAttempts) throw err;
      const delay = jitter(p.baseDelayMs * Math.pow(p.factor, attempt - 1));
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

/**
 * Wrap a fetch promise with a hard timeout. If the timeout fires before
 * the fetch resolves, throws TimeoutIntegrationError (which is retryable).
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  opts: { timeoutMs?: number; provider: 'wpcloud' | 'opensrs' | 'stripe' | 'resend'; path?: string },
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 30000);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new TimeoutIntegrationError(`${opts.provider} ${opts.path ?? url} timed out after ${opts.timeoutMs ?? 30000}ms`, opts.provider, opts.path);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
