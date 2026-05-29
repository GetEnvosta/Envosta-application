/**
 * USD → CAD exchange-rate helper.
 *
 * Uses the free Frankfurter API (ECB reference rates, no API key required).
 * If the fetch fails we fall back to FALLBACK_USD_CAD so callers always get a
 * usable number — but the returned `source` is `'fallback'` so the UI can warn
 * that a stale rate would be baked into prices. Pricing flows should let the
 * admin review/override the rate before writing anything.
 *
 * The rate is intentionally NOT cached: each price-sync preview should read a
 * fresh rate, and the admin sees exactly which rate (and source) was used.
 */
const FRANKFURTER_URL = 'https://api.frankfurter.app/latest?from=USD&to=CAD';

/** Sane fallback if the FX API is unreachable. Surface `source: 'fallback'`. */
const FALLBACK_USD_CAD = 1.38;

export interface UsdCadRate {
  /** USD → CAD multiplier, e.g. 1.3712 (1 USD = 1.3712 CAD). */
  rate: number;
  source: 'frankfurter' | 'fallback';
  fetchedAt: string;
}

export async function getUsdToCadRate(): Promise<UsdCadRate> {
  try {
    const res = await fetch(FRANKFURTER_URL, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      const rate = Number(data?.rates?.CAD);
      if (Number.isFinite(rate) && rate > 0) {
        return { rate, source: 'frankfurter', fetchedAt: new Date().toISOString() };
      }
    }
  } catch {
    // network/timeout/parse error → fall through to fallback
  }
  return { rate: FALLBACK_USD_CAD, source: 'fallback', fetchedAt: new Date().toISOString() };
}
