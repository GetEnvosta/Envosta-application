'use client';

import { useSearchParams } from 'next/navigation';
import { SiteCheckoutFlow } from '@/components/checkout/site-checkout-flow';

export function GetStartedFlow() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan')?.toLowerCase() ?? undefined;
  const domain = searchParams.get('domain') ?? undefined;
  const billing = (searchParams.get('billing') === 'annual' ? 'annual' : 'monthly') as 'monthly' | 'annual';
  const promo = searchParams.get('promo') ?? undefined;

  return (
    <div style={{ paddingTop: 100, paddingBottom: 80, minHeight: '100vh' }}>
      <div className="c" style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontFamily: "'Inter',sans-serif", fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 600, letterSpacing: '-1px', lineHeight: 1.1, color: '#fff', marginBottom: 12 }}>
            Start your free trial
          </h1>
          <p style={{ fontSize: '.95rem', color: 'rgba(255,255,255,.45)', fontWeight: 300, maxWidth: 420, margin: '0 auto 16px' }}>
            14 days free on any plan. No charge until your trial ends. Cancel anytime.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.4)' }}>No credit card until checkout</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.4)' }}>Full features during trial</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.4)' }}>Cancel anytime</span>
            </div>
          </div>
        </div>
        <SiteCheckoutFlow
          mode="public"
          initialPlan={plan}
          initialDomain={domain}
          initialBilling={billing}
          isTrial={true}
          promoCode={promo}
        />
      </div>
    </div>
  );
}
