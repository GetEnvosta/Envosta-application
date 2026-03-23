'use client';

import { SiteCheckoutFlow } from '@/components/checkout/site-checkout-flow';

export default function AddSitePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Add a Site</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Choose a plan, set up your domain, and check out.
        </p>
      </div>
      <SiteCheckoutFlow mode="dashboard" />
    </div>
  );
}
