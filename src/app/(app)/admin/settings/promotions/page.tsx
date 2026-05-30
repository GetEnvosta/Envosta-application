/**
 * Settings → Promotions. Coupon / discount-code management.
 * Moved out of the Health page (it's config, not observability).
 */
export const dynamic = 'force-dynamic';

import { CouponManager } from '@/components/admin/coupon-manager';

export default function SettingsPromotionsPage() {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900">Promotions</h2>
        <p className="text-xs text-gray-500 mt-0.5">Create and manage coupon / discount codes.</p>
      </div>
      <CouponManager />
    </div>
  );
}
