import type { Metadata } from 'next';
import Link from 'next/link';
import { getDomainPricing } from '@/services/plans';
import { DomainSearch } from '@/components/marketing/domain-search';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Domain Names',
  description: 'Register the perfect domain for your business. .com, .ca, .io, and 20+ TLDs available with free WHOIS privacy and easy DNS management.',
  alternates: { canonical: '/domains' },
};

export default async function DomainsPage() {
  const tlds = await getDomainPricing();

  return (
    <>
      <style>{`
        .dom-hero{padding:160px 0 80px;text-align:center;position:relative;overflow:hidden}
        .dom-hero::before{content:'';position:absolute;top:-40%;left:50%;transform:translateX(-50%);width:800px;height:800px;background:radial-gradient(circle,rgba(37,99,235,.12),transparent 65%);pointer-events:none}
        .dom-hero .c{position:relative;z-index:1}
        .dom-hero h1{font-size:clamp(2.4rem,5vw,3.8rem);font-weight:600;letter-spacing:-1.5px;line-height:1.12;margin-bottom:16px;background:linear-gradient(180deg,#fff 30%,rgba(255,255,255,.7));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .dom-hero p{font-size:1.05rem;color:var(--t2);max-width:520px;margin:0 auto 40px;line-height:1.75;font-weight:300}

        .dom-search{max-width:560px;margin:0 auto;display:flex;gap:10px}
        .dom-search input{flex:1;padding:16px 24px;background:rgba(255,255,255,.06);border:1px solid var(--bdr2);border-radius:100px;color:var(--t1);font-size:1rem;font-family:inherit;outline:none;transition:border-color .2s}
        .dom-search input:focus{border-color:var(--gold)}
        .dom-search input::placeholder{color:var(--t3)}

        .dom-features{padding:80px 0}
        .dom-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:64px}
        .dom-feat{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:32px 28px;transition:all .3s}
        .dom-feat:hover{border-color:rgba(255,255,255,.15);transform:translateY(-3px)}
        .dom-feat-icon{font-size:1.5rem;margin-bottom:14px}
        .dom-feat h3{font-size:1rem;font-weight:500;color:var(--t1);margin-bottom:8px}
        .dom-feat p{font-size:.84rem;color:var(--t3);line-height:1.7;font-weight:300}

        .dom-pricing{padding:0 0 80px}
        .dom-pricing h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:400;letter-spacing:-1px;line-height:1.15;margin-bottom:12px;text-align:center}
        .dom-pricing>p{font-size:.95rem;color:var(--t2);text-align:center;margin-bottom:48px;font-weight:300}
        .tld-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
        .tld-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:20px;text-align:center;transition:all .3s}
        .tld-card:hover{border-color:rgba(37,99,235,.3);transform:translateY(-2px)}
        .tld-name{font-size:1.1rem;font-weight:600;color:var(--t1);margin-bottom:4px}
        .tld-price{font-size:.85rem;color:var(--gold);font-weight:500}
        .tld-price span{font-size:.7rem;color:var(--t3);font-weight:300}

        .dom-cta{padding:80px 0 100px;text-align:center}
        .dom-cta h2{font-size:clamp(1.8rem,3.5vw,2.4rem);font-weight:400;letter-spacing:-1px;margin-bottom:16px}
        .dom-cta p{font-size:.95rem;color:var(--t2);max-width:460px;margin:0 auto 32px;font-weight:300;line-height:1.75}

        @media(max-width:768px){
          .dom-grid{grid-template-columns:1fr}
          .tld-grid{grid-template-columns:repeat(2,1fr)}
          .dom-search{flex-direction:column}
          .dom-hero{padding:120px 0 60px}
        }
        @media(max-width:480px){
          .tld-grid{grid-template-columns:repeat(2,1fr);gap:8px}
        }
      `}</style>

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
            {tlds.map((tld: any) => (
              <div key={tld.id} className="tld-card">
                <div className="tld-name">.{tld.tld}</div>
                <div className="tld-price">
                  ${(tld.registration_price_cad / 100).toFixed(2)} <span>/yr</span>
                </div>
              </div>
            ))}
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
