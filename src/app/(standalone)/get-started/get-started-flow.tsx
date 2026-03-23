'use client';

import { useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, Globe, Sparkles, Check, Search } from 'lucide-react';

const VALID_PLANS = ['minimum', 'growth', 'performance'] as const;

const PLAN_DETAILS: Record<string, { name: string; price: string; features: string[] }> = {
  minimum: { name: 'Minimum', price: '$50', features: ['10 GB SSD Storage', 'Staging Environment', 'Daily Backups', 'Free SSL + CDN', 'Standard Onboarding', 'Email Support'] },
  growth: { name: 'Growth', price: '$129', features: ['30 GB SSD Storage', 'Staging Environment', 'Daily Backups', 'Free SSL + CDN', 'Guided Onboarding + SEO', 'WooCommerce Setup', 'Email Support'] },
  performance: { name: 'Performance', price: '$350', features: ['100 GB SSD Storage', 'Unlimited Bandwidth', 'Daily Backups', 'Free SSL + CDN + WAF', 'Concierge Onboarding', 'Custom Theme', 'WooCommerce Setup', 'Priority Support (4hr)'] },
};

const PLAN_RECOMMENDATIONS: Record<string, { plan: string; reason: string }> = {
  'small-existing': { plan: 'Minimum', reason: 'Your existing site will be migrated to fast, secure hosting with daily backups and SSL included.' },
  'small-new': { plan: 'Minimum', reason: 'Perfect for getting your business online with a professionally set up WordPress site.' },
  'medium-existing': { plan: 'Growth', reason: 'Your growing business needs staging environments, CDN, and priority support to keep scaling.' },
  'medium-new': { plan: 'Growth', reason: 'Launch with SEO configured, staging for testing, and priority support as you grow.' },
  'large-existing': { plan: 'Performance', reason: 'Enterprise-grade hosting with dedicated support, WooCommerce optimization, and security hardening.' },
  'large-new': { plan: 'Performance', reason: 'Full concierge setup with WooCommerce, email DNS, performance optimization, and dedicated support.' },
  'ecommerce-existing': { plan: 'Performance', reason: 'WooCommerce needs the performance, security, and dedicated support that comes with our top tier.' },
  'ecommerce-new': { plan: 'Performance', reason: 'We\'ll set up WooCommerce from scratch with payment processing, security hardening, and performance optimization.' },
};

export function GetStartedFlow() {
  const searchParams = useSearchParams();
  const planParam = searchParams.get('plan')?.toLowerCase() ?? '';
  const selectedPlan = VALID_PLANS.includes(planParam as any) ? planParam : '';

  const [step, setStep] = useState(1);
  const [showDomainSearch, setShowDomainSearch] = useState(false);
  const [domainQuery, setDomainQuery] = useState('');
  const [answers, setAnswers] = useState({
    situation: '',
    contact: '',
    businessName: '',
    website: '',
    industry: '',
    goals: '',
    size: '',
    name: '',
    email: '',
    phone: '',
    domain: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [chosenPlan, setChosenPlan] = useState('');
  const [domainChecking, setDomainChecking] = useState(false);
  const [domainResult, setDomainResult] = useState<{ domain: string; available: boolean } | null>(null);
  const [domainError, setDomainError] = useState('');
  const domainInputRef = useRef<HTMLInputElement>(null);

  function update(field: string, value: string) {
    setAnswers(prev => ({ ...prev, [field]: value }));
  }

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

  function getRecommendation() {
    if (selectedPlan) {
      return { plan: PLAN_DETAILS[selectedPlan].name, reason: '' };
    }
    const size = answers.size || 'small';
    const situation = answers.situation || 'new';
    const key = `${size}-${situation}`;
    return PLAN_RECOMMENDATIONS[key] ?? PLAN_RECOMMENDATIONS['small-new'];
  }

  // When a plan is pre-selected from pricing, the flow is:
  // Step 1 (situation) → Step 2 (business form) → Submit (skip recommendation)
  const totalSteps = selectedPlan ? 2 : 3;

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError('');

    try {
      const rec = getRecommendation();
      const planSlug = chosenPlan || selectedPlan || rec.plan.toLowerCase();

      const res = await fetch('/api/signup-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: answers.name,
          email: answers.email,
          phone: answers.phone,
          businessName: answers.businessName,
          industry: answers.industry,
          situation: answers.situation,
          contact: answers.contact,
          goals: answers.goals,
          size: answers.size,
          domain: answers.domain || undefined,
          plan: planSlug,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error ?? 'Something went wrong. Please try again.');
        setSubmitting(false);
        return;
      }

      if (data.redirect) {
        window.location.href = data.redirect;
        return;
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      setSubmitted(true);
    } catch (e) {
      setSubmitError('Connection error. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div style={{ paddingTop: 100, paddingBottom: 80, minHeight: '100vh' }}>
      <style>{`
        .gs-plans-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;max-width:900px;margin:0 auto;text-align:left}
        @media(max-width:768px){.gs-plans-grid{grid-template-columns:1fr;max-width:400px}}
      `}</style>
      <div className="c" style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Progress */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 48 }}>
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
            <div
              key={s}
              style={{
                width: s === step ? 32 : 8,
                height: 8,
                borderRadius: 4,
                background: s <= step ? '#2563EB' : 'rgba(255,255,255,.15)',
                transition: 'all .3s',
              }}
            />
          ))}
        </div>

        {/* Selected plan badge */}
        {selectedPlan && (
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <span style={{ display: 'inline-block', background: 'rgba(37,99,235,.1)', border: '1px solid rgba(37,99,235,.2)', color: '#2563EB', fontSize: '.72rem', fontWeight: 600, padding: '5px 16px', borderRadius: 100, letterSpacing: '.5px', textTransform: 'uppercase' }}>
              {PLAN_DETAILS[selectedPlan].name} Plan — {PLAN_DETAILS[selectedPlan].price}/mo
            </span>
          </div>
        )}

        {/* ═══ STEP 1: Your situation ═══ */}
        {step === 1 && (
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 400, letterSpacing: '-1px', marginBottom: 12, color: 'var(--t1)' }}>
              Let&apos;s get you started
            </h1>
            <p style={{ color: 'var(--t2)', marginBottom: 40, fontSize: '.95rem' }}>
              Which best describes you?
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 560, margin: '0 auto' }}>
              {/* Option 1: New website, need a domain */}
              <button
                onClick={() => { update('situation', 'new'); setShowDomainSearch(true); setTimeout(() => domainInputRef.current?.focus(), 300); }}
                style={{
                  background: answers.situation === 'new' ? 'rgba(37,99,235,.08)' : 'rgba(255,255,255,.04)',
                  border: `1px solid ${answers.situation === 'new' ? 'var(--gold)' : 'var(--bdr2)'}`,
                  borderRadius: 16, padding: '32px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all .2s',
                }}
                onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
                onMouseOut={e => { if (answers.situation !== 'new') e.currentTarget.style.borderColor = 'var(--bdr2)'; }}
              >
                <Sparkles style={{ width: 28, height: 28, color: 'var(--gold)', margin: '0 auto 10px' }} />
                <p style={{ fontWeight: 500, color: 'var(--t1)', marginBottom: 4 }}>I need a website</p>
                <p style={{ fontSize: '.78rem', color: 'var(--t3)' }}>I don&apos;t have a domain yet</p>
              </button>

              {/* Option 2: Moving to Envosta, have a domain */}
              <button
                onClick={() => { update('situation', 'existing'); setShowDomainSearch(true); }}
                style={{
                  background: answers.situation === 'existing' ? 'rgba(37,99,235,.08)' : 'rgba(255,255,255,.04)',
                  border: `1px solid ${answers.situation === 'existing' ? 'var(--gold)' : 'var(--bdr2)'}`,
                  borderRadius: 16, padding: '32px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all .2s',
                }}
                onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
                onMouseOut={e => { if (answers.situation !== 'existing') e.currentTarget.style.borderColor = 'var(--bdr2)'; }}
              >
                <Globe style={{ width: 28, height: 28, color: 'var(--gold)', margin: '0 auto 10px' }} />
                <p style={{ fontWeight: 500, color: 'var(--t1)', marginBottom: 4 }}>I&apos;m moving to Envosta</p>
                <p style={{ fontSize: '.78rem', color: 'var(--t3)' }}>I already have my domain</p>
              </button>
            </div>

            {/* ── Dropdown for "I need a website" — domain search ── */}
            <div
              style={{
                maxWidth: 560, margin: '0 auto', marginTop: 32,
                opacity: showDomainSearch && answers.situation === 'new' ? 1 : 0,
                transform: showDomainSearch && answers.situation === 'new' ? 'translateY(0)' : 'translateY(-12px)',
                maxHeight: showDomainSearch && answers.situation === 'new' ? 400 : 0,
                overflow: 'hidden',
                transition: 'opacity .4s ease, transform .4s ease, max-height .4s ease',
              }}
            >
              <p style={{ fontSize: '.88rem', color: 'var(--t2)', marginBottom: 14, fontWeight: 400 }}>
                Search for a domain name
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  ref={domainInputRef}
                  type="text"
                  value={domainQuery}
                  onChange={e => { setDomainQuery(e.target.value); setDomainResult(null); setDomainError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') checkDomain(); }}
                  placeholder="yourbusiness.com"
                  style={{
                    flex: 1, padding: '14px 20px', background: 'rgba(255,255,255,.06)', border: '1px solid var(--bdr2)',
                    borderRadius: 100, color: 'var(--t1)', fontSize: '.95rem', fontFamily: 'inherit', outline: 'none',
                    transition: 'border-color .2s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--bdr2)')}
                />
                <button
                  onClick={checkDomain}
                  disabled={domainChecking || !domainQuery.trim()}
                  style={{
                    padding: '14px 24px', background: '#fff', color: '#03060e', borderRadius: 100, border: 'none',
                    fontSize: '.88rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    opacity: domainChecking || !domainQuery.trim() ? 0.5 : 1,
                  }}
                >
                  <Search style={{ width: 16, height: 16 }} /> {domainChecking ? 'Checking...' : 'Search'}
                </button>
              </div>

              {/* Domain result */}
              {domainResult && (
                <div style={{
                  marginTop: 16, padding: '14px 20px', borderRadius: 12,
                  border: `1px solid ${domainResult.available ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.2)'}`,
                  background: domainResult.available ? 'rgba(34,197,94,.06)' : 'rgba(239,68,68,.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: domainResult.available ? '#22c55e' : '#ef4444' }} />
                    <span style={{ fontWeight: 600, color: 'var(--t1)', fontSize: '.9rem' }}>{domainResult.domain}</span>
                    <span style={{ color: domainResult.available ? '#22c55e' : 'var(--t3)', fontSize: '.82rem' }}>
                      {domainResult.available ? 'is available' : 'is taken'}
                    </span>
                  </div>
                  {domainResult.available && (
                    <button
                      onClick={() => { update('domain', domainResult.domain); setStep(2); }}
                      style={{
                        padding: '8px 18px', background: '#22c55e', color: '#fff', borderRadius: 100, border: 'none',
                        fontSize: '.8rem', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Use this domain
                    </button>
                  )}
                </div>
              )}
              {domainError && (
                <p style={{ color: '#ef4444', fontSize: '.82rem', marginTop: 12 }}>{domainError}</p>
              )}

              <button
                onClick={() => { update('domain', ''); setStep(2); }}
                style={{
                  background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', marginTop: 16,
                  fontSize: '.82rem', textDecoration: 'underline', textUnderlineOffset: '3px',
                }}
              >
                Use a temporary domain for now
              </button>
            </div>

            {/* ── Dropdown for "I'm moving to Envosta" — domain transfer ── */}
            <div
              style={{
                maxWidth: 560, margin: '0 auto', marginTop: 32,
                opacity: showDomainSearch && answers.situation === 'existing' ? 1 : 0,
                transform: showDomainSearch && answers.situation === 'existing' ? 'translateY(0)' : 'translateY(-12px)',
                maxHeight: showDomainSearch && answers.situation === 'existing' ? 300 : 0,
                overflow: 'hidden',
                transition: 'opacity .4s ease, transform .4s ease, max-height .4s ease',
              }}
            >
              <p style={{ fontSize: '.88rem', color: 'var(--t2)', marginBottom: 14, fontWeight: 400 }}>
                Enter your existing domain name
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  value={domainQuery}
                  onChange={e => { setDomainQuery(e.target.value); setDomainError(''); }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && domainQuery.trim()) {
                      const d = domainQuery.trim().toLowerCase();
                      if (/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) { update('domain', d); setStep(2); }
                      else setDomainError('Please enter a valid domain (e.g. yourbusiness.com)');
                    }
                  }}
                  placeholder="yourbusiness.com"
                  style={{
                    flex: 1, padding: '14px 20px', background: 'rgba(255,255,255,.06)', border: '1px solid var(--bdr2)',
                    borderRadius: 100, color: 'var(--t1)', fontSize: '.95rem', fontFamily: 'inherit', outline: 'none',
                    transition: 'border-color .2s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--bdr2)')}
                />
                <button
                  onClick={() => {
                    const d = domainQuery.trim().toLowerCase();
                    if (!d) return;
                    if (/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) { update('domain', d); setStep(2); }
                    else setDomainError('Please enter a valid domain (e.g. yourbusiness.com)');
                  }}
                  style={{
                    padding: '14px 24px', background: '#fff', color: '#03060e', borderRadius: 100, border: 'none',
                    fontSize: '.88rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    opacity: domainQuery.trim() ? 1 : 0.5,
                  }}
                >
                  Continue <ArrowRight style={{ width: 16, height: 16 }} />
                </button>
              </div>
              {domainError && answers.situation === 'existing' && (
                <p style={{ color: '#ef4444', fontSize: '.82rem', marginTop: 10 }}>{domainError}</p>
              )}
              <p style={{ fontSize: '.72rem', color: 'var(--t3)', marginTop: 10, fontWeight: 300, lineHeight: 1.6 }}>
                We&apos;ll help you transfer your domain to Envosta after you sign up, or you can point your DNS to us and keep your current registrar.
              </p>
              <button
                onClick={() => { update('domain', ''); setStep(2); }}
                style={{
                  background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', marginTop: 12,
                  fontSize: '.82rem', textDecoration: 'underline', textUnderlineOffset: '3px',
                }}
              >
                Skip for now, use a temporary domain
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: Create your account ═══ */}
        {step === 2 && (
          <div style={{ textAlign: 'center' }}>
            <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', marginBottom: 24, fontSize: '.85rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ArrowLeft style={{ width: 14, height: 14 }} /> Back
            </button>

            <h1 style={{ fontSize: 'clamp(1.6rem,3.5vw,2.2rem)', fontWeight: 400, letterSpacing: '-1px', marginBottom: 12, color: 'var(--t1)' }}>
              Create your account
            </h1>
            <p style={{ color: 'var(--t2)', marginBottom: 32, fontSize: '.95rem' }}>
              We&apos;ll use this to set up your hosting and onboarding.
            </p>

            <div style={{ maxWidth: 420, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '.8rem', color: 'var(--t2)', marginBottom: 6, display: 'block', textAlign: 'left' }}>Full Name *</label>
                <input type="text" value={answers.name} onChange={e => update('name', e.target.value)}
                  placeholder="Jane Smith"
                  style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,.06)', border: '1px solid var(--bdr2)', borderRadius: 10, color: 'var(--t1)', fontSize: '.9rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '.8rem', color: 'var(--t2)', marginBottom: 6, display: 'block', textAlign: 'left' }}>Email *</label>
                <input type="email" value={answers.email} onChange={e => update('email', e.target.value)}
                  placeholder="jane@business.com"
                  style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,.06)', border: '1px solid var(--bdr2)', borderRadius: 10, color: 'var(--t1)', fontSize: '.9rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '.8rem', color: 'var(--t2)', marginBottom: 6, display: 'block', textAlign: 'left' }}>Phone <span style={{ color: 'var(--t3)' }}>(optional)</span></label>
                <input type="tel" value={answers.phone} onChange={e => update('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,.06)', border: '1px solid var(--bdr2)', borderRadius: 10, color: 'var(--t1)', fontSize: '.9rem' }} />
              </div>

              <button
                onClick={() => {
                  if (!answers.name || !answers.email) return;
                  if (selectedPlan) {
                    handleSubmit();
                  } else {
                    setStep(3);
                  }
                }}
                disabled={!answers.name || !answers.email || submitting}
                style={{
                  padding: '14px 28px', background: '#fff', color: '#03060e', borderRadius: 100, border: 'none',
                  fontSize: '.9rem', fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
                  gap: 8, margin: '8px auto 0', opacity: (!answers.name || !answers.email || submitting) ? 0.5 : 1,
                }}
              >
                {submitting ? 'Setting up your account...' : selectedPlan ? `Continue to Payment` : 'Choose a Plan'} {!submitting && <ArrowRight style={{ width: 16, height: 16 }} />}
              </button>
              {submitError && (
                <p style={{ color: '#ef4444', fontSize: '.82rem', marginTop: 12 }}>{submitError}</p>
              )}

              <p style={{ fontSize: '.72rem', color: 'var(--t3)', marginTop: 4, lineHeight: 1.6 }}>
                By continuing you agree to our <a href="/legal/terms" style={{ color: 'var(--t2)', textDecoration: 'underline' }}>Terms of Service</a> and <a href="/legal/privacy" style={{ color: 'var(--t2)', textDecoration: 'underline' }}>Privacy Policy</a>.
              </p>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: Choose your plan ═══ */}
        {step === 3 && !submitted && (() => {
          const rec = getRecommendation();
          const recommendedSlug = rec.plan.toLowerCase();
          const allPlans = [
            { slug: 'minimum', name: 'Minimum', price: '$50', desc: 'Everything you need to launch a fast, secure WordPress site.', features: ['10 GB SSD Storage', '50 GB Bandwidth', 'Staging Environment', 'Daily Backups', 'Free SSL + CDN', 'Standard Onboarding', 'Email Support'] },
            { slug: 'growth', name: 'Growth', price: '$129', desc: 'For growing businesses that need more power and hands-on support.', features: ['30 GB SSD Storage', '200 GB Bandwidth', 'Staging Environment', 'Daily Backups', 'Free SSL + CDN', 'SEO Audit & Setup', 'WooCommerce Setup', 'Email Support'] },
            { slug: 'performance', name: 'Performance', price: '$350', desc: 'Enterprise-grade hosting with dedicated support and concierge onboarding.', features: ['100 GB SSD Storage', 'Unlimited Bandwidth', 'Staging Environment', 'Daily Backups', 'Free SSL + CDN + WAF', 'Custom Theme Included', 'WooCommerce Setup', 'Dedicated Account Manager', 'Priority Support (4hr)'] },
          ];
          const activePlan = chosenPlan || recommendedSlug;

          return (
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', marginBottom: 24, fontSize: '.85rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ArrowLeft style={{ width: 14, height: 14 }} /> Back
              </button>

              <h1 style={{ fontSize: 'clamp(1.6rem,3.5vw,2.2rem)', fontWeight: 400, letterSpacing: '-1px', marginBottom: 12, color: 'var(--t1)' }}>
                Choose your plan
              </h1>
              <p style={{ color: 'var(--t2)', marginBottom: 40, fontSize: '.95rem' }}>
                Based on what you told us, we recommend <strong style={{ color: 'var(--t1)' }}>{rec.plan}</strong>. But you can pick any plan.
              </p>

              <div className="gs-plans-grid">
                {allPlans.map(p => {
                  const isRecommended = p.slug === recommendedSlug;
                  const isActive = p.slug === activePlan;
                  return (
                    <div
                      key={p.slug}
                      onClick={() => setChosenPlan(p.slug)}
                      style={{
                        background: isActive ? 'rgba(37,99,235,.06)' : 'rgba(255,255,255,.03)',
                        border: `2px solid ${isActive ? '#2563EB' : 'rgba(255,255,255,.08)'}`,
                        borderRadius: 18,
                        padding: '28px 24px',
                        cursor: 'pointer',
                        transition: 'all .2s',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {isRecommended && (
                        <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: '#2563EB', color: '#fff', fontSize: '.62rem', fontWeight: 600, padding: '3px 14px', borderRadius: 100, letterSpacing: '.5px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                          Recommended
                        </div>
                      )}
                      <div style={{ fontSize: '.68rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '2.5px', color: '#2563EB', marginBottom: 8 }}>{p.name}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                        <span style={{ fontSize: '2rem', fontWeight: 600, color: '#fff', letterSpacing: '-1px' }}>{p.price}</span>
                        <span style={{ fontSize: '.8rem', color: 'var(--t3)', fontWeight: 300 }}>/mo</span>
                      </div>
                      <p style={{ fontSize: '.78rem', color: 'var(--t3)', lineHeight: 1.6, fontWeight: 300, marginBottom: 20 }}>{p.desc}</p>
                      <div style={{ flex: 1 }}>
                        {p.features.map(f => (
                          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                            <Check style={{ width: 14, height: 14, color: '#22c55e', flexShrink: 0 }} />
                            <span style={{ fontSize: '.78rem', color: 'var(--t2)', fontWeight: 300 }}>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => { setChosenPlan(activePlan); handleSubmit(); }}
                disabled={submitting}
                style={{
                  padding: '14px 36px', background: '#fff', color: '#03060e', borderRadius: 100, border: 'none',
                  fontSize: '.9rem', fontWeight: 500, cursor: 'pointer', marginTop: 32,
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  opacity: submitting ? 0.5 : 1,
                }}
              >
                {submitting ? 'Setting up your account...' : `Get Started with ${allPlans.find(p => p.slug === activePlan)?.name ?? 'Growth'}`} {!submitting && <ArrowRight style={{ width: 16, height: 16 }} />}
              </button>
              {submitError && (
                <p style={{ color: '#ef4444', fontSize: '.82rem', marginTop: 12 }}>{submitError}</p>
              )}
            </div>
          );
        })()}

        {/* ═══ SUBMITTED ═══ */}
        {submitted && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Check style={{ width: 32, height: 32, color: '#22c55e' }} />
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 500, color: 'var(--t1)', marginBottom: 8 }}>We&apos;ve got your details!</h1>
            <p style={{ color: 'var(--t2)', fontSize: '.95rem', maxWidth: 440, margin: '0 auto 32px', lineHeight: 1.7 }}>
              Our team will review your information and reach out within 24 hours to get you set up. If you selected an onboarding call, we&apos;ll send you a booking link.
            </p>
            <Link href="/" className="bp lg" style={{ display: 'inline-flex' }}>
              Back to Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
