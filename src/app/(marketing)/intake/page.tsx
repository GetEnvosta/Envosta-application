'use client';

import { useEffect, useState } from 'react';

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
};

export default function IntakePage() {
  const [form, setForm] = useState<FormData>(initial);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

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
