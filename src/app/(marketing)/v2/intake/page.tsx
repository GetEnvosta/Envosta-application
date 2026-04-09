'use client';

import { useEffect, useState } from 'react';
import { AiIntakeSummary } from '@/components/admin/ai-intake-summary';

const INDUSTRIES = [
  'Restaurant / Food Service',
  'Retail / E-commerce',
  'Healthcare / Medical',
  'Real Estate',
  'Professional Services',
  'Construction / Trades',
  'Fitness / Wellness',
  'Beauty / Salon',
  'Automotive',
  'Non-Profit',
  'Education',
  'Technology',
  'Other',
];

const PROJECT_TYPES = [
  'New Website',
  'Website Redesign',
  'Site Migration',
  'E-commerce Store',
  'Landing Page',
  'Other',
];

const BUDGETS = [
  '$500 – $2,000',
  '$2,000 – $5,000',
  '$5,000 – $10,000',
  '$10,000+',
];

const TIMELINES = [
  'ASAP',
  '1 – 2 months',
  '3 – 6 months',
  'No rush',
];

const PLANS = [
  {
    id: 'minimum',
    name: 'Minimum',
    price: '$50',
    annual: '$42',
    annualTotal: '$500/yr',
    features: ['10 GB SSD', '50 GB bandwidth', 'Daily backups', 'Staging env', 'Free migration'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '$129',
    annual: '$108',
    annualTotal: '$1,290/yr',
    featured: true,
    features: ['30 GB SSD', '200 GB bandwidth', 'Daily backups', 'SEO audit', 'WooCommerce setup'],
  },
  {
    id: 'performance',
    name: 'Performance',
    price: '$350',
    annual: '$292',
    annualTotal: '$3,500/yr',
    features: ['100 GB SSD', 'Unlimited bandwidth', 'Priority support', 'Custom theme', 'Dedicated team'],
  },
];

const BILLING_OPTIONS = ['monthly', 'annual'] as const;

interface FormData {
  salesRep: string;
  contactName: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  industry: string;
  projectType: string;
  budget: string;
  timeline: string;
  notes: string;
  plan: string;
  billing: string;
  closedOnSpot: boolean;
}

const initial: FormData = {
  salesRep: '',
  contactName: '',
  email: '',
  phone: '',
  company: '',
  website: '',
  industry: '',
  projectType: '',
  budget: '',
  timeline: '',
  notes: '',
  plan: '',
  billing: 'monthly',
  closedOnSpot: false,
};

export default function IntakePage() {
  const [form, setForm] = useState<FormData>(initial);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [aiSummary, setAiSummary] = useState('');

  useEffect(() => {
    document.querySelectorAll('.rv').forEach((el) => {
      new IntersectionObserver(
        (entries) => { if (entries[0].isIntersecting) entries[0].target.classList.add('v'); },
        { threshold: 0.05 },
      ).observe(el);
    });
  }, []);

  function set(key: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error || 'Something went wrong');
        return;
      }
      setStatus('success');

      // Fetch AI summary in the background (non-blocking)
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (supabaseUrl) {
          const aiRes = await fetch(`${supabaseUrl}/functions/v1/ai-intake-summary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });
          const aiData = await aiRes.json();
          if (aiData.summary) setAiSummary(aiData.summary);
        }
      } catch { /* AI summary is optional */ }
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  }

  function reset() {
    setForm(initial);
    setStatus('idle');
    setErrorMsg('');
    setAiSummary('');
  }

  return (
    <>
      {/* ═══ HERO ═══ */}
      <section className="hero">
        <div className="hero-overlay" />
        <div className="c" style={{ maxWidth: 1320, margin: '0 auto', padding: '0 24px' }}>
          <div className="hero-text rv">
            <h1>Sales Intake Form</h1>
            <p>Capture warm leads on the spot. This form creates a sales ticket visible in the admin dashboard.</p>
          </div>
        </div>
      </section>

      {/* ═══ FORM ZONE ═══ */}
      <section className="form-zone">
        <div className="c" style={{ maxWidth: 1320, margin: '0 auto', padding: '0 24px' }}>
          {status === 'success' ? (
            <div className="success-card rv v">
              <div className="success-icon">&#10003;</div>
              <h3>Lead Submitted</h3>
              <p>The sales ticket has been created and the team has been notified. You can view it in the admin dashboard.</p>
              <button onClick={reset} className="submit-btn" style={{ maxWidth: 240, margin: '0 auto' }}>
                Submit Another
              </button>
              <AiIntakeSummary summary={aiSummary} />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="intake-form rv v">
              {/* ── Sales Rep ── */}
              <div className="section-divider" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>Your Info</div>

              <div className="full">
                <label>Your Name (Sales Rep) *</label>
                <input type="text" required maxLength={200} value={form.salesRep} onChange={set('salesRep')} placeholder="Jane Smith" />
              </div>

              {/* ── Lead Contact ── */}
              <div className="section-divider">Lead Contact</div>

              <div>
                <label>Contact Name *</label>
                <input type="text" required maxLength={200} value={form.contactName} onChange={set('contactName')} placeholder="John Doe" />
              </div>
              <div>
                <label>Email *</label>
                <input type="email" required maxLength={320} value={form.email} onChange={set('email')} placeholder="john@example.com" />
              </div>
              <div>
                <label>Phone *</label>
                <input type="tel" required maxLength={30} value={form.phone} onChange={set('phone')} placeholder="(555) 123-4567" />
              </div>
              <div>
                <label>Company / Business Name *</label>
                <input type="text" required maxLength={200} value={form.company} onChange={set('company')} placeholder="Acme LLC" />
              </div>

              {/* ── Business Details ── */}
              <div className="section-divider">Business Details</div>

              <div>
                <label>Current Website URL</label>
                <input type="url" value={form.website} onChange={set('website')} placeholder="https://example.com" />
              </div>
              <div>
                <label>Industry *</label>
                <select required value={form.industry} onChange={set('industry')}>
                  <option value="">Select industry...</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>

              {/* ── Project Info ── */}
              <div className="section-divider">Project Info</div>

              <div>
                <label>Project Type *</label>
                <select required value={form.projectType} onChange={set('projectType')}>
                  <option value="">Select type...</option>
                  {PROJECT_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label>Budget Range *</label>
                <select required value={form.budget} onChange={set('budget')}>
                  <option value="">Select budget...</option>
                  {BUDGETS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label>Timeline *</label>
                <select required value={form.timeline} onChange={set('timeline')}>
                  <option value="">Select timeline...</option>
                  {TIMELINES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* ── Close on the Spot ── */}
              <div className="section-divider">Ready to Close?</div>

              <div
                className="close-toggle"
                onClick={() => setForm(f => ({ ...f, closedOnSpot: !f.closedOnSpot, plan: !f.closedOnSpot ? f.plan : '' }))}
              >
                <div className={`close-checkbox ${form.closedOnSpot ? 'checked' : ''}`}>
                  {form.closedOnSpot && '\u2713'}
                </div>
                <div className="close-toggle-text">
                  <h4>Customer wants to sign up now</h4>
                  <p>Select a hosting plan below. Hosting is charged upfront, design fee of $500 is billed after approval.</p>
                </div>
              </div>

              {form.closedOnSpot && (
                <>
                  {/* Billing toggle */}
                  <div className="billing-toggle-wrap">
                    {BILLING_OPTIONS.map(opt => (
                      <span
                        key={opt}
                        className={`billing-opt ${form.billing === opt ? 'active' : ''}`}
                        onClick={() => setForm(f => ({ ...f, billing: opt }))}
                      >
                        {opt === 'monthly' ? 'Monthly' : 'Annual'}
                      </span>
                    ))}
                    <span className="billing-save">2 months free</span>
                  </div>

                  {/* Plan cards */}
                  <div className="plan-grid">
                    {PLANS.map(plan => (
                      <div
                        key={plan.id}
                        className={`plan-card ${form.plan === plan.id ? 'selected' : ''} ${plan.featured ? 'featured-plan' : ''}`}
                        onClick={() => setForm(f => ({ ...f, plan: plan.id }))}
                      >
                        <div className="plan-name">{plan.name}</div>
                        <div className="plan-price">
                          {form.billing === 'annual' ? plan.annual : plan.price}
                        </div>
                        <div className="plan-period">
                          CAD/mo {form.billing === 'annual' && `\u00b7 ${plan.annualTotal}`}
                        </div>
                        <ul className="plan-features">
                          {plan.features.map(f => <li key={f}>{f}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Design fee note */}
                  <div className="design-note">
                    <div className="design-note-icon">{'\u270E'}</div>
                    <div>
                      <h4>Design Fee: $500 CAD</h4>
                      <p>
                        The design fee covers custom theme design and development. It is <strong>not charged today</strong> — the
                        customer will be invoiced $500 only after they approve the design. Hosting starts immediately on the selected plan.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* ── Notes ── */}
              <div className="full">
                <label>Additional Notes</label>
                <textarea maxLength={5000} value={form.notes} onChange={set('notes')} placeholder="Any extra context — what they need, pain points, current situation..." />
              </div>

              {/* ── Error ── */}
              {status === 'error' && <div className="error-msg">{errorMsg}</div>}

              {/* ── Submit ── */}
              <div className="full">
                <button type="submit" disabled={status === 'loading'} className="submit-btn">
                  {status === 'loading' ? 'Submitting...' : 'Submit Lead'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
