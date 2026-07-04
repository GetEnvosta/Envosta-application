/**
 * Legacy redirect — promotions / coupons now live under Settings.
 */
import { redirect } from 'next/navigation';

export default function LegacyPromotionsRedirect() {
  redirect('/admin/settings/promotions');
}
