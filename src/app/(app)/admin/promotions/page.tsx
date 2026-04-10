import { CouponManager } from '@/components/admin/coupon-manager';

export default function PromotionsPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Promotions</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage discount codes. Share links that auto-apply at checkout.</p>
        </div>
      </div>

      <div className="card p-5 mb-6 bg-indigo-50 border-indigo-200">
        <p className="text-sm text-indigo-800">
          <strong>How it works:</strong> Create a promo code below, then share the link (e.g. <code className="bg-indigo-100 px-1.5 py-0.5 rounded text-xs font-mono">envosta.com/get-started?promo=WELCOME20</code>). The discount is applied automatically at Stripe checkout — no code entry needed.
        </p>
      </div>

      <CouponManager />
    </div>
  );
}
