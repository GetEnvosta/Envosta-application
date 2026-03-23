'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { SiteCheckoutFlow } from '@/components/checkout/site-checkout-flow';

export function GetStartedFlow() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = searchParams.get('plan')?.toLowerCase() ?? undefined;
  const domain = searchParams.get('domain') ?? undefined;
  const [checking, setChecking] = useState(true);

  // If already logged in, redirect to dashboard add-site with params preserved
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const params = new URLSearchParams();
        if (plan) params.set('plan', plan);
        if (domain) params.set('domain', domain);
        const qs = params.toString();
        router.replace(`/dashboard/add-site${qs ? `?${qs}` : ''}`);
      } else {
        setChecking(false);
      }
    });
  }, [plan, domain, router]);

  if (checking) {
    return <div style={{ paddingTop: 200, textAlign: 'center', color: 'var(--t3)', fontSize: '.9rem' }}>Loading...</div>;
  }

  return (
    <div style={{ paddingTop: 100, paddingBottom: 80, minHeight: '100vh' }}>
      <div className="c" style={{ maxWidth: 960, margin: '0 auto' }}>
        <SiteCheckoutFlow mode="public" initialPlan={plan} initialDomain={domain} />
      </div>
    </div>
  );
}
