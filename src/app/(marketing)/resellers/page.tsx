/**
 * /resellers — agency-focused landing page with custom-pricing lead form.
 *
 * Separate from /plans (self-serve tiers for individual sites). This page
 * targets agencies and freelancers managing multiple client sites. There
 * is no self-serve signup — every reseller customer is hand-onboarded
 * via the lead form below.
 *
 * Form submission → /api/contact with type='reseller' → creates a ticket
 * in /admin/tickets + emails sales@envosta.com.
 */
import { Server, Users, Sparkles, Headphones, Globe, Lock } from 'lucide-react';
import { ResellerLeadForm } from './reseller-lead-form';

export const metadata = {
  title: 'Reseller Hosting · Envosta',
  description: 'Bulk WordPress hosting for agencies and freelancers managing multiple client sites. Custom-priced, white-glove onboarding.',
};

const FEATURES = [
  {
    icon: Server,
    title: 'Volume pricing, transparent',
    body: 'Pricing scales with your site count. The more clients you bring, the lower the per-site cost. No surprise overages.',
  },
  {
    icon: Globe,
    title: 'Built on wp.cloud (Automattic)',
    body: 'Same enterprise infrastructure that powers WordPress.com. Auto SSL, daily backups, DDoS protection, global edge cache — included on every site.',
  },
  {
    icon: Sparkles,
    title: 'One dashboard, every client',
    body: 'Manage every site you host from one admin. Provision new sites in seconds. Hand off branded credentials to your clients when ready.',
  },
  {
    icon: Headphones,
    title: 'Direct line to support',
    body: 'Skip the help-center maze. Dedicated point of contact for your agency, priority response on every ticket.',
  },
  {
    icon: Lock,
    title: 'Consolidated billing',
    body: 'One invoice for your entire portfolio. Pay us, bill your clients however you want — we stay invisible to them.',
  },
  {
    icon: Users,
    title: 'Hand-onboarding',
    body: 'We migrate your existing sites, set up DNS, and verify everything works before charging. You don’t lift a finger.',
  },
];

export default function ResellersPage() {
  return (
    <>
      <style>{`
        /* ── Hero eyebrow + CTA (extends global .page-hero) ── */
        .rs-eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:3px;color:var(--gold-bright);background:rgba(37,99,235,.08);border:1px solid rgba(37,99,235,.18);border-radius:100px;padding:6px 16px;margin-bottom:24px}
        .rs-eyebrow svg{width:13px;height:13px}
        .rs-hero-cta{display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:36px}
        .rs-hero-note{font-size:.78rem;color:var(--t3);font-weight:300}

        /* ── Shared section rhythm ── */
        .rs-section{padding:64px 0}
        .rs-head{text-align:center;max-width:600px;margin:0 auto 48px}
        .rs-head .rs-tag{display:inline-block;font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:3px;color:var(--gold-bright);margin-bottom:14px}
        .rs-head h2{font-family:'Inter',sans-serif;font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:600;letter-spacing:-.8px;line-height:1.15;color:var(--t1);margin-bottom:14px}
        .rs-head p{font-size:.95rem;color:var(--t2);line-height:1.75;font-weight:300}

        /* ── Feature grid ── */
        .rs-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;max-width:1100px;margin:0 auto}
        .rs-card{background:var(--card);border:1px solid var(--bdr);border-radius:18px;padding:30px 28px;transition:border-color .3s,transform .3s}
        .rs-card:hover{border-color:var(--bdr2);transform:translateY(-3px)}
        .rs-card-icon{width:44px;height:44px;border-radius:12px;background:rgba(37,99,235,.1);border:1px solid rgba(37,99,235,.15);display:flex;align-items:center;justify-content:center;color:var(--gold-bright);margin-bottom:18px}
        .rs-card-icon svg{width:20px;height:20px}
        .rs-card h3{font-size:1rem;font-weight:500;color:var(--t1);margin-bottom:8px;letter-spacing:-.2px}
        .rs-card p{font-size:.85rem;color:var(--t3);line-height:1.7;font-weight:300}

        /* ── Pricing band ── */
        .rs-price-band{max-width:720px;margin:0 auto;text-align:center;background:linear-gradient(180deg,rgba(37,99,235,.06),var(--card) 60%);border:1px solid rgba(37,99,235,.15);border-radius:24px;padding:56px 48px}
        .rs-price-band h2{font-family:'Inter',sans-serif;font-size:clamp(1.6rem,3vw,2.2rem);font-weight:600;letter-spacing:-.6px;color:var(--t1);margin-bottom:16px}
        .rs-price-band p{font-size:.95rem;color:var(--t2);line-height:1.8;font-weight:300;max-width:540px;margin:0 auto}

        /* ── Lead-form section ── */
        .rs-form-section{padding:64px 0 100px}
        .rs-form-wrap{max-width:640px;margin:0 auto}

        @media(max-width:1024px){.rs-grid{grid-template-columns:1fr 1fr}}
        @media(max-width:768px){.rs-grid{grid-template-columns:1fr}.rs-price-band{padding:40px 28px}}
      `}</style>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="page-hero">
        <div className="page-hero-overlay" />
        <div className="c">
          <div className="rs-eyebrow"><Users /> For agencies &amp; freelancers</div>
          <h1>Hosting your clients<br />will thank you for.</h1>
          <p>
            Bulk WordPress hosting for agencies. Starts at <strong>$399 USD/mo for 50 client
            sites</strong> — the same per-site infra as Growth, with white-glove onboarding and
            consolidated billing. Need more than 50? We&apos;ll quote you.
          </p>
          <div className="rs-hero-cta">
            <a href="#contact" className="bp lg">Talk to us about your agency</a>
            <span className="rs-hero-note">We&apos;ll respond within one business day.</span>
          </div>
        </div>
      </section>

      {/* ── What you get ───────────────────────────────────── */}
      <section className="rs-section">
        <div className="c">
          <div className="rs-head">
            <div className="rs-tag">What resellers get</div>
            <h2>Built for shops managing client sites</h2>
            <p>The infrastructure and tooling agencies need — not bulk-hosting commodity.</p>
          </div>
          <div className="rs-grid">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rs-card">
                <div className="rs-card-icon"><Icon /></div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing intent ─────────────────────────────────── */}
      <section className="rs-section" style={{ paddingTop: 0 }}>
        <div className="c">
          <div className="rs-price-band">
            <h2>Starts at $399 USD/mo · 50 sites</h2>
            <p>
              Our Reseller tier starts at the same price as Growth — $399 USD/mo — but gives you 50
              client sites instead of 25. That&apos;s about $8/site if you fill it. Need more than
              50 sites or higher-traffic plans? We&apos;ll size a custom quote based on your
              portfolio and the support level you want.
            </p>
          </div>
        </div>
      </section>

      {/* ── Lead form ──────────────────────────────────────── */}
      <section id="contact" className="rs-form-section">
        <div className="c">
          <div className="rs-head">
            <div className="rs-tag">Get a quote</div>
            <h2>Tell us about your agency</h2>
            <p>We&apos;ll respond within one business day with a tailored quote.</p>
          </div>
          <div className="rs-form-wrap">
            <ResellerLeadForm />
          </div>
        </div>
      </section>
    </>
  );
}
