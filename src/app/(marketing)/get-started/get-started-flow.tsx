'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { SiteCheckoutFlow } from '@/components/checkout/site-checkout-flow';

export function GetStartedFlow() {
  const searchParams = useSearchParams();
  const [checking, setChecking] = useState(true);

  // If already logged in, redirect to dashboard add-site
  // This is a public signup page — if they're here, they want a new account
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        // Sign out first so the new signup doesn't conflict with existing session
        supabase.auth.signOut().then(() => {
          setChecking(false);
        });
      } else {
        setChecking(false);
      }
    });
  }, []);
  const planParam = searchParams.get('plan')?.toLowerCase() ?? undefined;
  const billing = (searchParams.get('billing') === 'annual' ? 'annual' : 'monthly') as 'monthly' | 'annual';
  const promo = searchParams.get('promo') ?? undefined;

  // plan=choose means "show plan picker" (no pre-selection)
  const needsPlanChoice = planParam === 'choose';
  // Trial only when no plan param at all (generic "Get Started" clicks)
  const isTrial = !planParam;
  // Don't pre-select a plan if they need to choose
  const effectivePlan = needsPlanChoice ? undefined : planParam;

  if (checking) return <div style={{ minHeight: '100vh' }} />;

  return (
    <div style={{ paddingTop: 100, paddingBottom: 80, minHeight: '100vh' }}>
      <div className="c" style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          {isTrial ? (
            <>
              <h1 style={{ fontFamily: "'Inter',sans-serif", fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 600, letterSpacing: '-1px', lineHeight: 1.1, color: '#fff', marginBottom: 12 }}>
                Start your free trial
              </h1>
              <p style={{ fontSize: '.95rem', color: 'rgba(255,255,255,.45)', fontWeight: 300, maxWidth: 420, margin: '0 auto 16px' }}>
                14 days free on any plan you pick. We&apos;ll set up a temporary domain for you instantly.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
                {['Free for 14 days', 'Instant setup', 'Cancel anytime'].map(text => (
                  <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <span style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.4)' }}>{text}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <h1 style={{ fontFamily: "'Inter',sans-serif", fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 600, letterSpacing: '-1px', lineHeight: 1.1, color: '#fff', marginBottom: 12 }}>
                Get started{planParam ? ` with ${planParam.charAt(0).toUpperCase() + planParam.slice(1)}` : ''}
              </h1>
              <p style={{ fontSize: '.95rem', color: 'rgba(255,255,255,.45)', fontWeight: 300, maxWidth: 420, margin: '0 auto' }}>
                Create your account and we&apos;ll set up your WordPress site instantly.
              </p>
            </>
          )}
        </div>
        <SiteCheckoutFlow
          mode="public"
          initialPlan={effectivePlan}
          initialBilling={billing}
          isTrial={isTrial}
          promoCode={promo}
        />
      </div>
    </div>
  );
}
