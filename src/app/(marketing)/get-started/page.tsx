'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, Globe, Paintbrush, Phone, Calendar, Building2, Target, Users, Zap, Check } from 'lucide-react';

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

export default function GetStartedPage() {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    intent: '',       // 'plans' | 'talk'
    situation: '',    // 'existing' | 'new'
    contact: '',      // 'call' | 'urgent'
    businessName: '',
    website: '',
    industry: '',
    goals: '',
    size: '',         // 'small' | 'medium' | 'large' | 'ecommerce'
    timeline: '',
    name: '',
    email: '',
    phone: '',
  });
  const [submitted, setSubmitted] = useState(false);

  function update(field: string, value: string) {
    setAnswers(prev => ({ ...prev, [field]: value }));
  }

  function getRecommendation() {
    const size = answers.size || 'small';
    const situation = answers.situation || 'new';
    const key = `${size}-${situation}`;
    return PLAN_RECOMMENDATIONS[key] ?? PLAN_RECOMMENDATIONS['small-new'];
  }

  function handleSubmit() {
    setSubmitted(true);
    // Placeholder — will send to backend later
  }

  return (
    <div style={{ paddingTop: 100, paddingBottom: 80, minHeight: '100vh' }}>
      <div className="c" style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Progress */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 48 }}>
          {[1, 2, 3, 4].map(s => (
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

        {/* ═══ STEP 1: What brings you here? ═══ */}
        {step === 1 && (
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 400, letterSpacing: '-1px', marginBottom: 12, color: 'var(--t1)' }}>
              Let&apos;s get you started
            </h1>
            <p style={{ color: 'var(--t2)', marginBottom: 40, fontSize: '.95rem' }}>
              What brings you to Envosta today?
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 560, margin: '0 auto' }}>
              <button
                onClick={() => { update('intent', 'plans'); setStep(2); }}
                style={{
                  background: 'rgba(255,255,255,.04)', border: '1px solid var(--bdr2)', borderRadius: 16,
                  padding: '32px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all .2s',
                }}
                onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
                onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--bdr2)')}
              >
                <Zap style={{ width: 32, height: 32, color: 'var(--gold)', margin: '0 auto 12px' }} />
                <p style={{ fontWeight: 500, color: 'var(--t1)', marginBottom: 6 }}>I know what I need</p>
                <p style={{ fontSize: '.8rem', color: 'var(--t3)' }}>Take me to the plans</p>
              </button>

              <button
                onClick={() => { update('intent', 'talk'); setStep(2); }}
                style={{
                  background: 'rgba(255,255,255,.04)', border: '1px solid var(--bdr2)', borderRadius: 16,
                  padding: '32px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all .2s',
                }}
                onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
                onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--bdr2)')}
              >
                <Users style={{ width: 32, height: 32, color: 'var(--gold)', margin: '0 auto 12px' }} />
                <p style={{ fontWeight: 500, color: 'var(--t1)', marginBottom: 6 }}>I want to talk to someone</p>
                <p style={{ fontSize: '.8rem', color: 'var(--t3)' }}>Help me figure it out</p>
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: Your situation ═══ */}
        {step === 2 && (
          <div style={{ textAlign: 'center' }}>
            <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', marginBottom: 24, fontSize: '.85rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ArrowLeft style={{ width: 14, height: 14 }} /> Back
            </button>

            <h1 style={{ fontSize: 'clamp(1.6rem,3.5vw,2.2rem)', fontWeight: 400, letterSpacing: '-1px', marginBottom: 12, color: 'var(--t1)' }}>
              Tell us about your situation
            </h1>
            <p style={{ color: 'var(--t2)', marginBottom: 40, fontSize: '.95rem' }}>
              Where are you at right now?
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 560, margin: '0 auto', marginBottom: 24 }}>
              <button
                onClick={() => { update('situation', 'existing'); setStep(answers.intent === 'plans' ? 3 : 3); }}
                style={{
                  background: 'rgba(255,255,255,.04)', border: '1px solid var(--bdr2)', borderRadius: 16,
                  padding: '28px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all .2s',
                }}
                onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
                onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--bdr2)')}
              >
                <Globe style={{ width: 28, height: 28, color: 'var(--gold)', margin: '0 auto 10px' }} />
                <p style={{ fontWeight: 500, color: 'var(--t1)', marginBottom: 4 }}>I have a website</p>
                <p style={{ fontSize: '.78rem', color: 'var(--t3)' }}>Looking to move to Envosta</p>
              </button>

              <button
                onClick={() => { update('situation', 'new'); setStep(3); }}
                style={{
                  background: 'rgba(255,255,255,.04)', border: '1px solid var(--bdr2)', borderRadius: 16,
                  padding: '28px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all .2s',
                }}
                onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
                onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--bdr2)')}
              >
                <Paintbrush style={{ width: 28, height: 28, color: 'var(--gold)', margin: '0 auto 10px' }} />
                <p style={{ fontWeight: 500, color: 'var(--t1)', marginBottom: 4 }}>I need a new website</p>
                <p style={{ fontSize: '.78rem', color: 'var(--t3)' }}>Build something from scratch</p>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 560, margin: '0 auto' }}>
              <button
                onClick={() => { update('contact', 'call'); setStep(3); }}
                style={{
                  background: 'rgba(255,255,255,.04)', border: '1px solid var(--bdr2)', borderRadius: 16,
                  padding: '28px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all .2s',
                }}
                onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
                onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--bdr2)')}
              >
                <Calendar style={{ width: 28, height: 28, color: 'var(--gold)', margin: '0 auto 10px' }} />
                <p style={{ fontWeight: 500, color: 'var(--t1)', marginBottom: 4 }}>Book an onboarding call</p>
                <p style={{ fontSize: '.78rem', color: 'var(--t3)' }}>We&apos;ll walk you through everything</p>
              </button>

              <button
                onClick={() => { update('contact', 'urgent'); setStep(3); }}
                style={{
                  background: 'rgba(255,255,255,.04)', border: '1px solid var(--bdr2)', borderRadius: 16,
                  padding: '28px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all .2s',
                }}
                onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
                onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--bdr2)')}
              >
                <Phone style={{ width: 28, height: 28, color: 'var(--gold)', margin: '0 auto 10px' }} />
                <p style={{ fontWeight: 500, color: 'var(--t1)', marginBottom: 4 }}>I need to talk now</p>
                <p style={{ fontSize: '.78rem', color: 'var(--t3)' }}>It&apos;s urgent, let&apos;s connect</p>
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: Business intake form ═══ */}
        {step === 3 && (
          <div>
            <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', marginBottom: 24, fontSize: '.85rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ArrowLeft style={{ width: 14, height: 14 }} /> Back
            </button>

            <h1 style={{ fontSize: 'clamp(1.6rem,3.5vw,2.2rem)', fontWeight: 400, letterSpacing: '-1px', marginBottom: 12, color: 'var(--t1)', textAlign: 'center' }}>
              Tell us about your business
            </h1>
            <p style={{ color: 'var(--t2)', marginBottom: 32, fontSize: '.95rem', textAlign: 'center' }}>
              This helps us recommend the right plan and prepare for your onboarding.
            </p>

            <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ fontSize: '.8rem', color: 'var(--t2)', marginBottom: 6, display: 'block' }}>Your Name *</label>
                  <input type="text" value={answers.name} onChange={e => update('name', e.target.value)}
                    placeholder="Jane Smith"
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,.06)', border: '1px solid var(--bdr2)', borderRadius: 10, color: 'var(--t1)', fontSize: '.9rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '.8rem', color: 'var(--t2)', marginBottom: 6, display: 'block' }}>Email *</label>
                  <input type="email" value={answers.email} onChange={e => update('email', e.target.value)}
                    placeholder="jane@business.com"
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,.06)', border: '1px solid var(--bdr2)', borderRadius: 10, color: 'var(--t1)', fontSize: '.9rem' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ fontSize: '.8rem', color: 'var(--t2)', marginBottom: 6, display: 'block' }}>Business Name</label>
                  <input type="text" value={answers.businessName} onChange={e => update('businessName', e.target.value)}
                    placeholder="Your Business"
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,.06)', border: '1px solid var(--bdr2)', borderRadius: 10, color: 'var(--t1)', fontSize: '.9rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '.8rem', color: 'var(--t2)', marginBottom: 6, display: 'block' }}>Industry</label>
                  <input type="text" value={answers.industry} onChange={e => update('industry', e.target.value)}
                    placeholder="e.g. Landscaping, Salon, Consulting"
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,.06)', border: '1px solid var(--bdr2)', borderRadius: 10, color: 'var(--t1)', fontSize: '.9rem' }} />
                </div>
              </div>

              {answers.situation === 'existing' && (
                <div>
                  <label style={{ fontSize: '.8rem', color: 'var(--t2)', marginBottom: 6, display: 'block' }}>Current Website URL</label>
                  <input type="url" value={answers.website} onChange={e => update('website', e.target.value)}
                    placeholder="https://yourbusiness.com"
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,.06)', border: '1px solid var(--bdr2)', borderRadius: 10, color: 'var(--t1)', fontSize: '.9rem' }} />
                </div>
              )}

              <div>
                <label style={{ fontSize: '.8rem', color: 'var(--t2)', marginBottom: 6, display: 'block' }}>What does your business need from a website?</label>
                <select value={answers.size} onChange={e => update('size', e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,.06)', border: '1px solid var(--bdr2)', borderRadius: 10, color: 'var(--t1)', fontSize: '.9rem' }}>
                  <option value="">Select...</option>
                  <option value="small">A simple business website (info, contact, portfolio)</option>
                  <option value="medium">A growing site with blog, forms, or integrations</option>
                  <option value="large">A high-traffic site needing performance &amp; security</option>
                  <option value="ecommerce">An online store (WooCommerce / e-commerce)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '.8rem', color: 'var(--t2)', marginBottom: 6, display: 'block' }}>What are your goals?</label>
                <textarea value={answers.goals} onChange={e => update('goals', e.target.value)}
                  placeholder="Tell us what you're looking to achieve..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,.06)', border: '1px solid var(--bdr2)', borderRadius: 10, color: 'var(--t1)', fontSize: '.9rem', resize: 'vertical' }} />
              </div>

              <div>
                <label style={{ fontSize: '.8rem', color: 'var(--t2)', marginBottom: 6, display: 'block' }}>Phone Number <span style={{ color: 'var(--t3)' }}>(optional)</span></label>
                <input type="tel" value={answers.phone} onChange={e => update('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,.06)', border: '1px solid var(--bdr2)', borderRadius: 10, color: 'var(--t1)', fontSize: '.9rem' }} />
              </div>

              <button
                onClick={() => { if (answers.name && answers.email) setStep(4); }}
                disabled={!answers.name || !answers.email}
                style={{
                  padding: '14px 28px', background: '#fff', color: '#03060e', borderRadius: 100, border: 'none',
                  fontSize: '.9rem', fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
                  gap: 8, margin: '0 auto', opacity: (!answers.name || !answers.email) ? 0.5 : 1,
                }}
              >
                See My Recommendation <ArrowRight style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 4: Recommendation ═══ */}
        {step === 4 && !submitted && (
          <div style={{ textAlign: 'center' }}>
            <button onClick={() => setStep(3)} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', marginBottom: 24, fontSize: '.85rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ArrowLeft style={{ width: 14, height: 14 }} /> Back
            </button>

            <h1 style={{ fontSize: 'clamp(1.6rem,3.5vw,2.2rem)', fontWeight: 400, letterSpacing: '-1px', marginBottom: 12, color: 'var(--t1)' }}>
              Our recommendation for you
            </h1>
            <p style={{ color: 'var(--t2)', marginBottom: 40, fontSize: '.95rem' }}>
              Based on what you told us, here&apos;s what we think is the best fit.
            </p>

            {(() => {
              const rec = getRecommendation();
              const plans: Record<string, { price: string; features: string[] }> = {
                Minimum: { price: '$50', features: ['25 GB Storage', 'Staging Environment', 'Daily Backups', 'Free SSL + CDN', 'Standard Onboarding', 'Email Support'] },
                Growth: { price: '$129', features: ['50 GB Storage', 'Staging Environment', 'Daily Backups', 'Free SSL + CDN', 'Guided Onboarding + SEO', 'Priority Support (24hr)'] },
                Performance: { price: '$350', features: ['125 GB Storage', 'Staging Environment', 'Daily Backups', 'Free SSL + CDN + WAF', 'Concierge Onboarding', 'WooCommerce Setup', 'Dedicated Support (4hr)'] },
              };
              const plan = plans[rec.plan];

              return (
                <div style={{ maxWidth: 480, margin: '0 auto', background: 'rgba(37,99,235,.06)', border: '2px solid rgba(37,99,235,.2)', borderRadius: 20, padding: '40px 32px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--gold)', color: '#fff', fontSize: '.7rem', fontWeight: 600, padding: '4px 16px', borderRadius: 100, letterSpacing: '.5px', textTransform: 'uppercase' }}>
                    Recommended
                  </div>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 500, color: 'var(--t1)', marginBottom: 4 }}>{rec.plan}</h2>
                  <p style={{ fontSize: '2rem', fontWeight: 600, color: '#fff', marginBottom: 8 }}>
                    {plan.price} <span style={{ fontSize: '.9rem', fontWeight: 300, color: 'var(--t3)' }}>CAD/mo</span>
                  </p>
                  <p style={{ fontSize: '.88rem', color: 'var(--t2)', marginBottom: 24, lineHeight: 1.6 }}>{rec.reason}</p>

                  <div style={{ textAlign: 'left', marginBottom: 28 }}>
                    {plan.features.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                        <Check style={{ width: 16, height: 16, color: '#22c55e', flexShrink: 0 }} />
                        <span style={{ fontSize: '.85rem', color: 'var(--t2)' }}>{f}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleSubmit}
                    style={{
                      padding: '14px 32px', background: '#fff', color: '#03060e', borderRadius: 100, border: 'none',
                      fontSize: '.9rem', fontWeight: 500, cursor: 'pointer', width: '100%',
                    }}
                  >
                    Get Started with {rec.plan}
                  </button>

                  <Link href="/pricing" style={{ display: 'block', marginTop: 16, fontSize: '.82rem', color: 'var(--t3)', textDecoration: 'underline' }}>
                    View all plans
                  </Link>
                </div>
              );
            })()}
          </div>
        )}

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
