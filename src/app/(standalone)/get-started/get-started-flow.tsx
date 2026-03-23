'use client';

import { useSearchParams } from 'next/navigation';
import { SiteCheckoutFlow } from '@/components/checkout/site-checkout-flow';

export function GetStartedFlow() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan')?.toLowerCase() ?? undefined;
  const domain = searchParams.get('domain') ?? undefined;

  return (
    <div style={{ paddingTop: 100, paddingBottom: 80, minHeight: '100vh' }}>
      <div className="c" style={{ maxWidth: 960, margin: '0 auto' }}>
        <SiteCheckoutFlow mode="public" initialPlan={plan} initialDomain={domain} />
      </div>
    </div>
  );
}
