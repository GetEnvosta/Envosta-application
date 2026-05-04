'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import {
  ArrowRight, ArrowLeft, Globe, Sparkles, Check, Search,
  Loader2, ChevronRight, LayoutGrid, CreditCard, User, Calendar, Lock,
} from 'lucide-react';
import { EmbeddedCheckout } from '@/components/checkout/embedded-checkout';

/* ── Types ── */
interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  stripe_price_id: string;
  stripe_price_id_yearly: string;
  stripe_price_id_cad: string | null;
  stripe_price_id_yearly_cad: string | null;
  price_cad: number;
  price_yearly_cad: number;
  price_usd: number;
  price_yearly_usd: number;
  features: string[] | any;
  metadata: any;
  sort_order: number;
}

interface Props {
  /** 'public' = marketing signup (shows account step), 'dashboard' = logged-in user */
  mode: 'public' | 'dashboard';
  /** Pre-select a plan slug from URL params */
  initialPlan?: string;
  /** Pre-fill domain from URL params (e.g. from domains page search) */
  initialDomain?: string;
  /** Pre-select billing period from URL params */
  initialBilling?: 'monthly' | 'annual';
  /** Free trial mode: auto-selects Minimum plan, temp domain, 14-day trial */
  isTrial?: boolean;
  /** Stripe promotion code to auto-apply at checkout */
  promoCode?: string;
  /** Affiliate referral code from ?ref= param */
  referralCode?: string;
}

/* ── Component ── */
export function SiteCheckoutFlow({ mode, initialPlan, initialDomain, initialBilling, isTrial, promoCode, referralCode }: Props) {
  const supabase = createClient();

  /* State */
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Account (public mode only)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // hasAccount removed — go straight to form with "Sign in" link

  // Plan
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  // Domain
  const [domainMode, setDomainMode] = useState<'new' | 'existing' | 'temp' | null>(initialDomain ? 'new' : null);
  const [domainQuery, setDomainQuery] = useState(initialDomain ?? '');
  const [domainChecking, setDomainChecking] = useState(false);
  const [domainResult, setDomainResult] = useState<{ domain: string; available: boolean } | null>(null);
  const [domainError, setDomainError] = useState('');
  const [selectedDomain, setSelectedDomain] = useState(initialDomain ?? '');
  const [domainPriceCents, setDomainPriceCents] = useState<number | null>(null);
  const domainRef = useRef<HTMLInputElement>(null);

  // Checkout
  // checkoutLoading removed — Stripe Embedded Checkout handles its own loading
  const [checkoutError, setCheckoutError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>(initialBilling ?? 'monthly');

  // Onboarding
  const [onboardingChoice, setOnboardingChoice] = useState<'self' | 'guided' | null>(null);

  // Steps:
  // Public signup: Account only (if plan pre-selected) or Account → Plan
  // Every public signup auto-provisions a temp domain — no domain step
  // Dashboard: Plan → Domain (dashboard users can still pick domains)
  const needsPlanStep = !isTrial && !initialPlan;
  const publicSteps = needsPlanStep ? ['Account', 'Plan'] : ['Account'];
  const dashboardSteps = ['Plan', 'Domain'];
  const steps = mode === 'public' ? publicSteps : dashboardSteps;
  const [step, _setStep] = useState(1);

  // Wrap setStep to push browser history so back button works between steps
  function setStep(n: number) {
    _setStep(n);
    window.history.pushState({ step: n }, '', undefined);
  }

  // Listen for browser back/forward — keep user within the flow
  useEffect(() => {
    function onPopState(e: PopStateEvent) {
      if (e.state?.step && e.state.step >= 1) {
        _setStep(e.state.step);
      } else {
        // Prevent navigating away — push them back to step 1
        window.history.pushState({ step: 1 }, '', undefined);
        _setStep(1);
      }
    }
    window.history.replaceState({ step: 1 }, '', undefined);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  /* Fetch plans */
  useEffect(() => {
    async function fetchPlans() {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('type', 'hosting_plan')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      const allPlans = (data as Plan[]) ?? [];
      setPlans(allPlans);

      // Pre-select plan from URL param
      if (initialPlan) {
        const match = allPlans.find(p => p.slug === initialPlan);
        if (match) setSelectedPlan(match);
      }

      // Pre-fill domain from URL param and fetch its price
      if (initialDomain) {
        setDomainMode('new');
        setSelectedDomain(initialDomain);
        const tld = initialDomain.split('.').pop()?.toLowerCase() ?? '';
        const { data: pricing } = await supabase
          .from('products')
          .select('price_usd, price_cad, metadata')
          .eq('type', 'domain_tld')
          .eq('slug', `tld-${tld}`)
          .maybeSingle();
        if (pricing) setDomainPriceCents(
          (pricing.metadata as any)?.registration_price_cad ?? pricing.price_cad ?? pricing.price_usd
        );
      }

      // Skip to the right step based on what's pre-filled
      if (mode === 'dashboard') {
        if (initialPlan && initialDomain) {
          setStep(3); // Both → checkout
        } else if (initialPlan) {
          setStep(2); // Plan only → domain step
        }
      }
      // Public mode: step 1 is always Account (user must create account first)
      // After account step completes, the "next" handler will check if plan
      // is pre-selected and skip to domain step automatically
      // Public mode always starts at step 1 (account), but after they
      // complete account, the "Choose a Plan" button will skip ahead
      // if plan is already selected
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
        // Fetch TLD price
        if (data.available) {
          const tld = domain.split('.').pop()?.toLowerCase() ?? '';
          const { data: pricing } = await supabase
            .from('products')
            .select('price_usd, price_cad, metadata')
            .eq('type', 'domain_tld')
            .eq('slug', `tld-${tld}`)
            .maybeSingle();
          setDomainPriceCents(pricing ? ((pricing.metadata as any)?.registration_price_cad ?? pricing.price_cad ?? pricing.price_usd) : null);
        }
      } else {
        setDomainError(data.error ?? 'Could not check availability');
      }
    } catch {
      setDomainError('Connection error. Please try again.');
    }
    setDomainChecking(false);
  }

  /* Checkout — embedded Stripe Elements */
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null);
  const [checkoutType, setCheckoutType] = useState<'payment' | 'setup'>('payment');
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  async function handleCheckout() {
    if (!selectedPlan) return;
    setCheckoutLoading(true);
    setCheckoutError('');

    try {
      const priceId = billingPeriod === 'annual'
        ? (selectedPlan.stripe_price_id_yearly_cad ?? selectedPlan.stripe_price_id_yearly)
        : (selectedPlan.stripe_price_id_cad ?? selectedPlan.stripe_price_id);
      if (!priceId) {
        setCheckoutError(`No pricing configured for ${selectedPlan.name} (${billingPeriod}).`);
        setCheckoutLoading(false);
        return;
      }

      const res = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          domainName: selectedDomain || undefined,
          billing: billingPeriod,
          trial: isTrial || false,
          promoCode: promoCode || undefined,
          referralCode: referralCode || document.cookie.match(/envosta_ref=([^;]+)/)?.[1] || undefined,
          ...(mode === 'public' ? { name, email, password } : {}),
        }),
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { setCheckoutError(`Server error: ${text.substring(0, 200) || 'Empty response'}`); setCheckoutLoading(false); return; }
      if (!res.ok) { setCheckoutError(data.error ?? 'Something went wrong'); setCheckoutLoading(false); return; }

      setCheckoutClientSecret(data.clientSecret);
      setCheckoutType(data.type ?? 'payment');
      // Move to payment step
      setStep(steps.length + 1);
    } catch (e: any) {
      setCheckoutError(`Checkout error: ${e?.message ?? 'Network request failed.'}`);
    }
    setCheckoutLoading(false);
  }

  /* Step helpers */
  const planStepNum = steps.indexOf('Plan') + 1 || 99;
  const domainStepNum = steps.indexOf('Domain') + 1 || 99;
  const checkoutStepNum = steps.indexOf('Checkout') + 1;

  function goToDomain() { setStep(domainStepNum); }
  function goToCheckout() { handleCheckout(); }

  // Theme: dark for marketing, light for dashboard
  const dark = mode === 'public';
  const t: Record<string, string> = {
    text: dark ? 'var(--t1)' : '#111827',
    textSub: dark ? 'var(--t2)' : '#6b7280',
    textMuted: dark ? 'var(--t3)' : '#9ca3af',
    accent: '#2563EB',
    cardBg: dark ? 'rgba(255,255,255,.03)' : '#fff',
    cardBorder: dark ? 'rgba(255,255,255,.08)' : '#e5e7eb',
    cardBorderActive: '#2563EB',
    inputBg: dark ? 'rgba(255,255,255,.06)' : '#fff',
    inputBorder: dark ? 'var(--bdr2)' : '#d1d5db',
    btnBg: dark ? '#fff' : '#111827',
    btnColor: dark ? '#03060e' : '#fff',
    btnGhostBorder: dark ? 'rgba(255,255,255,.12)' : '#d1d5db',
    successBg: dark ? 'rgba(34,197,94,.06)' : '#f0fdf4',
    successBorder: dark ? 'rgba(34,197,94,.3)' : '#bbf7d0',
    errorBg: dark ? 'rgba(239,68,68,.04)' : '#fef2f2',
    errorBorder: dark ? 'rgba(239,68,68,.2)' : '#fecaca',
    summaryBg: dark ? 'rgba(255,255,255,.03)' : '#f9fafb',
    summaryBorder: dark ? 'rgba(255,255,255,.08)' : '#e5e7eb',
    stepDoneBg: dark ? 'rgba(34,197,94,.15)' : '#dcfce7',
    stepInactiveBg: dark ? 'rgba(255,255,255,.08)' : '#f3f4f6',
  };

  const inputStyle = {
    width: '100%', padding: '12px 16px', background: t.inputBg,
    border: `1px solid ${t.inputBorder}`, borderRadius: 10, color: t.text, fontSize: '.9rem',
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <Loader2 style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', color: t.textMuted }} />
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

      {/* ── Progress bar (hidden on payment step) ── */}
      <div style={{ display: step > steps.length ? 'none' : 'flex', justifyContent: 'center', gap: 6, marginBottom: 40 }}>
        {steps.map((s, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {i > 0 && <ChevronRight style={{ width: 14, height: 14, color: t.textMuted, opacity: .4 }} />}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                color: active ? t.text : done ? t.accent : t.textMuted,
                fontSize: '.82rem', fontWeight: active ? 500 : 400,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '.7rem', fontWeight: 600,
                  background: active ? '#2563EB' : done ? t.stepDoneBg : t.stepInactiveBg,
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
              <h2 style={{ fontSize: 'clamp(1.4rem,3vw,1.8rem)', fontWeight: 400, letterSpacing: '-.5px', marginBottom: 12, color: t.text }}>
                Create your account
              </h2>
              <p style={{ color: t.textSub, marginBottom: 28, fontSize: '.92rem' }}>
                Just the basics — we&apos;ll handle the rest during onboarding.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' }}>
                <div>
                  <label style={{ fontSize: '.78rem', color: t.textSub, marginBottom: 6, display: 'block' }}>Full Name *</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '.78rem', color: t.textSub, marginBottom: 6, display: 'block' }}>Email *</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@business.com" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '.78rem', color: t.textSub, marginBottom: 6, display: 'block' }}>Password *</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters"
                    style={{
                      ...inputStyle,
                      ...(password && password.length < 8 ? { borderColor: '#ef4444' } : {}),
                    }} />
                  {password && password.length < 8 && (
                    <p style={{ fontSize: '.72rem', color: '#ef4444', marginTop: 4 }}>Password must be at least 8 characters</p>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: '.78rem', color: t.textSub, marginBottom: 6, display: 'block' }}>Confirm Password *</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter your password"
                    style={{
                      ...inputStyle,
                      ...(confirmPassword && confirmPassword !== password ? { borderColor: '#ef4444' } : {}),
                    }} />
                  {confirmPassword && confirmPassword !== password && (
                    <p style={{ fontSize: '.72rem', color: '#ef4444', marginTop: 4 }}>Passwords don&apos;t match</p>
                  )}
                </div>
                {/* Terms of Service */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginTop: 4 }}>
                  <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} style={{ marginTop: 3, accentColor: '#2563EB' }} />
                  <span style={{ fontSize: '.78rem', color: t.textSub, lineHeight: 1.6 }}>
                    I agree to the <a href="/legal/terms" target="_blank" style={{ color: t.accent, textDecoration: 'underline' }}>Terms of Service</a> and <a href="/legal/privacy" target="_blank" style={{ color: t.accent, textDecoration: 'underline' }}>Privacy Policy</a>.
                  </span>
                </label>

                <button
                  onClick={() => {
                    if (!(name && email && password.length >= 8 && password === confirmPassword && termsAccepted)) return;
                    // Always auto-provision with temp domain
                    setDomainMode('temp');
                    setSelectedDomain('');
                    if (isTrial || selectedPlan) {
                      // Trial or plan pre-selected: go straight to checkout
                      handleCheckout();
                    } else {
                      // No plan selected: go to plan picker
                      setStep(planStepNum);
                    }
                  }}
                  disabled={!name || !email || password.length < 8 || password !== confirmPassword || !termsAccepted || checkoutLoading}
                  style={{
                    padding: '14px 24px', background: t.btnBg, color: t.btnColor, borderRadius: 100, border: 'none',
                    fontSize: '.88rem', fontWeight: 500, cursor: 'pointer', marginTop: 8,
                    opacity: (!name || !email || password.length < 8 || password !== confirmPassword || !termsAccepted || checkoutLoading) ? 0.5 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {checkoutLoading ? (
                    <><Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Setting up...</>
                  ) : isTrial ? (
                    <>Start Free Trial <ArrowRight style={{ width: 16, height: 16 }} /></>
                  ) : selectedPlan ? (
                    <>Continue to Checkout <ArrowRight style={{ width: 16, height: 16 }} /></>
                  ) : (
                    <>Choose a Plan <ArrowRight style={{ width: 16, height: 16 }} /></>
                  )}
                </button>
                {checkoutError && <p style={{ color: '#ef4444', fontSize: '.82rem', marginTop: 12, textAlign: 'center' }}>{checkoutError}</p>}
              </div>
              <p style={{ fontSize: '.82rem', color: t.textMuted, marginTop: 20 }}>
                Already have an account?{' '}
                <a href="https://my.envosta.com/auth/login" style={{ color: t.accent, textDecoration: 'underline' }}>Sign in</a>
              </p>
        </div>
      )}

      {/* ════════════════════════════════════════════
          STEP: CHOOSE PLAN
         ════════════════════════════════════════════ */}
      {step === planStepNum && (
        <div>
          {mode === 'public' && (
            <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', marginBottom: 16, fontSize: '.82rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ArrowLeft style={{ width: 14, height: 14 }} /> Back
            </button>
          )}
          <h2 style={{ fontSize: 'clamp(1.4rem,3vw,1.8rem)', fontWeight: 400, letterSpacing: '-.5px', marginBottom: 8, color: t.text, textAlign: 'center' }}>
            Choose your plan
          </h2>
          <p style={{ color: t.textSub, marginBottom: 32, fontSize: '.92rem', textAlign: 'center' }}>
            All plans include onboarding, SSL, CDN, daily backups, and staging.
          </p>

          {/* Billing toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
            <span style={{ fontSize: '.82rem', color: billingPeriod === 'monthly' ? t.text : t.textMuted, fontWeight: billingPeriod === 'monthly' ? 500 : 400 }}>Monthly</span>
            <button
              onClick={() => setBillingPeriod(p => p === 'monthly' ? 'annual' : 'monthly')}
              style={{
                width: 48, height: 26, borderRadius: 100, border: 'none', cursor: 'pointer', position: 'relative',
                background: billingPeriod === 'annual' ? '#2563EB' : dark ? 'rgba(255,255,255,.15)' : '#d1d5db',
                transition: 'background .2s',
              }}
            >
              <span style={{
                position: 'absolute', top: 3, left: 0, width: 20, height: 20, borderRadius: '50%', background: '#fff',
                transition: 'transform .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                transform: billingPeriod === 'annual' ? 'translateX(25px)' : 'translateX(3px)',
              }} />
            </button>
            <span style={{ fontSize: '.82rem', color: billingPeriod === 'annual' ? t.text : t.textMuted, fontWeight: billingPeriod === 'annual' ? 500 : 400 }}>
              Annual <span style={{ fontSize: '.7rem', color: '#22c55e', fontWeight: 600 }}>Save 25%</span>
            </span>
          </div>

          <div className="scf-plans">
            {plans.filter(p => !(p.metadata as any)?.custom_pricing).map(plan => {
              const isPopular = plan.slug === 'growth';
              const isSelected = selectedPlan?.id === plan.id;
              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  style={{
                    background: isSelected ? dark ? 'rgba(37,99,235,.06)' : 'rgba(37,99,235,.04)' : t.cardBg,
                    border: `2px solid ${isSelected ? '#2563EB' : isPopular ? 'rgba(37,99,235,.2)' : t.cardBorder}`,
                    borderRadius: 18, padding: '28px 24px', cursor: 'pointer', transition: 'all .2s',
                    position: 'relative', display: 'flex', flexDirection: 'column', textAlign: 'left',
                  }}
                >
                  {isPopular && (
                    <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: '#2563EB', color: '#fff', fontSize: '.6rem', fontWeight: 600, padding: '3px 12px', borderRadius: 100, letterSpacing: '.5px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      Recommended
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '.66rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '2px', color: '#2563EB' }}>{plan.name}</span>
                    {isTrial && <span style={{ fontSize: '.6rem', fontWeight: 600, color: '#22c55e', background: 'rgba(34,197,94,.1)', padding: '2px 8px', borderRadius: 100 }}>14 days free</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                    <span style={{ fontSize: '2rem', fontWeight: 600, color: t.text, letterSpacing: '-1px' }}>
                      ${billingPeriod === 'annual' ? (((plan.price_yearly_cad ?? plan.price_yearly_usd) ?? 0) / 100 / 12).toFixed(0) : (((plan.price_cad ?? plan.price_usd) ?? 0) / 100).toFixed(0)}
                    </span>
                    <span style={{ fontSize: '.8rem', color: t.textMuted, fontWeight: 300 }}>
                      CAD/mo
                    </span>
                  </div>
                  {isTrial && <p style={{ fontSize: '.72rem', color: '#22c55e', fontWeight: 500, marginBottom: 10 }}>Then ${(((plan.price_cad ?? plan.price_usd) ?? 0) / 100).toFixed(0)}/mo after trial</p>}
                  {!isTrial && <div style={{ marginBottom: 10 }} />}
                  <p style={{ fontSize: '.78rem', color: t.textMuted, lineHeight: 1.6, fontWeight: 300, marginBottom: 16 }}>{plan.description}</p>
                  <div style={{ flex: 1 }}>
                    {(Array.isArray(plan.features) ? plan.features : []).slice(0, 6).map((f: string) => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                        <Check style={{ width: 13, height: 13, color: '#22c55e', flexShrink: 0 }} />
                        <span style={{ fontSize: '.76rem', color: t.textSub, fontWeight: 300 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 16, textAlign: 'center' }}>
                    <span style={{ fontSize: '.8rem', fontWeight: 500, color: isSelected ? '#2563EB' : t.textMuted }}>
                      {isSelected ? '✓ Selected' : isTrial ? 'Start free trial' : 'Select plan'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <button
              onClick={() => { if (mode === 'public') { setDomainMode('temp'); setSelectedDomain(''); } handleCheckout(); }}
              disabled={!selectedPlan || checkoutLoading}
              style={{
                padding: '14px 32px', background: t.btnBg, color: t.btnColor, borderRadius: 100, border: 'none',
                fontSize: '.88rem', fontWeight: 500, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                opacity: selectedPlan && !checkoutLoading ? 1 : 0.4,
              }}
            >
              {checkoutLoading ? (
                <><Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Setting up...</>
              ) : (
                <>Continue to Payment <ArrowRight style={{ width: 16, height: 16 }} /></>
              )}
            </button>
            {checkoutError && <p style={{ color: '#ef4444', fontSize: '.82rem', marginTop: 12 }}>{checkoutError}</p>}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          STEP: DOMAIN
         ════════════════════════════════════════════ */}
      {step === domainStepNum && (
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <button onClick={() => setStep(planStepNum)} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', marginBottom: 16, fontSize: '.82rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ArrowLeft style={{ width: 14, height: 14 }} /> Back
          </button>
          <h2 style={{ fontSize: 'clamp(1.4rem,3vw,1.8rem)', fontWeight: 400, letterSpacing: '-.5px', marginBottom: 8, color: t.text, textAlign: 'center' }}>
            {isTrial ? 'Need a domain?' : 'What about a domain?'}
          </h2>
          <p style={{ color: t.textSub, marginBottom: 32, fontSize: '.92rem', textAlign: 'center' }}>
            {isTrial
              ? 'Start free with a temporary domain, or register yours now. Domains can be connected to your site after your trial.'
              : 'Register a domain or start with a temporary one. You can always change this later.'}
          </p>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {/* Temp domain — first option, recommended */}
            <button
              disabled={checkoutLoading}
              onClick={() => { setDomainMode('temp'); setSelectedDomain(''); goToCheckout(); }}
              style={{
                background: dark ? 'rgba(34,197,94,.06)' : 'rgba(34,197,94,.03)',
                border: '2px solid rgba(34,197,94,.3)',
                borderRadius: 14, padding: '20px 22px', cursor: checkoutLoading ? 'wait' : 'pointer', textAlign: 'left', transition: 'all .2s',
                opacity: checkoutLoading ? 0.6 : 1,
                position: 'relative',
              }}
            >
              <div style={{ position: 'absolute', top: -10, left: 20, background: '#22c55e', color: '#fff', fontSize: '.6rem', fontWeight: 600, padding: '3px 10px', borderRadius: 100, letterSpacing: '.5px', textTransform: 'uppercase' }}>Recommended</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Globe style={{ width: 18, height: 18, color: '#22c55e' }} />
                <div>
                  <p style={{ fontWeight: 600, color: t.text, fontSize: '.9rem' }}>Start with a free temporary domain</p>
                  <p style={{ fontSize: '.75rem', color: t.textMuted }}>Get started instantly — add a custom domain anytime from your dashboard</p>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: '.75rem', fontWeight: 600, color: '#22c55e', background: 'rgba(34,197,94,.1)', padding: '4px 12px', borderRadius: 100, whiteSpace: 'nowrap' }}>Free</span>
              </div>
            </button>

            {/* Register new domain */}
            <button
              onClick={() => { setDomainMode('new'); setSelectedDomain(''); setDomainResult(null); setTimeout(() => domainRef.current?.focus(), 200); }}
              style={{
                background: domainMode === 'new' ? dark ? 'rgba(37,99,235,.06)' : 'rgba(37,99,235,.04)' : t.cardBg,
                border: `1px solid ${domainMode === 'new' ? '#2563EB' : t.cardBorder}`,
                borderRadius: 14, padding: '18px 20px', cursor: 'pointer', textAlign: 'left', transition: 'all .2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sparkles style={{ width: 18, height: 18, color: '#2563EB' }} />
                <div>
                  <p style={{ fontWeight: 500, color: t.text, fontSize: '.88rem' }}>Register a domain</p>
                  <p style={{ fontSize: '.75rem', color: t.textMuted }}>
                    {isTrial ? 'Register now — can be connected after your trial ends, or purchase to start your plan immediately' : 'Search and secure your perfect domain name'}
                  </p>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: '.72rem', fontWeight: 500, color: t.textMuted }}>billed yearly</span>
              </div>
            </button>

            {/* Existing domain — only for non-trial */}
            {!isTrial && (
              <button
                onClick={() => { setDomainMode('existing'); setSelectedDomain(''); setDomainResult(null); }}
                style={{
                  background: domainMode === 'existing' ? dark ? 'rgba(37,99,235,.06)' : 'rgba(37,99,235,.04)' : t.cardBg,
                  border: `1px solid ${domainMode === 'existing' ? '#2563EB' : t.cardBorder}`,
                  borderRadius: 14, padding: '18px 20px', cursor: 'pointer', textAlign: 'left', transition: 'all .2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Globe style={{ width: 18, height: 18, color: '#2563EB' }} />
                  <div>
                    <p style={{ fontWeight: 500, color: t.text, fontSize: '.88rem' }}>I already have a domain</p>
                    <p style={{ fontSize: '.75rem', color: t.textMuted }}>We&apos;ll help you connect or transfer it</p>
                  </div>
                </div>
              </button>
            )}
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
                    padding: '14px 24px', background: t.btnBg, color: t.btnColor, borderRadius: 100, border: 'none',
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
                  border: `1px solid ${domainResult.available ? t.successBorder : t.errorBorder}`,
                  background: domainResult.available ? t.successBg : t.errorBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: domainResult.available ? '#22c55e' : '#ef4444' }} />
                    <span style={{ fontWeight: 600, color: t.text, fontSize: '.88rem' }}>{domainResult.domain}</span>
                    <span style={{ color: domainResult.available ? '#22c55e' : 'var(--t3)', fontSize: '.8rem' }}>
                      {domainResult.available
                        ? `is available${domainPriceCents ? ` · $${(domainPriceCents / 100).toFixed(0)} CAD/yr` : ''}`
                        : 'is taken'}
                    </span>
                  </div>
                  {domainResult.available && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <button
                        onClick={() => { setSelectedDomain(domainResult.domain); goToCheckout(); }}
                        style={{
                          padding: '8px 16px', background: '#22c55e', color: '#fff', borderRadius: 100, border: 'none',
                          fontSize: '.78rem', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        Add to order
                      </button>
                      <span style={{ fontSize: '.68rem', color: t.textMuted }}>Billed annually as a separate subscription</span>
                    </div>
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
                    padding: '14px 24px', background: t.btnBg, color: t.btnColor, borderRadius: 100, border: 'none',
                    fontSize: '.85rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    opacity: domainQuery.trim() ? 1 : 0.5, whiteSpace: 'nowrap',
                  }}
                >
                  Continue <ArrowRight style={{ width: 15, height: 15 }} />
                </button>
              </div>
              {domainError && <p style={{ color: '#ef4444', fontSize: '.8rem', marginBottom: 10 }}>{domainError}</p>}
              <p style={{ fontSize: '.72rem', color: t.textMuted, lineHeight: 1.6 }}>
                We&apos;ll help you transfer or point your DNS after checkout.
              </p>
            </div>
          )}
          {/* Loading / Error */}
          {checkoutLoading && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite', margin: '0 auto 8px', color: t.textMuted }} />
              <p style={{ fontSize: '.82rem', color: t.textMuted }}>Setting up secure payment...</p>
            </div>
          )}
          {checkoutError && <p style={{ color: '#ef4444', fontSize: '.82rem', marginTop: 16, textAlign: 'center' }}>{checkoutError}</p>}

          <p style={{ fontSize: '.68rem', color: t.textMuted, marginTop: 20, textAlign: 'center', lineHeight: 1.6 }}>
            By continuing you agree to our <a href="/legal/terms" target="_blank" style={{ color: t.textSub, textDecoration: 'underline' }}>Terms</a> and <a href="/legal/privacy" target="_blank" style={{ color: t.textSub, textDecoration: 'underline' }}>Privacy Policy</a>.
          </p>
        </div>
      )}

      {/* ════════════════════════════════════════════
          STEP: EMBEDDED PAYMENT
         ════════════════════════════════════════════ */}
      {step > steps.length && checkoutClientSecret && selectedPlan && (
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          {checkoutSuccess ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Check style={{ width: 28, height: 28, color: '#16a34a' }} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: t.text, marginBottom: 8 }}>
                {isTrial ? 'Trial started!' : 'Payment successful!'}
              </h2>
              <p style={{ color: t.textSub, fontSize: '.9rem', marginBottom: 24 }}>
                {isTrial
                  ? 'Your site is being set up. Redirecting to your dashboard...'
                  : 'Your site is being provisioned. Redirecting to your dashboard...'}
              </p>
              <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite', margin: '0 auto', color: t.textMuted }} />
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 'clamp(1.4rem,3vw,1.6rem)', fontWeight: 500, letterSpacing: '-.5px', marginBottom: 12, color: t.text, textAlign: 'center' }}>
                Start your free trial
              </h2>

              {/* Free trial reassurance — bold up-top callout so customers
                  see the no-charge-for-14-days promise before they enter
                  card details. Reduces drop-off at this step. */}
              <div style={{
                background: dark ? 'rgba(34,197,94,.08)' : 'rgba(34,197,94,.06)',
                border: `1px solid ${dark ? 'rgba(34,197,94,.25)' : 'rgba(34,197,94,.3)'}`,
                borderRadius: 14,
                padding: '16px 20px',
                marginBottom: 24,
                textAlign: 'center',
              }}>
                <p style={{ fontSize: '.92rem', fontWeight: 600, color: '#22c55e', marginBottom: 4, letterSpacing: '.1px' }}>
                  No charge today. No charge for 14 days.
                </p>
                <p style={{ fontSize: '.78rem', color: t.textSub, lineHeight: 1.55, fontWeight: 300 }}>
                  We&rsquo;ll save your card so your site stays live after the trial — but you can cancel anytime in the next 14 days and you won&rsquo;t be charged a cent.
                </p>
              </div>

              <EmbeddedCheckout
                clientSecret={checkoutClientSecret}
                type={checkoutType}
                planName={`${selectedPlan.name} Plan${billingPeriod === 'annual' ? ' (Annual)' : ''}`}
                planPrice={isTrial ? '$0 today' : billingPeriod === 'annual' ? `$${((selectedPlan.price_yearly_cad ?? selectedPlan.price_yearly_usd ?? 0) / 100).toFixed(0)} CAD/yr` : `$${((selectedPlan.price_cad ?? selectedPlan.price_usd) / 100).toFixed(0)} CAD/mo`}
                fullPrice={billingPeriod === 'annual' ? `$${((selectedPlan.price_yearly_cad ?? selectedPlan.price_yearly_usd ?? 0) / 100).toFixed(0)} CAD/yr` : `$${((selectedPlan.price_cad ?? selectedPlan.price_usd) / 100).toFixed(0)} CAD/mo`}
                domainName={selectedDomain && domainMode === 'new' ? selectedDomain : undefined}
                domainPrice={selectedDomain && domainMode === 'new' && domainPriceCents ? `$${(domainPriceCents / 100).toFixed(0)} CAD/yr` : undefined}
                isTrial={isTrial ?? false}
                dark={dark}
                onSuccess={async () => {
                  setCheckoutSuccess(true);
                  // Auto sign in for new signups
                  if (mode === 'public' && email && password) {
                    try {
                      await supabase.auth.signInWithPassword({ email, password });
                    } catch { /* will redirect to login as fallback */ }
                  }
                  setTimeout(() => {
                    window.location.href = mode === 'public'
                      ? '/dashboard/sites?checkout=success'
                      : '/dashboard/sites?checkout=success';
                  }, 2000);
                }}
                onError={(msg) => setCheckoutError(msg)}
              />

              {checkoutError && <p style={{ color: '#ef4444', fontSize: '.82rem', marginTop: 12, textAlign: 'center' }}>{checkoutError}</p>}

              <p style={{ fontSize: '.68rem', color: t.textMuted, marginTop: 20, textAlign: 'center', lineHeight: 1.6 }}>
                By completing this purchase you agree to our <a href="/legal/terms" target="_blank" style={{ color: t.textSub, textDecoration: 'underline' }}>Terms</a> and <a href="/legal/privacy" target="_blank" style={{ color: t.textSub, textDecoration: 'underline' }}>Privacy Policy</a>.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
