'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import {
  ArrowRight, ArrowLeft, Globe, Sparkles, Check, Search,
  Loader2, ChevronRight, LayoutGrid, CreditCard, User, Calendar,
} from 'lucide-react';

/* ── Types ── */
interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  stripe_price_id_monthly: string;
  price_monthly: number;
  storage_gb: number;
  features: string[];
  onboarding_type: string;
  sort_order: number;
}

interface Props {
  /** 'public' = marketing signup (shows account step), 'dashboard' = logged-in user */
  mode: 'public' | 'dashboard';
  /** Pre-select a plan slug from URL params */
  initialPlan?: string;
}

/* ── Component ── */
export function SiteCheckoutFlow({ mode, initialPlan }: Props) {
  const supabase = createClient();

  /* State */
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Account (public mode only)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [hasAccount, setHasAccount] = useState<boolean | null>(null);

  // Plan
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  // Domain
  const [domainMode, setDomainMode] = useState<'new' | 'existing' | 'temp' | null>(null);
  const [domainQuery, setDomainQuery] = useState('');
  const [domainChecking, setDomainChecking] = useState(false);
  const [domainResult, setDomainResult] = useState<{ domain: string; available: boolean } | null>(null);
  const [domainError, setDomainError] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const domainRef = useRef<HTMLInputElement>(null);

  // Checkout
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Onboarding
  const [onboardingChoice, setOnboardingChoice] = useState<'self' | 'guided' | null>(null);

  // Steps
  const publicSteps = ['Account', 'Plan', 'Domain', 'Checkout'];
  const dashboardSteps = ['Plan', 'Domain', 'Checkout'];
  const steps = mode === 'public' ? publicSteps : dashboardSteps;
  const [step, setStep] = useState(1);

  /* Fetch plans */
  useEffect(() => {
    async function fetchPlans() {
      const { data } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      const allPlans = (data as Plan[]) ?? [];
      setPlans(allPlans);

      if (initialPlan) {
        const match = allPlans.find(p => p.slug === initialPlan);
        if (match) {
          setSelectedPlan(match);
          setStep(mode === 'public' ? 1 : 2); // Skip to domain if plan pre-selected in dashboard
        }
      }
      setLoading(false);
    }
    fetchPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Domain check */
  async function checkDomain() {
    const raw = domainQuery.trim().toLowerCase();
    if (!raw) return;
    const domain = raw.includes('.') ? raw : `${raw}.com`;

    setDomainChecking(true);
    setDomainResult(null);
    setDomainError('');

    try {
      const res = await fetch('/api/domain-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (res.ok) {
        setDomainResult({ domain, available: data.available });
      } else {
        setDomainError(data.error ?? 'Could not check availability');
      }
    } catch {
      setDomainError('Connection error. Please try again.');
    }
    setDomainChecking(false);
  }

  /* Checkout */
  async function handleCheckout() {
    if (!selectedPlan) return;
    setCheckoutLoading(true);
    setCheckoutError('');

    try {
      if (mode === 'public') {
        // Public: create account + checkout via API route
        const res = await fetch('/api/signup-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name, email, phone,
            plan: selectedPlan.slug,
            domain: selectedDomain || undefined,
            situation: domainMode === 'existing' ? 'existing' : 'new',
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setCheckoutError(data.error ?? 'Something went wrong');
          setCheckoutLoading(false);
          return;
        }
        if (data.url) { window.location.href = data.url; return; }
        if (data.redirect) { window.location.href = data.redirect; return; }
      } else {
        // Dashboard: use authenticated Stripe checkout
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setCheckoutError('Please log in first');
          setCheckoutLoading(false);
          return;
        }
        const body: Record<string, unknown> = {
          priceId: selectedPlan.stripe_price_id_monthly,
        };
        if (selectedDomain) {
          body.domainName = selectedDomain;
        }
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-checkout`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            },
            body: JSON.stringify(body),
          },
        );
        const data = await res.json();
        if (!res.ok || !data?.url) {
          setCheckoutError(data?.error ?? 'Checkout failed');
          setCheckoutLoading(false);
          return;
        }
        window.location.href = data.url;
      }
    } catch {
      setCheckoutError('Something went wrong. Please try again.');
      setCheckoutLoading(false);
    }
  }

  /* Step helpers */
  const planStepNum = mode === 'public' ? 2 : 1;
  const domainStepNum = mode === 'public' ? 3 : 2;
  const checkoutStepNum = mode === 'public' ? 4 : 3;

  function goToDomain() { setStep(domainStepNum); }
  function goToCheckout() { setStep(checkoutStepNum); }

  const inputStyle = {
    width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,.06)',
    border: '1px solid var(--bdr2)', borderRadius: 10, color: 'var(--t1)', fontSize: '.9rem',
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <Loader2 style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', color: 'var(--t3)' }} />
      </div>
    );
  }

  return (
    <div>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .scf-plans{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;max-width:900px;margin:0 auto}
        @media(max-width:768px){.scf-plans{grid-template-columns:1fr;max-width:400px}}
      `}</style>

      {/* ── Progress bar ── */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 40 }}>
        {steps.map((s, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {i > 0 && <ChevronRight style={{ width: 14, height: 14, color: 'var(--t3)', opacity: .4 }} />}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                color: active ? 'var(--t1)' : done ? 'var(--gold)' : 'var(--t3)',
                fontSize: '.82rem', fontWeight: active ? 500 : 400,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '.7rem', fontWeight: 600,
                  background: active ? '#2563EB' : done ? 'rgba(34,197,94,.15)' : 'rgba(255,255,255,.08)',
                  color: active ? '#fff' : done ? '#22c55e' : 'var(--t3)',
                }}>
                  {done ? <Check style={{ width: 12, height: 12 }} /> : n}
                </div>
                <span style={{ display: 'none' }} className="sm-show">{s}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════
          STEP: ACCOUNT (public mode only)
         ════════════════════════════════════════════ */}
      {mode === 'public' && step === 1 && (
        <div style={{ textAlign: 'center', maxWidth: 440, margin: '0 auto' }}>
          {hasAccount === null && (
            <>
              <h2 style={{ fontSize: 'clamp(1.4rem,3vw,1.8rem)', fontWeight: 400, letterSpacing: '-.5px', marginBottom: 12, color: 'var(--t1)' }}>
                Welcome to Envosta
              </h2>
              <p style={{ color: 'var(--t2)', marginBottom: 32, fontSize: '.92rem' }}>
                Do you already have an account?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <a
                  href="https://my.envosta.com/auth/login?redirect=/dashboard/add-site"
                  style={{
                    padding: '14px 24px', background: 'rgba(255,255,255,.06)', border: '1px solid var(--bdr2)',
                    borderRadius: 12, color: 'var(--t1)', fontSize: '.9rem', fontWeight: 500, textDecoration: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'border-color .2s',
                  }}
                >
                  <User style={{ width: 18, height: 18 }} /> I have an account — Sign in
                </a>
                <button
                  onClick={() => setHasAccount(false)}
                  style={{
                    padding: '14px 24px', background: '#fff', color: '#03060e', borderRadius: 12, border: 'none',
                    fontSize: '.9rem', fontWeight: 500, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <Sparkles style={{ width: 18, height: 18 }} /> Create an account
                </button>
              </div>
            </>
          )}

          {hasAccount === false && (
            <>
              <button onClick={() => setHasAccount(null)} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', marginBottom: 20, fontSize: '.82rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <ArrowLeft style={{ width: 14, height: 14 }} /> Back
              </button>
              <h2 style={{ fontSize: 'clamp(1.4rem,3vw,1.8rem)', fontWeight: 400, letterSpacing: '-.5px', marginBottom: 12, color: 'var(--t1)' }}>
                Create your account
              </h2>
              <p style={{ color: 'var(--t2)', marginBottom: 28, fontSize: '.92rem' }}>
                Just the basics — we&apos;ll handle the rest during onboarding.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' }}>
                <div>
                  <label style={{ fontSize: '.78rem', color: 'var(--t2)', marginBottom: 6, display: 'block' }}>Full Name *</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '.78rem', color: 'var(--t2)', marginBottom: 6, display: 'block' }}>Email *</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@business.com" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '.78rem', color: 'var(--t2)', marginBottom: 6, display: 'block' }}>Phone <span style={{ color: 'var(--t3)' }}>(optional)</span></label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 123-4567" style={inputStyle} />
                </div>
                <button
                  onClick={() => { if (name && email) setStep(2); }}
                  disabled={!name || !email}
                  style={{
                    padding: '14px 24px', background: '#fff', color: '#03060e', borderRadius: 100, border: 'none',
                    fontSize: '.88rem', fontWeight: 500, cursor: 'pointer', marginTop: 8,
                    opacity: (!name || !email) ? 0.5 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  Choose a Plan <ArrowRight style={{ width: 16, height: 16 }} />
                </button>
              </div>
              <p style={{ fontSize: '.7rem', color: 'var(--t3)', marginTop: 16, lineHeight: 1.6 }}>
                By continuing you agree to our <a href="/legal/terms" style={{ color: 'var(--t2)', textDecoration: 'underline' }}>Terms</a> and <a href="/legal/privacy" style={{ color: 'var(--t2)', textDecoration: 'underline' }}>Privacy Policy</a>.
              </p>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════
          STEP: CHOOSE PLAN
         ════════════════════════════════════════════ */}
      {step === planStepNum && (
        <div>
          {mode === 'public' && (
            <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', marginBottom: 16, fontSize: '.82rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ArrowLeft style={{ width: 14, height: 14 }} /> Back
            </button>
          )}
          <h2 style={{ fontSize: 'clamp(1.4rem,3vw,1.8rem)', fontWeight: 400, letterSpacing: '-.5px', marginBottom: 8, color: 'var(--t1)', textAlign: 'center' }}>
            Choose your plan
          </h2>
          <p style={{ color: 'var(--t2)', marginBottom: 32, fontSize: '.92rem', textAlign: 'center' }}>
            All plans include onboarding, SSL, CDN, daily backups, and staging.
          </p>

          <div className="scf-plans">
            {plans.map(plan => {
              const isPopular = plan.slug === 'growth';
              const isSelected = selectedPlan?.id === plan.id;
              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  style={{
                    background: isSelected ? 'rgba(37,99,235,.06)' : 'rgba(255,255,255,.03)',
                    border: `2px solid ${isSelected ? '#2563EB' : isPopular ? 'rgba(37,99,235,.2)' : 'rgba(255,255,255,.08)'}`,
                    borderRadius: 18, padding: '28px 24px', cursor: 'pointer', transition: 'all .2s',
                    position: 'relative', display: 'flex', flexDirection: 'column', textAlign: 'left',
                  }}
                >
                  {isPopular && (
                    <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: '#2563EB', color: '#fff', fontSize: '.6rem', fontWeight: 600, padding: '3px 12px', borderRadius: 100, letterSpacing: '.5px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      Most Popular
                    </div>
                  )}
                  <div style={{ fontSize: '.66rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '2px', color: '#2563EB', marginBottom: 6 }}>{plan.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                    <span style={{ fontSize: '2rem', fontWeight: 600, color: '#fff', letterSpacing: '-1px' }}>${(plan.price_monthly / 100).toFixed(0)}</span>
                    <span style={{ fontSize: '.8rem', color: 'var(--t3)', fontWeight: 300 }}>/mo</span>
                  </div>
                  <p style={{ fontSize: '.78rem', color: 'var(--t3)', lineHeight: 1.6, fontWeight: 300, marginBottom: 16 }}>{plan.description}</p>
                  <div style={{ flex: 1 }}>
                    {(plan.features as string[]).slice(0, 6).map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                        <Check style={{ width: 13, height: 13, color: '#22c55e', flexShrink: 0 }} />
                        <span style={{ fontSize: '.76rem', color: 'var(--t2)', fontWeight: 300 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <button
              onClick={goToDomain}
              disabled={!selectedPlan}
              style={{
                padding: '14px 32px', background: '#fff', color: '#03060e', borderRadius: 100, border: 'none',
                fontSize: '.88rem', fontWeight: 500, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                opacity: selectedPlan ? 1 : 0.4,
              }}
            >
              Continue <ArrowRight style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          STEP: DOMAIN
         ════════════════════════════════════════════ */}
      {step === domainStepNum && (
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <button onClick={() => setStep(planStepNum)} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', marginBottom: 16, fontSize: '.82rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ArrowLeft style={{ width: 14, height: 14 }} /> Back
          </button>
          <h2 style={{ fontSize: 'clamp(1.4rem,3vw,1.8rem)', fontWeight: 400, letterSpacing: '-.5px', marginBottom: 8, color: 'var(--t1)', textAlign: 'center' }}>
            What about a domain?
          </h2>
          <p style={{ color: 'var(--t2)', marginBottom: 32, fontSize: '.92rem', textAlign: 'center' }}>
            You can always add or change your domain later.
          </p>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            <button
              onClick={() => { setDomainMode('new'); setSelectedDomain(''); setDomainResult(null); setTimeout(() => domainRef.current?.focus(), 200); }}
              style={{
                background: domainMode === 'new' ? 'rgba(37,99,235,.06)' : 'rgba(255,255,255,.03)',
                border: `1px solid ${domainMode === 'new' ? '#2563EB' : 'rgba(255,255,255,.08)'}`,
                borderRadius: 14, padding: '18px 20px', cursor: 'pointer', textAlign: 'left', transition: 'all .2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sparkles style={{ width: 18, height: 18, color: '#2563EB' }} />
                <div>
                  <p style={{ fontWeight: 500, color: 'var(--t1)', fontSize: '.88rem' }}>Register a new domain</p>
                  <p style={{ fontSize: '.75rem', color: 'var(--t3)' }}>Search and add a domain to your order</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => { setDomainMode('existing'); setSelectedDomain(''); setDomainResult(null); }}
              style={{
                background: domainMode === 'existing' ? 'rgba(37,99,235,.06)' : 'rgba(255,255,255,.03)',
                border: `1px solid ${domainMode === 'existing' ? '#2563EB' : 'rgba(255,255,255,.08)'}`,
                borderRadius: 14, padding: '18px 20px', cursor: 'pointer', textAlign: 'left', transition: 'all .2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Globe style={{ width: 18, height: 18, color: '#2563EB' }} />
                <div>
                  <p style={{ fontWeight: 500, color: 'var(--t1)', fontSize: '.88rem' }}>I already have a domain</p>
                  <p style={{ fontSize: '.75rem', color: 'var(--t3)' }}>We&apos;ll help you connect or transfer it</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => { setDomainMode('temp'); setSelectedDomain(''); goToCheckout(); }}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: '8px 0', textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '.82rem', color: 'var(--t3)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                Use a temporary domain for now
              </span>
            </button>
          </div>

          {/* New domain search */}
          {domainMode === 'new' && (
            <div style={{ transition: 'all .3s' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <input
                  ref={domainRef}
                  type="text" value={domainQuery}
                  onChange={e => { setDomainQuery(e.target.value); setDomainResult(null); setDomainError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') checkDomain(); }}
                  placeholder="yourbusiness.com"
                  style={{ ...inputStyle, borderRadius: 100, padding: '14px 20px' }}
                />
                <button
                  onClick={checkDomain}
                  disabled={domainChecking || !domainQuery.trim()}
                  style={{
                    padding: '14px 24px', background: '#fff', color: '#03060e', borderRadius: 100, border: 'none',
                    fontSize: '.85rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    opacity: domainChecking || !domainQuery.trim() ? 0.5 : 1, whiteSpace: 'nowrap',
                  }}
                >
                  <Search style={{ width: 15, height: 15 }} /> {domainChecking ? 'Checking...' : 'Search'}
                </button>
              </div>
              {domainResult && (
                <div style={{
                  padding: '12px 18px', borderRadius: 12, marginBottom: 12,
                  border: `1px solid ${domainResult.available ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.2)'}`,
                  background: domainResult.available ? 'rgba(34,197,94,.06)' : 'rgba(239,68,68,.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: domainResult.available ? '#22c55e' : '#ef4444' }} />
                    <span style={{ fontWeight: 600, color: 'var(--t1)', fontSize: '.88rem' }}>{domainResult.domain}</span>
                    <span style={{ color: domainResult.available ? '#22c55e' : 'var(--t3)', fontSize: '.8rem' }}>
                      {domainResult.available ? 'is available' : 'is taken'}
                    </span>
                  </div>
                  {domainResult.available && (
                    <button
                      onClick={() => { setSelectedDomain(domainResult.domain); goToCheckout(); }}
                      style={{
                        padding: '8px 16px', background: '#22c55e', color: '#fff', borderRadius: 100, border: 'none',
                        fontSize: '.78rem', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Add to order
                    </button>
                  )}
                </div>
              )}
              {domainError && <p style={{ color: '#ef4444', fontSize: '.8rem', marginBottom: 12 }}>{domainError}</p>}
            </div>
          )}

          {/* Existing domain */}
          {domainMode === 'existing' && (
            <div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <input
                  type="text" value={domainQuery}
                  onChange={e => { setDomainQuery(e.target.value); setDomainError(''); }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const d = domainQuery.trim().toLowerCase();
                      if (/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) { setSelectedDomain(d); goToCheckout(); }
                      else setDomainError('Enter a valid domain (e.g. yourbusiness.com)');
                    }
                  }}
                  placeholder="yourbusiness.com"
                  style={{ ...inputStyle, borderRadius: 100, padding: '14px 20px' }}
                />
                <button
                  onClick={() => {
                    const d = domainQuery.trim().toLowerCase();
                    if (/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) { setSelectedDomain(d); goToCheckout(); }
                    else setDomainError('Enter a valid domain (e.g. yourbusiness.com)');
                  }}
                  style={{
                    padding: '14px 24px', background: '#fff', color: '#03060e', borderRadius: 100, border: 'none',
                    fontSize: '.85rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    opacity: domainQuery.trim() ? 1 : 0.5, whiteSpace: 'nowrap',
                  }}
                >
                  Continue <ArrowRight style={{ width: 15, height: 15 }} />
                </button>
              </div>
              {domainError && <p style={{ color: '#ef4444', fontSize: '.8rem', marginBottom: 10 }}>{domainError}</p>}
              <p style={{ fontSize: '.72rem', color: 'var(--t3)', lineHeight: 1.6 }}>
                We&apos;ll help you transfer or point your DNS after checkout.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════
          STEP: CHECKOUT SUMMARY
         ════════════════════════════════════════════ */}
      {step === checkoutStepNum && selectedPlan && (
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <button onClick={() => setStep(domainStepNum)} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', marginBottom: 16, fontSize: '.82rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ArrowLeft style={{ width: 14, height: 14 }} /> Back
          </button>

          <h2 style={{ fontSize: 'clamp(1.4rem,3vw,1.8rem)', fontWeight: 400, letterSpacing: '-.5px', marginBottom: 24, color: 'var(--t1)', textAlign: 'center' }}>
            Order summary
          </h2>

          <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 18, padding: '28px 24px' }}>
            {/* Plan */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <div>
                <p style={{ fontWeight: 500, color: 'var(--t1)', fontSize: '.9rem' }}>{selectedPlan.name} Plan</p>
                <p style={{ fontSize: '.75rem', color: 'var(--t3)' }}>Billed monthly</p>
              </div>
              <p style={{ fontWeight: 600, color: 'var(--t1)', fontSize: '.9rem' }}>${(selectedPlan.price_monthly / 100).toFixed(2)}/mo</p>
            </div>

            {/* Domain */}
            {selectedDomain && domainMode === 'new' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                <div>
                  <p style={{ fontWeight: 500, color: 'var(--t1)', fontSize: '.9rem' }}>{selectedDomain}</p>
                  <p style={{ fontSize: '.75rem', color: 'var(--t3)' }}>Domain registration (1 year)</p>
                </div>
                <p style={{ fontWeight: 600, color: 'var(--t1)', fontSize: '.9rem' }}>Included</p>
              </div>
            )}

            {selectedDomain && domainMode === 'existing' && (
              <div style={{ padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                <p style={{ fontSize: '.82rem', color: 'var(--t2)' }}>
                  Domain: <strong style={{ color: 'var(--t1)' }}>{selectedDomain}</strong>
                  <span style={{ color: 'var(--t3)', marginLeft: 8, fontSize: '.75rem' }}>DNS setup after checkout</span>
                </p>
              </div>
            )}

            {!selectedDomain && (
              <div style={{ padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                <p style={{ fontSize: '.82rem', color: 'var(--t3)' }}>Temporary domain — add a custom domain anytime</p>
              </div>
            )}

            {/* Onboarding preference */}
            <div style={{ padding: '16px 0' }}>
              <p style={{ fontSize: '.8rem', color: 'var(--t2)', marginBottom: 12, fontWeight: 500 }}>After setup, would you like help?</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setOnboardingChoice('self')}
                  style={{
                    flex: 1, padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'center', transition: 'all .2s',
                    background: onboardingChoice === 'self' ? 'rgba(37,99,235,.08)' : 'rgba(255,255,255,.03)',
                    border: `1px solid ${onboardingChoice === 'self' ? '#2563EB' : 'rgba(255,255,255,.08)'}`,
                  }}
                >
                  <p style={{ fontWeight: 500, color: 'var(--t1)', fontSize: '.82rem' }}>I&apos;ll take it from here</p>
                  <p style={{ fontSize: '.68rem', color: 'var(--t3)', marginTop: 2 }}>Self-guided setup</p>
                </button>
                <button
                  onClick={() => setOnboardingChoice('guided')}
                  style={{
                    flex: 1, padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'center', transition: 'all .2s',
                    background: onboardingChoice === 'guided' ? 'rgba(37,99,235,.08)' : 'rgba(255,255,255,.03)',
                    border: `1px solid ${onboardingChoice === 'guided' ? '#2563EB' : 'rgba(255,255,255,.08)'}`,
                  }}
                >
                  <p style={{ fontWeight: 500, color: 'var(--t1)', fontSize: '.82rem' }}>I&apos;d like onboarding</p>
                  <p style={{ fontSize: '.68rem', color: 'var(--t3)', marginTop: 2 }}>Book a call with our team</p>
                </button>
              </div>
              {onboardingChoice === 'guided' && (
                <div style={{ marginTop: 12, padding: '12px 16px', background: 'rgba(37,99,235,.04)', border: '1px solid rgba(37,99,235,.12)', borderRadius: 10 }}>
                  <p style={{ fontSize: '.78rem', color: 'var(--t2)', lineHeight: 1.6 }}>
                    After checkout, we&apos;ll send you a link to book your onboarding call. We&apos;ll walk through your goals, set everything up, and get your site ready to launch.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Checkout button */}
          <button
            onClick={handleCheckout}
            disabled={checkoutLoading}
            style={{
              width: '100%', padding: '16px', background: '#fff', color: '#03060e', borderRadius: 100, border: 'none',
              fontSize: '.9rem', fontWeight: 600, cursor: 'pointer', marginTop: 24,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: checkoutLoading ? 0.5 : 1,
            }}
          >
            {checkoutLoading ? (
              <>
                <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Redirecting to payment...
              </>
            ) : (
              <>Continue to Payment <ArrowRight style={{ width: 16, height: 16 }} /></>
            )}
          </button>
          {checkoutError && <p style={{ color: '#ef4444', fontSize: '.82rem', marginTop: 12, textAlign: 'center' }}>{checkoutError}</p>}
        </div>
      )}
    </div>
  );
}
