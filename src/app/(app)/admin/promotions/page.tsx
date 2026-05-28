/**
 * Legacy redirect — promotions / coupons are a tab inside the Health
 * (formerly System) page. The standalone page was just a thin wrapper
 * around <CouponManager />.
 */
import { redirect } from 'next/navigation';

export default function LegacyPromotionsRedirect() {
  redirect('/admin/diagnostics?view=promotions');
}
