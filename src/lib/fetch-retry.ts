/** Fetch with basic retry + exponential backoff for transient failures. */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  { retries = 2, baseDelay = 1000 } = {},
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(input, init);

      // Only retry on 5xx or 429 (rate limit) — not on 4xx auth/validation errors
      if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 429)) {
        return res;
      }

      // Retryable server error
      if (attempt < retries) {
        const delay = baseDelay * Math.pow(2, attempt); // 1s, 2s
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      return res; // final attempt — return whatever we got
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw lastError ?? new Error('Fetch failed after retries');
}
