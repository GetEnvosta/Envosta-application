import type { Metadata } from 'next';
import PricingClient from './pricing-client';

export const metadata: Metadata = {
  title: 'Hosting Plans — Envosta Managed WordPress Hosting',
  description: 'Managed WordPress hosting plans. Minimum $50/mo, Growth $129/mo, Performance $350/mo CAD.',
  alternates: { canonical: 'https://envosta.com/plans' },
  openGraph: {
    title: 'Plans & Pricing — Envosta Managed WordPress Hosting',
    description: 'From $50 CAD/mo. Enterprise wp.cloud hosting with personal onboarding, free SSL, CDN, and daily backups.',
    url: 'https://envosta.com/pricing',
  },
  twitter: {
    title: 'Envosta Pricing — Managed WordPress from $50 CAD/mo',
    description: 'Enterprise hosting with personal onboarding. Minimum, Growth, and Performance plans.',
  },
};

export default function PricingPage() {
  return (
    <>
      <PricingClient />

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
          <div className="toggle-wrap rv">
            <span className="toggle-label active" id="lbl-monthly">Monthly</span>
            <div className="toggle" id="billing-toggle"></div>
            <span className="toggle-label" id="lbl-annual">Annual</span>
            <span className="save-badge">2 months free</span>
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
            <span className="amount price-val" data-monthly="50" data-annual="42">50</span>
            <span className="period">CAD/mo</span>
          </div>
          <div className="annual-note" style={{ display: 'none' }}>Billed annually at $500 CAD/yr</div>
          <p className="p-card-desc">Everything you need to launch a fast, secure WordPress site with hands-on support.</p>
          <ul>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>10 GB SSD storage</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>50 GB bandwidth</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Staging environment</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Daily backups</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Email support</li>
            <li className="feat-label">Onboarding</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>1-on-1 setup consultation</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>WordPress install &amp; configuration</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Domain &amp; SSL setup</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Free site migration</li>
          </ul>
          <a href="/get-started?plan=minimum" className="bp ghost">Get Started</a>
        </div>

        {/* Growth (Featured) */}
        <div className="p-card featured">
          <div className="p-card-name">Growth</div>
          <div className="p-card-price">
            <span className="currency">$</span>
            <span className="amount price-val" data-monthly="129" data-annual="108">129</span>
            <span className="period">CAD/mo</span>
          </div>
          <div className="annual-note" style={{ display: 'none' }}>Billed annually at $1,290 CAD/yr</div>
          <p className="p-card-desc">For growing businesses that need more storage, staging, and hands-on support.</p>
          <ul>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>30 GB SSD storage</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>200 GB bandwidth</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Staging environment</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Daily backups</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Email support</li>
            <li className="feat-label">Onboarding</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Everything in Minimum</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>SEO audit &amp; configuration</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Plugin recommendations &amp; setup</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Performance optimization</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>WooCommerce setup</li>
          </ul>
          <a href="/get-started?plan=growth" className="bp blue">Get Started</a>
        </div>

        {/* Performance */}
        <div className="p-card">
          <div className="p-card-name">Performance</div>
          <div className="p-card-price">
            <span className="currency">$</span>
            <span className="amount price-val" data-monthly="350" data-annual="292">350</span>
            <span className="period">CAD/mo</span>
          </div>
          <div className="annual-note" style={{ display: 'none' }}>Billed annually at $3,500 CAD/yr</div>
          <p className="p-card-desc">For enterprises that need maximum resources, priority support, and a dedicated team.</p>
          <ul>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>100 GB SSD storage</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Unlimited bandwidth</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Staging environment</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Daily backups</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Priority support (4hr response)</li>
            <li className="feat-label">Concierge Onboarding</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Everything in Growth</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Custom theme design &amp; build</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Email DNS &amp; inbox configuration</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Security hardening &amp; WAF tuning</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Dedicated account manager</li>
            <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Launch review &amp; go-live checklist</li>
          </ul>
          <a href="/get-started?plan=performance" className="bp ghost">Get Started</a>
        </div>

      </div></section>

      {/* STUDIO PLAN */}
      <section className="studio rv"><div className="c">
        <div className="sh">
          <div className="sh-tag">Envosta Studio</div>
          <h2>Need a team, not just a host?</h2>
          <p className="sh-desc">For businesses that want dedicated WordPress experts handling design, development, and ongoing optimization alongside their hosting.</p>
        </div>
        <div className="studio-card">
          <div className="studio-left">
            <div className="studio-badge"><div className="studio-badge-dot"></div>Currently Full</div>
            <h3>Envosta <span>Studio</span></h3>
            <p>A dedicated WordPress team assigned to your business. Strategy calls, same-day fixes, proactive monitoring, and a direct line to senior engineers who actually know your site inside and out. No tickets. No queues. No runaround.</p>
            <div className="studio-price"><strong>$3,250</strong><span>/month to start</span></div>
            <p className="studio-price-note">Custom pricing based on scope. Billed monthly, cancel anytime.</p>
            <div className="studio-cta">
              <a href="#" className="bp">Join the Waitlist</a>
              <span className="waitlist-note">Currently at capacity</span>
            </div>
          </div>
          <div className="studio-right">
            <div className="studio-features">
              <div className="studio-feat">
                <div className="studio-feat-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg></div>
                <div className="studio-feat-text"><h4>Dedicated Account Lead</h4><p>A named senior engineer who knows your stack, your goals, and your site history.</p></div>
              </div>
              <div className="studio-feat">
                <div className="studio-feat-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg></div>
                <div className="studio-feat-text"><h4>Same-Day Response</h4><p>Critical issues resolved within hours, not days. Direct Slack or phone access.</p></div>
              </div>
              <div className="studio-feat">
                <div className="studio-feat-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" /></svg></div>
                <div className="studio-feat-text"><h4>Proactive Monitoring</h4><p>We catch problems before you do. Uptime, performance, and security — watched 24/7.</p></div>
              </div>
              <div className="studio-feat">
                <div className="studio-feat-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg></div>
                <div className="studio-feat-text"><h4>Monthly Strategy Calls</h4><p>Recurring sessions to review performance, plan updates, and align on priorities.</p></div>
              </div>
            </div>
            <div className="studio-limit">We intentionally keep capacity <strong>limited</strong> to maintain the quality our clients expect. Currently full.</div>
          </div>
        </div>
      </div></section>

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
              <th>Performance</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>WordPress sites</td><td>1</td><td>1</td><td>1</td></tr>
            <tr><td>SSD storage</td><td>10 GB</td><td>30 GB</td><td>100 GB</td></tr>
            <tr><td>Bandwidth</td><td>50 GB</td><td>200 GB</td><td>Unlimited</td></tr>
            <tr><td>Free SSL certificate</td><td className="check">{'\u2713'}</td><td className="check">{'\u2713'}</td><td className="check">{'\u2713'}</td></tr>
            <tr><td>Global CDN</td><td className="check">{'\u2713'}</td><td className="check">{'\u2713'}</td><td className="check">{'\u2713'}</td></tr>
            <tr><td>Staging environment</td><td className="check">{'\u2713'}</td><td className="check">{'\u2713'}</td><td className="check">{'\u2713'}</td></tr>
            <tr><td>Daily backups</td><td className="check">{'\u2713'}</td><td className="check">{'\u2713'}</td><td className="check">{'\u2713'}</td></tr>
            <tr><td>Web application firewall</td><td className="check">{'\u2713'}</td><td className="check">{'\u2713'}</td><td className="check">{'\u2713'}</td></tr>
            <tr><td>DDoS protection</td><td className="check">{'\u2713'}</td><td className="check">{'\u2713'}</td><td className="check">{'\u2713'}</td></tr>
            <tr><td>Personal onboarding</td><td className="check">{'\u2713'}</td><td className="check">{'\u2713'}</td><td className="check">{'\u2713'}</td></tr>
            <tr><td>SEO audit &amp; setup</td><td className="dash">{'\u2014'}</td><td className="check">{'\u2713'}</td><td className="check">{'\u2713'}</td></tr>
            <tr><td>WooCommerce setup</td><td className="dash">{'\u2014'}</td><td className="check">{'\u2713'}</td><td className="check">{'\u2713'}</td></tr>
            <tr><td>Custom theme included</td><td className="dash">{'\u2014'}</td><td className="dash">{'\u2014'}</td><td className="check">{'\u2713'}</td></tr>
            <tr><td>Dedicated account manager</td><td className="dash">{'\u2014'}</td><td className="dash">{'\u2014'}</td><td className="check">{'\u2713'}</td></tr>
            <tr><td>Support</td><td>Email</td><td>Email</td><td>Priority</td></tr>
            <tr><td>Uptime SLA</td><td>99.99%</td><td>99.99%</td><td>99.99%</td></tr>
          </tbody>
        </table>
      </div></section>

      {/* Studio Request Add-on */}
      <section className="rv" style={{ padding: '80px 0' }}><div className="c">
        <div style={{ maxWidth: 800, margin: '0 auto', background: 'linear-gradient(135deg, rgba(201,164,92,.06), rgba(37,99,235,.04))', border: '1px solid rgba(201,164,92,.15)', borderRadius: 24, padding: '48px 40px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, background: 'radial-gradient(circle, rgba(201,164,92,.1), transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 40 }}>
            <div style={{ flex: 1, minWidth: 280, position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(201,164,92,.1)', border: '1px solid rgba(201,164,92,.2)', borderRadius: 100, padding: '5px 14px', fontSize: '.68rem', fontWeight: 600, color: '#c9a45c', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 16 }}>
                Add-on
              </div>
              <h3 style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 500, letterSpacing: '-.5px', lineHeight: 1.15, marginBottom: 12, color: '#fff' }}>
                Studio Request
              </h3>
              <p style={{ fontSize: '.9rem', color: 'var(--t2)', lineHeight: 1.75, fontWeight: 300, marginBottom: 20, maxWidth: 440 }}>
                Need a design change, a new page, or a custom feature on your site? Submit a Studio Request and our team will handle it for you — no technical knowledge required.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {['Design Changes', 'New Pages', 'Plugin Setup', 'Custom Features', 'Content Updates'].map(tag => (
                  <span key={tag} style={{ fontSize: '.72rem', padding: '4px 12px', borderRadius: 100, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)', color: 'var(--t2)' }}>{tag}</span>
                ))}
              </div>
              <p style={{ fontSize: '.78rem', color: 'var(--t3)', fontWeight: 300 }}>
                Available on all hosting plans. One request at a time, delivered within 3–5 business days.
              </p>
            </div>

            <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '2.4rem', fontWeight: 600, background: 'linear-gradient(135deg, #c9a45c, #e6c46e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 4 }}>
                $250
              </div>
              <p style={{ fontSize: '.82rem', color: 'var(--t3)', fontWeight: 300, marginBottom: 20 }}>CAD per request</p>
              <a href="/get-started" className="bp" style={{ background: 'linear-gradient(135deg, #c9a45c, #b8943f)', color: '#0a0e1a', fontWeight: 600 }}>
                Learn More
              </a>
            </div>
          </div>
        </div>
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
              <h4>How does the annual billing work?</h4>
              <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </div>
            <div className="faq-a"><p>When you choose annual billing, you get 2 months completely free. You pay for 10 months upfront and get 12 months of service. You can switch between monthly and annual at any time.</p></div>
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
