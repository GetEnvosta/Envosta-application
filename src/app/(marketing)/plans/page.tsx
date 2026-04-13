import type { Metadata } from 'next';
import PricingClient from './pricing-client';

export const metadata: Metadata = {
  title: 'Hosting Plans — Envosta Managed WordPress Hosting',
  description: 'Two simple plans: Minimum at $36 USD/mo for managed WordPress hosting, or Growth at $297 USD/mo with AI receptionist, Google Calendar booking, and 297 credits included.',
  alternates: { canonical: 'https://envosta.com/plans' },
  openGraph: {
    title: 'Plans & Pricing — Envosta Managed WordPress Hosting',
    description: 'Managed WordPress hosting from $36 USD/mo. Growth plan at $297 USD/mo with AI tools, onboarding, free SSL, CDN, and 297 credits included.',
    url: 'https://envosta.com/pricing',
  },
  twitter: {
    title: 'Envosta Pricing — Managed WordPress Hosting',
    description: 'Managed WordPress hosting from $36 USD/mo. Growth at $297 USD/mo with AI receptionist, calendar booking, and 297 credits.',
  },
};

export default function PricingPage() {
  return (
    <>
      <PricingClient />

      <style>{`
        .pricing-hero{padding:160px 0 80px;text-align:center;position:relative;overflow:hidden}
        .pricing-hero::before{content:'';position:absolute;top:-40%;left:50%;transform:translateX(-50%);width:800px;height:800px;background:radial-gradient(circle,rgba(37,99,235,.12),transparent 65%);pointer-events:none}
        .pricing-hero .c{position:relative;z-index:1}
        .pricing-hero h1{font-size:clamp(2.4rem,5vw,3.8rem);font-weight:600;letter-spacing:-1.5px;line-height:1.12;margin-bottom:20px}
        .pricing-hero h1 em{font-style:normal;color:#fff;font-weight:500}
        .pricing-hero p{font-size:1.05rem;color:var(--t3);max-width:520px;margin:0 auto 44px;line-height:1.7;font-weight:300}
        .toggle-wrap{display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:10px}
        .toggle-label{font-size:.88rem;color:var(--t2);font-weight:400;transition:color .2s}
        .toggle-label.active{color:var(--t1);font-weight:500}
        .toggle{width:52px;height:28px;background:var(--card2);border:1px solid var(--bdr2);border-radius:100px;cursor:pointer;position:relative;transition:background .3s}
        .toggle::after{content:'';position:absolute;top:3px;left:3px;width:20px;height:20px;background:#fff;border-radius:50%;transition:transform .3s}
        .toggle.on{background:var(--gold);border-color:var(--gold)}.toggle.on::after{transform:translateX(24px)}
        .save-badge{display:inline-block;background:rgba(34,197,94,.12);color:#22c55e;font-size:.7rem;font-weight:600;padding:3px 10px;border-radius:100px;margin-left:4px}
        .pricing-grid{padding:0 0 100px}
        .pricing-grid .c{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;max-width:860px;margin:0 auto}
        .p-card{background:var(--card);border:1px solid var(--bdr);border-radius:16px;padding:40px 32px;position:relative;transition:transform .3s,border-color .3s;display:flex;flex-direction:column}
        .p-card:hover{transform:translateY(-4px);border-color:var(--bdr2)}
        .p-card.featured{border-color:var(--gold);background:linear-gradient(180deg,rgba(37,99,235,.06),var(--card) 50%)}
        .p-card.featured::before{content:'Most Popular';position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--gold);color:#fff;font-size:.68rem;font-weight:600;padding:4px 16px;border-radius:100px;letter-spacing:.5px;text-transform:uppercase}
        .p-card-name{font-size:.72rem;font-weight:500;text-transform:uppercase;letter-spacing:3px;color:var(--gold);margin-bottom:10px}
        .p-card-price{display:flex;align-items:baseline;gap:4px;margin-bottom:6px}
        .p-card-price .currency{font-size:1.2rem;font-weight:500;color:var(--t2)}
        .p-card-price .amount{font-size:3rem;font-weight:600;letter-spacing:-1px;line-height:1}
        .p-card-price .period{font-size:.82rem;color:var(--t3);font-weight:400}
        .annual-note{font-size:.75rem;color:#22c55e;font-weight:500;margin:-2px 0 8px;letter-spacing:.2px}
        .p-card-desc{font-size:.82rem;color:var(--t3);margin-bottom:28px;line-height:1.7;font-weight:300}
        .p-card ul{list-style:none;margin-bottom:32px;flex:1}
        .p-card li{display:flex;align-items:center;gap:10px;font-size:.88rem;color:var(--t2);font-weight:300;padding:6px 0}
        .p-card li .ck{width:16px;height:16px;flex-shrink:0;color:var(--grn)}
        .p-card li{font-size:.84rem;color:var(--t2);padding:8px 0;border-bottom:1px solid var(--bdr);display:flex;align-items:center;gap:10px;font-weight:300}
        .p-card li:last-child{border:none}
        .p-card .feat-label{font-size:.68rem;font-weight:500;text-transform:uppercase;letter-spacing:2px;color:var(--gold);padding:14px 0 6px;border-bottom:none;display:block}
        .p-card .bp{width:100%;justify-content:center;padding:14px 24px;font-size:.88rem;margin-top:auto}
        .studio{padding:0 0 100px}
        .studio-card{background:linear-gradient(180deg,rgba(201,164,92,.04),rgba(255,255,255,.01));border:1px solid rgba(201,164,92,.15);border-radius:24px;padding:64px 56px;position:relative;overflow:hidden;display:grid;grid-template-columns:1.2fr 1fr;gap:56px;align-items:center}
        .studio-card::before{content:'';position:absolute;top:-40%;right:-20%;width:500px;height:500px;background:radial-gradient(circle,rgba(201,164,92,.08),transparent 60%);pointer-events:none}
        .studio-card::after{content:'';position:absolute;bottom:-30%;left:-10%;width:400px;height:400px;background:radial-gradient(circle,rgba(37,99,235,.06),transparent 60%);pointer-events:none}
        .studio-left{position:relative;z-index:1}
        .studio-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(201,164,92,.1);border:1px solid rgba(201,164,92,.2);border-radius:100px;padding:6px 16px;font-size:.68rem;font-weight:600;color:#c9a45c;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:24px}
        .studio-badge-dot{width:6px;height:6px;border-radius:50%;background:#c9a45c;animation:sbpulse 2s ease-in-out infinite}
        @keyframes sbpulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(201,164,92,.4)}50%{opacity:.7;box-shadow:0 0 0 6px rgba(201,164,92,0)}}
        .studio-left h3{font-family:'Inter',sans-serif;font-size:clamp(1.6rem,3vw,2.4rem);font-weight:500;letter-spacing:-.5px;line-height:1.15;margin-bottom:16px}
        .studio-left h3 span{background:linear-gradient(135deg,#c9a45c,#e6c46e);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .studio-left>p{font-size:.92rem;color:var(--t2);line-height:1.75;font-weight:300;margin-bottom:32px;max-width:480px}
        .studio-price{display:flex;align-items:baseline;gap:6px;margin-bottom:8px}
        .studio-price strong{font-size:2rem;font-weight:600;background:linear-gradient(135deg,#c9a45c,#e6c46e);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .studio-price span{font-size:.82rem;color:var(--t3);font-weight:300}
        .studio-price-note{font-size:.76rem;color:var(--t3);font-weight:300;margin-bottom:32px}
        .studio-cta{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
        .studio-cta .bp{background:linear-gradient(135deg,#c9a45c,#b8943f);color:#0a0e1a;font-weight:600;pointer-events:none;opacity:.7}
        .studio-cta .waitlist-note{font-size:.76rem;color:#c9a45c;font-weight:500}
        .studio-right{position:relative;z-index:1}
        .studio-features{display:flex;flex-direction:column;gap:14px}
        .studio-feat{display:flex;align-items:flex-start;gap:14px;padding:16px 20px;background:rgba(201,164,92,.04);border:1px solid rgba(201,164,92,.08);border-radius:14px;transition:border-color .3s}
        .studio-feat:hover{border-color:rgba(201,164,92,.18)}
        .studio-feat-icon{width:36px;height:36px;border-radius:10px;background:rgba(201,164,92,.1);border:1px solid rgba(201,164,92,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#c9a45c}
        .studio-feat-icon svg{width:18px;height:18px}
        .studio-feat-text h4{font-size:.86rem;font-weight:500;color:var(--t1);margin-bottom:2px}
        .studio-feat-text p{font-size:.76rem;color:var(--t3);line-height:1.5;font-weight:300}
        .studio-limit{margin-top:20px;font-size:.76rem;color:var(--t3);font-weight:300}
        .studio-limit strong{color:#c9a45c;font-weight:500}
        .all-plans{padding:0 0 100px}
        .all-plans-header{text-align:center;margin-bottom:56px}
        .all-plans-header h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:500;letter-spacing:-1px;line-height:1.15;margin-bottom:14px}
        .all-plans-header p{font-size:.92rem;color:var(--t3);font-weight:300;max-width:520px;margin:0 auto;line-height:1.7}
        .all-plans-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
        .ap-card{background:var(--card);border:1px solid var(--bdr);border-radius:14px;padding:28px 24px;transition:border-color .3s}
        .ap-card:hover{border-color:var(--bdr2)}
        .ap-icon{width:40px;height:40px;border-radius:10px;background:rgba(37,99,235,.1);display:flex;align-items:center;justify-content:center;margin-bottom:16px;color:var(--gold)}
        .ap-icon svg{width:20px;height:20px}
        .ap-card h4{font-size:.88rem;font-weight:500;margin-bottom:6px}
        .ap-card p{font-size:.76rem;color:var(--t3);line-height:1.6;font-weight:300}
        .compare{padding:0 0 100px}
        .compare-header{text-align:center;margin-bottom:56px}
        .compare-header h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:500;letter-spacing:-1px;line-height:1.15;margin-bottom:14px}
        .compare-header p{font-size:.92rem;color:var(--t3);font-weight:300;max-width:480px;margin:0 auto;line-height:1.7}
        .compare-table{width:100%;border-collapse:collapse}
        .compare-table thead th{padding:16px 20px;font-size:.72rem;font-weight:500;text-transform:uppercase;letter-spacing:2px;color:var(--t2);text-align:center;border-bottom:1px solid var(--bdr)}
        .compare-table thead th:first-child{text-align:left;color:var(--t3)}
        .compare-table thead th.feat{color:var(--gold)}
        .compare-table tbody td{padding:14px 20px;font-size:.84rem;color:var(--t2);border-bottom:1px solid var(--bdr);text-align:center;font-weight:300;line-height:1.7}
        .compare-table tbody td:first-child{text-align:left;color:var(--t1);font-weight:400}
        .compare-table tbody tr:hover{background:rgba(37,99,235,.03)}
        .compare-table .check{color:var(--grn);font-size:1rem}
        .compare-table .dash{color:var(--t3)}
        .faq{padding:0 0 100px}
        .faq-header{text-align:center;margin-bottom:56px}
        .faq-header h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:500;letter-spacing:-1px;line-height:1.15;margin-bottom:14px}
        .faq-header p{font-size:.95rem;color:var(--t2);font-weight:300;line-height:1.75}
        .faq-list{max-width:720px;margin:0 auto}
        .faq-item{border-bottom:1px solid var(--bdr)}
        .faq-q{display:flex;align-items:center;justify-content:space-between;padding:20px 0;cursor:pointer;gap:16px}
        .faq-q h4{font-size:.92rem;font-weight:400;color:var(--t1);transition:color .2s}
        .faq-q:hover h4{color:#fff}
        .faq-icon{width:24px;height:24px;flex-shrink:0;color:var(--t3);transition:transform .3s,color .3s}
        .faq-item.open .faq-icon{transform:rotate(45deg);color:var(--gold)}
        .faq-a{max-height:0;overflow:hidden;transition:max-height .4s ease,padding .4s ease}
        .faq-item.open .faq-a{max-height:300px;padding-bottom:20px}
        .faq-a p{font-size:.84rem;color:var(--t2);line-height:1.7;font-weight:300}
        @media(max-width:1024px){.pricing-grid .c{grid-template-columns:repeat(2,1fr);gap:14px}.p-card{padding:32px 20px}.p-card-price .amount{font-size:2.4rem}.studio-card{grid-template-columns:1fr;gap:40px}.all-plans-grid{grid-template-columns:repeat(3,1fr)}}
        @media(max-width:768px){.pricing-grid .c{grid-template-columns:1fr}.p-card{padding:40px 32px}.p-card-price .amount{font-size:3rem}.studio-card{padding:40px 28px}.all-plans-grid{grid-template-columns:1fr}}
      `}</style>

      {/* PRICING HERO */}
      <section className="pricing-hero">
        <div className="c">
          <h1 className="rv">Simple, transparent <em>pricing</em></h1>
          <p className="rv">Every plan starts with a personal consultation. Pick the foundation that fits — we&apos;ll help you build from there.</p>
          <div className="rv" style={{ textAlign: 'center', marginBottom: 32 }}>
            <a href="/get-started" className="bp" style={{ background: 'transparent', color: '#22c55e', border: '1px solid rgba(34,197,94,.3)', fontSize: '.82rem', padding: '10px 24px' }}>
              Start free — 14-day trial &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* PRICING CARDS */}
      <section className="pricing-grid rv"><div className="c">

        {/* Minimum */}
        <div className="p-card">
          <div className="p-card-name">Minimum</div>
          <div className="p-card-price">
            <span className="currency">$</span>
            <span className="amount">36</span>
            <span className="period">USD/mo</span>
          </div>
          <p className="p-card-desc">Enterprise-grade managed WordPress hosting. Fast, secure, and maintained — nothing more, nothing less.</p>
          <ul>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Managed WordPress on wp.cloud</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>15 GB SSD storage</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>100 GB bandwidth</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Free SSL + global CDN</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Daily backups (30-day retention)</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Automatic WordPress updates</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Uptime monitoring</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Email support</li>
          </ul>
          <a href="/get-started?plan=minimum" className="bp ghost">Get Started</a>
        </div>

        {/* Growth (Featured) */}
        <div className="p-card featured">
          <div className="p-card-name">Growth</div>
          <div className="p-card-price">
            <span className="currency">$</span>
            <span className="amount">297</span>
            <span className="period">USD/mo</span>
          </div>
          <p className="p-card-desc">WordPress hosting plus every AI business tool we offer. Phone receptionist, integrations, and a full onboarding team.</p>
          <ul>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>297 credits included monthly</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Everything in WordPress</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>30 GB SSD + 200 GB bandwidth</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Staging environment</li>
            <li className="feat-label">AI Business Tools</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>AI receptionist (answers your calls 24/7)</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Google Calendar integration — books appointments live</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Business profile &amp; integrations hub</li>
            <li className="feat-label">Onboarding</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>1-on-1 setup consultation</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>SEO audit &amp; configuration</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>WooCommerce setup</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Free site migration</li>
          </ul>
          <a href="/get-started?plan=growth" className="bp blue">Get Started</a>
        </div>

      </div>
      <p style={{ textAlign: 'center', marginTop: 28, fontSize: '.82rem', color: 'var(--t3)', fontWeight: 300 }}>
        Need maximum resources or a dedicated team? <a href="/contact" style={{ color: 'var(--gold)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>Talk to us about Performance &amp; Studio</a>.
      </p>
      </section>

      {/* ALL PLANS INCLUDE */}
      <section className="all-plans rv"><div className="c">
        <div className="all-plans-header">
          <h2>Included with every plan</h2>
          <p>No matter which plan you choose, you get the essentials that make Envosta different — right out of the box.</p>
        </div>
        <div className="all-plans-grid">

          <div className="ap-card">
            <div className="ap-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg></div>
            <h4>Free SSL Certificate</h4>
            <p>Every site gets a free SSL certificate, auto-renewed and configured for you.</p>
          </div>

          <div className="ap-card">
            <div className="ap-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9" /></svg></div>
            <h4>Global CDN</h4>
            <p>Content delivered from edge locations around the world for lightning-fast load times.</p>
          </div>

          <div className="ap-card">
            <div className="ap-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg></div>
            <h4>Personal Onboarding</h4>
            <p>A one-on-one consultation to set up your site, configure your environment, and launch with confidence.</p>
          </div>

          <div className="ap-card">
            <div className="ap-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg></div>
            <h4>Free Site Migration</h4>
            <p>Our team handles your entire migration — files, database, DNS — with zero downtime.</p>
          </div>

          <div className="ap-card">
            <div className="ap-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg></div>
            <h4>WordPress Auto-Updates</h4>
            <p>Core, plugin, and theme updates handled automatically so your site stays secure.</p>
          </div>

          <div className="ap-card">
            <div className="ap-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg></div>
            <h4>99.99% Uptime SLA</h4>
            <p>Enterprise-grade infrastructure with guaranteed uptime across all plans.</p>
          </div>

          <div className="ap-card">
            <div className="ap-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg></div>
            <h4>Performance Monitoring</h4>
            <p>Real-time site speed and uptime monitoring with alerts built into your dashboard.</p>
          </div>

          <div className="ap-card">
            <div className="ap-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg></div>
            <h4>Daily Backups</h4>
            <p>Automatic daily backups with one-click restore, so your site is always protected and recoverable.</p>
          </div>

          <div className="ap-card">
            <div className="ap-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /><line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" /></svg></div>
            <h4>WHOIS Privacy</h4>
            <p>Your personal information stays hidden on every domain — included free with all plans.</p>
          </div>

        </div>
      </div></section>

      {/* FEATURE COMPARISON */}
      <section className="compare rv"><div className="c">
        <div className="compare-header">
          <h2>Compare every feature</h2>
          <p>A side-by-side breakdown so you can pick the plan that works best for your needs.</p>
        </div>
        <table className="compare-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Minimum</th>
              <th className="feat">Growth</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Price</td><td>$36 USD/mo</td><td>$297 USD/mo</td></tr>
            <tr><td>Credits included</td><td className="dash">{'\u2014'}</td><td>297/mo</td></tr>
            <tr><td>SSD storage</td><td>15 GB</td><td>30 GB</td></tr>
            <tr><td>Bandwidth</td><td>100 GB</td><td>200 GB</td></tr>
            <tr><td>Free SSL + CDN</td><td className="check">{'\u2713'}</td><td className="check">{'\u2713'}</td></tr>
            <tr><td>Daily backups</td><td className="check">{'\u2713'}</td><td className="check">{'\u2713'}</td></tr>
            <tr><td>Automatic WP updates</td><td className="check">{'\u2713'}</td><td className="check">{'\u2713'}</td></tr>
            <tr><td>Uptime monitoring</td><td className="check">{'\u2713'}</td><td className="check">{'\u2713'}</td></tr>
            <tr><td>Staging environment</td><td className="dash">{'\u2014'}</td><td className="check">{'\u2713'}</td></tr>
            <tr><td>AI phone receptionist</td><td className="dash">{'\u2014'}</td><td className="check">{'\u2713'}</td></tr>
            <tr><td>Google Calendar booking</td><td className="dash">{'\u2014'}</td><td className="check">{'\u2713'}</td></tr>
            <tr><td>Business integrations hub</td><td className="dash">{'\u2014'}</td><td className="check">{'\u2713'}</td></tr>
            <tr><td>1-on-1 setup consultation</td><td className="dash">{'\u2014'}</td><td className="check">{'\u2713'}</td></tr>
            <tr><td>SEO audit &amp; configuration</td><td className="dash">{'\u2014'}</td><td className="check">{'\u2713'}</td></tr>
            <tr><td>WooCommerce setup</td><td className="dash">{'\u2014'}</td><td className="check">{'\u2713'}</td></tr>
            <tr><td>Free site migration</td><td className="dash">{'\u2014'}</td><td className="check">{'\u2713'}</td></tr>
            <tr><td>Support</td><td>Email</td><td>Priority email</td></tr>
            <tr><td>Uptime SLA</td><td>99.9%</td><td>99.99%</td></tr>
          </tbody>
        </table>
      </div></section>

      {/* FAQ */}
      <section className="faq rv"><div className="c">
        <div className="faq-header">
          <h2>Frequently asked questions</h2>
          <p>Everything you need to know about our plans, billing, and support.</p>
        </div>
        <div className="faq-list">

          <div className="faq-item">
            <div className="faq-q">
              <h4>Can I switch plans after signing up?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>Absolutely. You can upgrade or downgrade at any time. When upgrading, the price difference is prorated. When downgrading, the new rate applies at your next billing cycle.</p></div>
          </div>

          <div className="faq-item">
            <div className="faq-q">
              <h4>What does the personal onboarding include?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>We walk through your goals, configure your hosting environment, install WordPress, set up your domain and SSL, and make sure everything is optimized before you go live.</p></div>
          </div>

          <div className="faq-item">
            <div className="faq-q">
              <h4>Do you handle WordPress migrations?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>Yes. Our team will migrate your existing WordPress site for free with any plan. We handle everything — files, database, DNS configuration — with zero downtime.</p></div>
          </div>

          <div className="faq-item">
            <div className="faq-q">
              <h4>Is my site backed up automatically?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>Yes. Every plan includes automatic daily backups with one-click restore. Backups are stored securely off-site so you can recover your site at any time.</p></div>
          </div>

          <div className="faq-item">
            <div className="faq-q">
              <h4>What kind of support can I expect?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>Minimum and Growth plans include email support with a typical response time under 4 hours. The Performance plan includes priority support with faster response times and a dedicated account manager.</p></div>
          </div>

          <div className="faq-item">
            <div className="faq-q">
              <h4>Do you offer custom or enterprise plans?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>Absolutely. If none of our standard plans fit your needs, reach out and we&apos;ll put together a custom solution with the exact resources and support you require.</p></div>
          </div>

          <div className="faq-item">
            <div className="faq-q">
              <h4>Can I cancel at any time?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>Yes. There are no long-term contracts. Monthly plans can be cancelled anytime. Annual plans are covered by our 14-day money-back guarantee.</p></div>
          </div>

        </div>
      </div></section>
    </>
  );
}
