'use client';

import { useSearchParams } from 'next/navigation';
import { SiteCheckoutFlow } from '@/components/checkout/site-checkout-flow';

export function GetStartedFlow() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan')?.toLowerCase() ?? undefined;
  const domain = searchParams.get('domain') ?? undefined;
  const billing = (searchParams.get('billing') === 'annual' ? 'annual' : 'monthly') as 'monthly' | 'annual';
  const promo = searchParams.get('promo') ?? undefined;

  // No plan param = free trial mode (auto Minimum, temp domain, 14-day trial)
  const isTrial = !plan;

  return (
    <div style={{ paddingTop: 100, paddingBottom: 80, minHeight: '100vh' }}>
      <div className="c" style={{ maxWidth: 960, margin: '0 auto' }}>
        {isTrial && (
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <span style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 20, background: 'rgba(34,197,94,.12)', color: '#22c55e', fontSize: '.8rem', fontWeight: 600, letterSpacing: '.3px' }}>
              14-day free trial
            </span>
            <p style={{ fontSize: '.9rem', color: 'rgba(255,255,255,.5)', marginTop: 10, fontWeight: 300 }}>
              Try Envosta free for 14 days. No charge until your trial ends.
            </p>
          </div>
        )}
        <SiteCheckoutFlow mode="public" initialPlan={plan} initialDomain={domain} initialBilling={billing} isTrial={isTrial} promoCode={promo} />
      </div>
    </div>
  );
}
