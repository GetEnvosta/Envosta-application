'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { SiteCheckoutFlow } from '@/components/checkout/site-checkout-flow';

function AddSiteContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan')?.toLowerCase() ?? undefined;
  const domain = searchParams.get('domain') ?? undefined;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Add a Site</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Choose a plan, set up your domain, and check out.
        </p>
      </div>
      <SiteCheckoutFlow mode="dashboard" initialPlan={plan} initialDomain={domain} />
    </div>
  );
}

export default function AddSitePage() {
  return (
    <Suspense>
      <AddSiteContent />
    </Suspense>
  );
}
