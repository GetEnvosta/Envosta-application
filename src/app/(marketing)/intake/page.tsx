'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

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

interface IntakePlan {
  id: string;        // slug — used as form.plan value
  name: string;
  price: string;     // monthly $X (USD)
  annual: string;    // annual displayed per-month $X (USD)
  annualTotal: string; // annual full charge "$Y/yr"
  currency: 'USD';
  features: string[];
  featured?: boolean;
}

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
  const [PLANS, setPlans] = useState<IntakePlan[]>([]);

  // Fetch live plan data — keeps the intake form in sync with admin pricing
  // changes instead of namedropping fixed dollar amounts that drift.
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('products')
      .select('slug, name, description, price_usd, price_yearly_usd, price_cad, price_yearly_cad, features, metadata')
      .eq('type', 'hosting_plan')
      .eq('is_active', true)
      .then(({ data }) => {
        // Sort by CAD price so order is deterministic regardless of the
        // sort_order field state in the DB.
        const rows = ((data ?? []) as any[])
          .slice()
          .sort((a, b) => (a.price_cad ?? a.price_usd ?? 0) - (b.price_cad ?? b.price_usd ?? 0));
        const featuredSlug = rows.length >= 3
          ? rows[Math.floor(rows.length / 2)]?.slug
          : rows[rows.length - 1]?.slug;
        const dollars = (cents: number | null | undefined) =>
          cents ? `$${Math.round(cents / 100)}` : '$0';

        // Same fallback ladder as the public pricing page — synthesize a
        // feature list from metadata when features[] is empty so plans
        // don't render with zero bullets.
        const buildFeatures = (p: any): string[] => {
          if (Array.isArray(p.features) && p.features.length > 0) return p.features;
          const meta = p.metadata ?? {};
          const out: string[] = [];
          const sites = meta.sites_allowed;
          if (typeof sites === 'number') {
            out.push(sites <= 1 ? '1 site' : `Up to ${sites} sites`);
          }
          if (meta.storage_gb) out.push(`${meta.storage_gb} GB SSD`);
          out.push('Free SSL + CDN');
          if (meta.has_backups !== false) out.push('Daily backups & auto-updates');
          if (meta.has_staging) out.push('Staging environment');
          if (meta.onboarding_type === 'guided') out.push('Guided onboarding');
          else if (meta.onboarding_type === 'concierge' || meta.onboarding_type === 'white_glove') {
            out.push('Done-with-you onboarding');
          }
          out.push(meta.support_type === 'priority' ? 'Priority support'
            : meta.support_type === 'dedicated' ? 'Dedicated support'
            : 'Email support');
          const slug = String(p.slug || '').toLowerCase();
          if (slug.includes('growth')) {
            if (!out.some(f => /seo/i.test(f))) out.push('SEO optimization with AI');
            if (!out.some(f => /woo/i.test(f))) out.push('WooCommerce ready');
          } else if (slug.includes('standard') && !out.some(f => /woo/i.test(f))) {
            out.push('WooCommerce ready');
          }
          return out;
        };

        const formatted: IntakePlan[] = rows.map((p) => {
          const monthly = p.price_usd ?? p.price_cad ?? 0;
          const yearly = p.price_yearly_usd ?? p.price_yearly_cad ?? 0;
          return {
            id: p.slug,
            name: p.name,
            price: dollars(monthly),
            annual: dollars(yearly ? Math.round(yearly / 12) : 0),
            annualTotal: yearly ? `$${Math.round(yearly / 100).toLocaleString()}/yr` : '',
            currency: 'USD',
            features: buildFeatures(p),
            featured: p.slug === featuredSlug,
          };
        });
        setPlans(formatted);
      });
  }, []);

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
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  }

  function reset() {
    setForm(initial);
    setStatus('idle');
    setErrorMsg('');
  }

  return (
    <>
      <style>{`
        .sh{text-align:left;margin-bottom:56px}
        .sh-tag{display:inline-block;font-size:.72rem;font-weight:500;text-transform:uppercase;letter-spacing:3px;color:var(--gold);margin-bottom:10px}
        .sh h2{font-family:'Inter',sans-serif;font-size:clamp(2rem,4vw,3.2rem);font-weight:500;letter-spacing:-1px;line-height:1.1;color:var(--t1)}
        .sh-desc{font-size:.95rem;color:var(--t2);line-height:1.75;font-weight:300;margin-top:16px;max-width:560px}
        .rv{opacity:0;transform:translateY(20px);transition:opacity .6s,transform .6s}.rv.v{opacity:1;transform:none}

        .hero{padding:160px 0 80px;position:relative;overflow:hidden;display:flex;align-items:center}
        .hero-overlay{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 30%,rgba(37,99,235,.15),transparent 65%);z-index:0}
        .hero .c{position:relative;z-index:2;text-align:center}
        .hero-text{max-width:720px;margin:0 auto}
        .hero-text h1{font-family:'Inter',sans-serif;font-size:clamp(2.4rem,5vw,3.8rem);font-weight:600;line-height:1.08;letter-spacing:-2px;margin-bottom:28px;background:linear-gradient(180deg,#fff 30%,rgba(255,255,255,.7));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .hero-text p{font-size:1.05rem;color:var(--t2);max-width:520px;margin-left:auto;margin-right:auto;line-height:1.8;font-weight:300}

        .form-zone{background:#050a14;border-radius:48px 48px 0 0;margin-top:-48px;position:relative;z-index:2;border-top:1px solid var(--bdr);padding:80px 0 100px;overflow:hidden}
        .form-zone::before{content:'';position:absolute;top:-30%;left:-20%;width:80%;height:90%;background:radial-gradient(ellipse,rgba(37,99,235,.08),transparent 55%);pointer-events:none;z-index:0}
        .form-zone .c{position:relative;z-index:1}

        .intake-form{max-width:720px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:20px}
        .intake-form .full{grid-column:1/-1}

        .intake-form label{display:block;font-size:.72rem;font-weight:500;text-transform:uppercase;letter-spacing:1.5px;color:var(--t2);margin-bottom:6px}
        .intake-form input,
        .intake-form select,
        .intake-form textarea{
          width:100%;background:rgba(255,255,255,.04);border:1px solid var(--bdr);border-radius:12px;
          padding:14px 16px;font-size:.92rem;color:var(--t1);font-family:inherit;outline:none;
          transition:border-color .2s
        }
        .intake-form input:focus,
        .intake-form select:focus,
        .intake-form textarea:focus{border-color:var(--gold)}
        .intake-form input::placeholder,
        .intake-form textarea::placeholder{color:var(--t3)}
        .intake-form select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%237889a3' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 16px center}
        .intake-form select option{background:#0b1220;color:var(--t1)}
        .intake-form textarea{resize:vertical;min-height:100px}

        .submit-btn{
          display:inline-flex;align-items:center;justify-content:center;gap:8px;
          background:var(--gold);color:#fff;font-weight:600;font-size:.95rem;
          padding:16px 40px;border-radius:12px;border:none;cursor:pointer;
          transition:opacity .2s;font-family:inherit;width:100%
        }
        .submit-btn:hover{opacity:.9}
        .submit-btn:disabled{opacity:.5;cursor:not-allowed}

        .success-card{max-width:520px;margin:0 auto;text-align:center;padding:60px 40px;background:rgba(255,255,255,.03);border:1px solid rgba(52,211,153,.2);border-radius:24px}
        .success-card h3{font-size:1.4rem;font-weight:500;color:var(--t1);margin-bottom:12px}
        .success-card p{font-size:.92rem;color:var(--t2);line-height:1.7;font-weight:300;margin-bottom:24px}
        .success-icon{width:64px;height:64px;border-radius:50%;background:rgba(52,211,153,.1);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;color:#34d399;font-size:28px}

        .error-msg{grid-column:1/-1;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:12px;padding:14px 18px;font-size:.88rem;color:#f87171;font-weight:400}

        .section-divider{
          grid-column:1/-1;font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:2px;
          color:var(--gold);padding:16px 0 4px;border-top:1px solid var(--bdr);margin-top:8px
        }

        /* ── Plan Picker ── */
        .plan-grid{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
        .plan-card{
          background:rgba(255,255,255,.03);border:2px solid var(--bdr);border-radius:16px;
          padding:24px 20px;cursor:pointer;transition:all .25s;position:relative;text-align:center
        }
        .plan-card:hover{border-color:rgba(37,99,235,.3)}
        .plan-card.selected{border-color:var(--gold);background:rgba(37,99,235,.06)}
        .plan-card.featured-plan::before{
          content:'Popular';position:absolute;top:-10px;left:50%;transform:translateX(-50%);
          background:var(--gold);color:#fff;font-size:.62rem;font-weight:600;padding:2px 12px;
          border-radius:100px;letter-spacing:.5px;text-transform:uppercase
        }
        .plan-name{font-size:.68rem;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:var(--gold);margin-bottom:8px}
        .plan-price{font-size:1.8rem;font-weight:600;color:var(--t1);line-height:1;margin-bottom:2px}
        .plan-period{font-size:.75rem;color:var(--t3);font-weight:300;margin-bottom:12px}
        .plan-features{list-style:none;padding:0;margin:0}
        .plan-features li{font-size:.76rem;color:var(--t2);padding:3px 0;font-weight:300}

        .billing-toggle-wrap{
          grid-column:1/-1;display:flex;align-items:center;justify-content:center;gap:14px;
          padding:8px 0 4px
        }
        .billing-opt{
          font-size:.84rem;color:var(--t3);font-weight:400;cursor:pointer;transition:color .2s;
          padding:6px 16px;border-radius:8px;border:1px solid transparent
        }
        .billing-opt.active{color:var(--t1);font-weight:500;border-color:var(--bdr);background:rgba(255,255,255,.04)}
        .billing-save{font-size:.68rem;font-weight:600;color:#22c55e;background:rgba(34,197,94,.12);padding:2px 10px;border-radius:100px}

        .design-note{
          grid-column:1/-1;background:rgba(201,164,92,.06);border:1px solid rgba(201,164,92,.15);
          border-radius:14px;padding:20px 24px;display:flex;gap:14px;align-items:flex-start
        }
        .design-note-icon{flex-shrink:0;width:36px;height:36px;border-radius:10px;background:rgba(201,164,92,.12);display:flex;align-items:center;justify-content:center;color:#c9a45c;font-size:18px}
        .design-note h4{font-size:.86rem;font-weight:500;color:var(--t1);margin-bottom:4px}
        .design-note p{font-size:.78rem;color:var(--t2);line-height:1.6;font-weight:300}

        .close-toggle{
          grid-column:1/-1;display:flex;align-items:center;gap:12px;
          background:rgba(52,211,153,.05);border:1px solid rgba(52,211,153,.15);border-radius:14px;
          padding:18px 24px;cursor:pointer;transition:border-color .2s
        }
        .close-toggle:hover{border-color:rgba(52,211,153,.3)}
        .close-checkbox{
          width:22px;height:22px;border-radius:6px;border:2px solid var(--bdr);flex-shrink:0;
          display:flex;align-items:center;justify-content:center;transition:all .2s;font-size:14px;color:#fff
        }
        .close-checkbox.checked{background:var(--gold);border-color:var(--gold)}
        .close-toggle-text h4{font-size:.88rem;font-weight:500;color:var(--t1);margin-bottom:2px}
        .close-toggle-text p{font-size:.76rem;color:var(--t2);font-weight:300}

        @media(max-width:768px){
          .plan-grid{grid-template-columns:1fr}
        }
        @media(max-width:640px){
          .intake-form{grid-template-columns:1fr}
        }
      `}</style>

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
                    <span className="billing-save">Save 25%</span>
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
                          CAD/mo {form.billing === 'annual' && plan.annualTotal && `\u00b7 ${plan.annualTotal}`}
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
