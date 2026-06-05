/**
 * Reseller flat discount.
 *
 * In the per-site subscription model a "reseller" is NOT a special plan
 * tier — it's a flag on the user (users.metadata.reseller === true). A
 * flagged reseller gets a flat platform discount applied to EVERY per-site
 * subscription they own (any plan), via a single forever Stripe coupon.
 *
 * This replaces the old standalone "Reseller" hosting plan: resellers now
 * run normal plans at a discount instead of a bespoke tier.
 *
 * The discount percent is configurable via RESELLER_DISCOUNT_PERCENT
 * (default 50). The coupon id encodes the percent so changing it creates a
 * fresh coupon rather than silently mutating existing discounts.
 */
import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Flat % off applied to every subscription a reseller owns (default 50). */
export const RESELLER_DISCOUNT_PERCENT = (() => {
  const n = Number(process.env.RESELLER_DISCOUNT_PERCENT);
  return Number.isFinite(n) && n > 0 && n < 100 ? Math.round(n) : 50;
})();

/** True if the user row is flagged as a reseller. */
export function isResellerUser(userRow: any): boolean {
  if (!userRow) return false;
  // Support a future dedicated column without breaking the metadata flag.
  if (userRow.is_reseller === true) return true;
  const meta = (userRow.metadata as any) ?? {};
  return meta.reseller === true;
}

/**
 * Get-or-create the platform's reseller coupon — {percent}% off, forever.
 * Deterministic id so all reseller subscriptions share one coupon.
 */
export async function getResellerCouponId(stripe: Stripe): Promise<string> {
  const couponId = `envosta-reseller-${RESELLER_DISCOUNT_PERCENT}pct`;
  try {
    const existing = await stripe.coupons.retrieve(couponId);
    if (existing && !(existing as any).deleted) return existing.id;
  } catch {
    // Not found — create it below.
  }
  const created = await stripe.coupons.create({
    id: couponId,
    percent_off: RESELLER_DISCOUNT_PERCENT,
    duration: 'forever',
    name: `Reseller ${RESELLER_DISCOUNT_PERCENT}% off`,
    metadata: { envosta_reseller: 'true' },
  });
  return created.id;
}

/**
 * Resolve the reseller coupon id for a user, or null if they aren't a
 * reseller. Best-effort — never throws into the caller's billing path, so
 * a Stripe/coupon hiccup degrades to "no discount" rather than a failed
 * subscription create.
 */
export async function resellerCouponForUser(
  sb: SupabaseClient,
  stripe: Stripe,
  userId: string,
): Promise<string | null> {
  try {
    const { data: u } = await sb.from('users').select('metadata').eq('id', userId).maybeSingle();
    if (!isResellerUser(u)) return null;
    return await getResellerCouponId(stripe);
  } catch (e) {
    console.error('resellerCouponForUser failed (non-fatal):', e);
    return null;
  }
}
