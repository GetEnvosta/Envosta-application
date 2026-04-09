import type { Metadata } from 'next';
import Link from 'next/link';
import { getDomainPricing } from '@/services/plans';
import { DomainSearch } from '@/components/marketing/domain-search';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Domain Registration — .com, .ca, .io & More | Envosta',
  description: 'Register the perfect domain for your business. 20+ TLDs from $15 CAD/yr with free WHOIS privacy, auto-DNS setup, and easy management from your Envosta dashboard.',
  alternates: { canonical: 'https://envosta.com/domains' },
  openGraph: {
    title: 'Domain Registration — .com, .ca, .io & More',
    description: '20+ TLDs from $15 CAD/yr. Free WHOIS privacy, auto-DNS, and one-click connection to your hosting.',
    url: 'https://envosta.com/domains',
  },
  twitter: {
    title: 'Domain Registration from $15 CAD/yr — Envosta',
    description: '20+ TLDs with free WHOIS privacy and auto-DNS setup.',
  },
};

export default async function DomainsPage() {
  const tlds = await getDomainPricing();

  return (
    <>
      {/* Hero */}
      <section className="dom-hero">
        <div className="c">
          <h1>Find your perfect domain</h1>
          <p>Register the right domain for your business. Simple pricing, free WHOIS privacy, and easy DNS management — all in one place.</p>
          <DomainSearch />
        </div>
      </section>

      {/* Features */}
      <section className="dom-features">
        <div className="c">
          <div className="dom-grid">
            <div className="dom-feat">
              <div className="dom-feat-icon">🔒</div>
              <h3>Free WHOIS Privacy</h3>
              <p>Your personal information stays private. WHOIS privacy protection is included with every domain at no extra cost.</p>
            </div>
            <div className="dom-feat">
              <div className="dom-feat-icon">⚡</div>
              <h3>Instant Activation</h3>
              <p>Your domain is live the moment you register it. No waiting, no delays — start building immediately.</p>
            </div>
            <div className="dom-feat">
              <div className="dom-feat-icon">🔧</div>
              <h3>Easy DNS Management</h3>
              <p>Manage your DNS records, nameservers, and email configuration right from your Envosta dashboard.</p>
            </div>
            <div className="dom-feat">
              <div className="dom-feat-icon">🔄</div>
              <h3>Auto-Renewal</h3>
              <p>Never lose your domain. Auto-renewal keeps your domain active and secure year after year.</p>
            </div>
            <div className="dom-feat">
              <div className="dom-feat-icon">🌐</div>
              <h3>20+ TLDs Available</h3>
              <p>From .com and .ca to .io and .agency — find the perfect extension for your brand.</p>
            </div>
            <div className="dom-feat">
              <div className="dom-feat-icon">🤝</div>
              <h3>Seamless Hosting Integration</h3>
              <p>Connect your domain to your Envosta-hosted site with one click. SSL is provisioned automatically.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TLD Pricing */}
      <section className="dom-pricing">
        <div className="c">
          <h2>Simple, transparent pricing</h2>
          <p>All prices in CAD. Registration includes 1 year and free WHOIS privacy.</p>
          <div className="tld-grid">
            {tlds.map((tld: any) => {
              const ext = (tld.metadata as any)?.tld ?? tld.slug?.replace('tld-', '') ?? '';
              const price = ((tld.metadata as any)?.registration_price_cad ?? tld.price_cad ?? 0) / 100;
              return (
                <div key={tld.id} className="tld-card">
                  <div className="tld-name">.{ext}</div>
                  <div className="tld-price">
                    ${price.toFixed(0)} <span>CAD/yr</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="dom-cta">
        <div className="c">
          <h2>Ready to claim your domain?</h2>
          <p>Search for available domains and register in seconds. Every domain includes free privacy protection.</p>
          <Link href="/get-started" className="bp lg">Get Started</Link>
        </div>
      </section>
    </>
  );
}
