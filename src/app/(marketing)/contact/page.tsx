/**
 * /contact — sales / Enterprise inquiry page.
 *
 * This is where the Enterprise plan card on /plans funnels prospects.
 * Enterprise is custom-priced and has NO self-serve checkout — the lead
 * form here creates a ticket (+ emails sales@envosta.com); the team then
 * follows up, creates the account, and assigns the plan manually.
 *
 * Form submission → /api/contact with type='enterprise'.
 */
import { Building2, ShieldCheck, Headphones, Sparkles } from 'lucide-react';
import { SalesInquiryForm } from './sales-inquiry-form';

export const metadata = {
  title: 'Talk to Sales · Envosta',
  description:
    'Enterprise WordPress hosting — custom-priced, white-glove onboarding, dedicated support. Tell us what you need and we’ll tailor a plan.',
};

const POINTS = [
  {
    icon: Building2,
    title: 'A plan built around you',
    body: 'No fixed tier. We size storage, PHP workers, support, and onboarding to exactly what you’re running.',
  },
  {
    icon: ShieldCheck,
    title: 'Built on wp.cloud (Automattic)',
    body: 'The same infrastructure behind WordPress.com — auto SSL, daily backups, DDoS protection, global edge cache.',
  },
  {
    icon: Headphones,
    title: 'Dedicated support',
    body: 'A named success team and a private channel, with priority response on every request.',
  },
  {
    icon: Sparkles,
    title: 'White-glove onboarding',
    body: 'We migrate your sites, configure DNS, and verify everything works before you go live.',
  },
];

export default function ContactPage() {
  return (
    <>
      <style>{`
        .ct-eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:3px;color:var(--gold-bright);background:rgba(37,99,235,.08);border:1px solid rgba(37,99,235,.18);border-radius:100px;padding:6px 16px;margin-bottom:24px}
        .ct-eyebrow svg{width:13px;height:13px}
        .ct-hero-cta{display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:36px}
        .ct-hero-note{font-size:.78rem;color:var(--t3);font-weight:300}

        .ct-section{padding:64px 0}
        .ct-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;max-width:1100px;margin:0 auto}
        .ct-card{background:var(--card);border:1px solid var(--bdr);border-radius:18px;padding:30px 28px;transition:border-color .3s,transform .3s}
        .ct-card:hover{border-color:var(--bdr2);transform:translateY(-3px)}
        .ct-card-icon{width:44px;height:44px;border-radius:12px;background:rgba(37,99,235,.1);border:1px solid rgba(37,99,235,.15);display:flex;align-items:center;justify-content:center;color:var(--gold-bright);margin-bottom:18px}
        .ct-card-icon svg{width:20px;height:20px}
        .ct-card h3{font-size:1rem;font-weight:500;color:var(--t1);margin-bottom:8px;letter-spacing:-.2px}
        .ct-card p{font-size:.85rem;color:var(--t3);line-height:1.7;font-weight:300}

        .ct-head{text-align:center;max-width:600px;margin:0 auto 48px}
        .ct-head .ct-tag{display:inline-block;font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:3px;color:var(--gold-bright);margin-bottom:14px}
        .ct-head h2{font-family:'Inter',sans-serif;font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:600;letter-spacing:-.8px;line-height:1.15;color:var(--t1);margin-bottom:14px}
        .ct-head p{font-size:.95rem;color:var(--t2);line-height:1.75;font-weight:300}

        .ct-form-section{padding:0 0 100px}
        .ct-form-wrap{max-width:640px;margin:0 auto}

        @media(max-width:1024px){.ct-grid{grid-template-columns:1fr 1fr}}
        @media(max-width:560px){.ct-grid{grid-template-columns:1fr}}
      `}</style>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="page-hero">
        <div className="page-hero-overlay" />
        <div className="c">
          <div className="ct-eyebrow"><Building2 /> Enterprise &amp; custom plans</div>
          <h1>Let&apos;s build the<br />right plan for you.</h1>
          <p>
            Enterprise is custom-priced and set up by our team. Tell us what you&apos;re running and
            we&apos;ll tailor resources, support, and onboarding — then send you a login once
            it&apos;s ready.
          </p>
          <div className="ct-hero-cta">
            <a href="#contact" className="bp lg">Talk to sales</a>
            <span className="ct-hero-note">We&apos;ll respond within one business day.</span>
          </div>
        </div>
      </section>

      {/* ── What you get ───────────────────────────────────── */}
      <section className="ct-section">
        <div className="c">
          <div className="ct-grid">
            {POINTS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="ct-card">
                <div className="ct-card-icon"><Icon /></div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Lead form ──────────────────────────────────────── */}
      <section id="contact" className="ct-form-section">
        <div className="c">
          <div className="ct-head">
            <div className="ct-tag">Get a quote</div>
            <h2>Tell us about your project</h2>
            <p>We&apos;ll respond within one business day with a tailored plan.</p>
          </div>
          <div className="ct-form-wrap">
            <SalesInquiryForm />
          </div>
        </div>
      </section>
    </>
  );
}
