/**
 * /start — the paid-social landing page (Instagram/Facebook ads point here).
 *
 * Purpose-built for ad traffic: mobile-first (IG opens in the in-app
 * browser), no nav/footer distraction (single conversion path), a sticky
 * mobile CTA, and every CTA forwards the ad's utm + fbclid params through
 * to /get-started so attribution survives to checkout.
 *
 * noindex — this is a campaign page, not an SEO surface (kept out of the
 * sitemap; robots noindex below). Styled with the live site's design
 * system (marketing.css tokens) so ad → landing → checkout feels seamless.
 * Prices render live from the products catalog — never hardcoded.
 */
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase-server';
import { AdCta } from './ad-cta';

export const metadata: Metadata = {
  title: 'Managed WordPress Hosting — Start Free | Envosta',
  description:
    'We build, host, secure, and manage your WordPress site on the same infrastructure as WordPress.com. Start free — no credit card games, cancel anytime.',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://envosta.com/start' },
};

export const revalidate = 60;

export default async function AdLandingPage() {
  // Live price anchor from the catalog (same source as /plans).
  const supabase = await createClient();
  const { data: plans } = await supabase
    .from('products')
    .select('slug, price_usd, price_cad')
    .eq('type', 'hosting_plan')
    .eq('is_active', true);
  const cheapest = (plans ?? [])
    .map((p: any) => p.price_usd ?? p.price_cad ?? null)
    .filter((c: number | null): c is number => c != null)
    .sort((a: number, b: number) => a - b)[0] ?? null;
  const fromPrice = cheapest != null ? `$${Math.round(cheapest / 100)}` : null;

  return (
    <>
      <style>{`
        .ad-page{min-height:100dvh;display:flex;flex-direction:column}
        .ad-hero{padding:64px 0 40px;text-align:center;position:relative;overflow:hidden}
        .ad-hero::before{content:'';position:absolute;top:-30%;left:50%;transform:translateX(-50%);width:640px;height:640px;background:radial-gradient(circle,rgba(37,99,235,.14),transparent 65%);pointer-events:none}
        .ad-hero .c{position:relative;z-index:1}
        .ad-logo{display:inline-flex;align-items:center;gap:10px;margin-bottom:34px;text-decoration:none}
        .ad-logo img{width:30px;height:30px}
        .ad-logo span{font-size:1.05rem;font-weight:500;color:#fff;letter-spacing:-.4px}
        .ad-eyebrow{display:inline-block;font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:2.5px;color:var(--gold-bright);background:rgba(37,99,235,.08);border:1px solid rgba(37,99,235,.18);border-radius:100px;padding:6px 16px;margin-bottom:22px}
        .ad-hero h1{font-size:clamp(2.1rem,7vw,3.4rem);font-weight:600;letter-spacing:-1.6px;line-height:1.12;margin-bottom:18px}
        .ad-hero h1 em{font-style:normal;color:var(--gold-bright)}
        .ad-hero .sub{font-size:1.02rem;color:var(--t2);max-width:480px;margin:0 auto 30px;line-height:1.7;font-weight:300}
        .ad-cta-note{font-size:.76rem;color:var(--t3);margin-top:12px;font-weight:300}
        .ad-trust{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:34px}
        .ad-trust span{font-size:.7rem;color:var(--t3);border:1px solid var(--bdr);border-radius:100px;padding:6px 13px;background:var(--card)}
        .ad-sec{padding:40px 0}
        .ad-cards{display:grid;grid-template-columns:1fr;gap:14px;max-width:560px;margin:0 auto}
        @media(min-width:860px){.ad-cards{grid-template-columns:repeat(3,1fr);max-width:1000px}}
        .ad-card{background:var(--card);border:1px solid var(--bdr);border-radius:16px;padding:24px 22px;text-align:left}
        .ad-card h3{font-size:1rem;font-weight:500;color:var(--t1);margin-bottom:8px}
        .ad-card p{font-size:.86rem;color:var(--t3);line-height:1.65;font-weight:300}
        .ad-price{padding:8px 0 48px;text-align:center}
        .ad-price .panel{max-width:560px;margin:0 auto;background:linear-gradient(180deg,rgba(37,99,235,.06),var(--card) 60%);border:1px solid rgba(37,99,235,.15);border-radius:20px;padding:36px 28px}
        .ad-price h2{font-size:1.5rem;font-weight:600;letter-spacing:-.6px;margin-bottom:10px}
        .ad-price p{font-size:.9rem;color:var(--t2);line-height:1.7;font-weight:300;margin-bottom:22px}
        .ad-faq{padding:0 0 120px}
        .ad-faq .wrap{max-width:560px;margin:0 auto}
        .ad-faq h2{text-align:center;font-size:1.3rem;font-weight:600;margin-bottom:20px}
        .ad-faq details{background:var(--card);border:1px solid var(--bdr);border-radius:12px;padding:16px 18px;margin-bottom:10px}
        .ad-faq summary{font-size:.9rem;font-weight:500;color:var(--t1);cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center}
        .ad-faq summary::after{content:'+';color:var(--gold-bright);font-size:1.1rem}
        .ad-faq details[open] summary::after{content:'–'}
        .ad-faq details p{font-size:.85rem;color:var(--t3);line-height:1.7;font-weight:300;margin-top:10px}
        .ad-sticky{position:fixed;bottom:0;left:0;right:0;z-index:60;background:rgba(3,6,14,.92);backdrop-filter:blur(10px);border-top:1px solid var(--bdr);padding:12px 16px calc(12px + env(safe-area-inset-bottom))}
        .ad-sticky .in{max-width:560px;margin:0 auto;display:flex;align-items:center;gap:14px;justify-content:space-between}
        .ad-sticky .pr{font-size:.8rem;color:var(--t2)}
        .ad-sticky .pr b{color:#fff;font-weight:600}
        @media(min-width:860px){.ad-sticky{display:none}}
        .ad-legal{padding:26px 0 110px;text-align:center}
        @media(min-width:860px){.ad-legal{padding-bottom:40px}}
        .ad-legal a{font-size:.72rem;color:var(--t3);text-decoration:none;margin:0 10px}
      `}</style>

      <div className="ad-page">
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="ad-hero">
          <div className="c">
            <a href="/" className="ad-logo">
              <img src="/assets/Logo/envosta-logo-mark.svg" alt="" />
              <span>Envosta</span>
            </a>
            <div>
              <span className="ad-eyebrow">Managed WordPress Hosting</span>
            </div>
            <h1>
              Stop fighting <em>your website.</em>
            </h1>
            <p className="sub">
              We build, host, secure, and manage your WordPress site on the same infrastructure
              behind WordPress.com — while you run your business.
            </p>
            <AdCta label="Start Free" />
            <p className="ad-cta-note">14-day free trial · no charge today · cancel anytime</p>
            <div className="ad-trust">
              <span>Built on wp.cloud by Automattic</span>
              <span>Free SSL + global CDN</span>
              <span>Daily backups</span>
              <span>99.99% uptime</span>
            </div>
          </div>
        </section>

        {/* ── Three reasons ────────────────────────────────── */}
        <section className="ad-sec">
          <div className="c">
            <div className="ad-cards">
              <div className="ad-card">
                <h3>Handled for you</h3>
                <p>
                  Updates, security, backups, and speed — our team manages it all. You get one
                  place to ask for anything, and a human answers.
                </p>
              </div>
              <div className="ad-card">
                <h3>Enterprise infrastructure</h3>
                <p>
                  Your site runs on wp.cloud — the platform built by Automattic, the makers of
                  WordPress. The same engineering that powers WordPress.com.
                </p>
              </div>
              <div className="ad-card">
                <h3>Ready to grow</h3>
                <p>
                  WooCommerce-ready hosting and lead-capture forms when you need them — upgrade
                  your plan whenever you&apos;re ready.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Price anchor ─────────────────────────────────── */}
        <section className="ad-price">
          <div className="c">
            <div className="panel">
              <h2>{fromPrice ? `Plans from ${fromPrice}/month` : 'Simple monthly plans'}</h2>
              <p>
                Try it free for 14 days. Keep your domain, keep your content, cancel anytime —
                your site is always yours.
              </p>
              <AdCta label="Start Your Free Trial" />
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────── */}
        <section className="ad-faq">
          <div className="wrap c">
            <h2>Quick answers</h2>
            <details>
              <summary>Do I need to know WordPress?</summary>
              <p>
                No. We set everything up and manage it for you. You can be as hands-on or
                hands-off as you like — most clients just text us what they need changed.
              </p>
            </details>
            <details>
              <summary>I already have a website — can you take it over?</summary>
              <p>
                Yes. Free migration is included on every plan: we move your site, your domain,
                and your email, and verify everything works before anything switches.
              </p>
            </details>
            <details>
              <summary>What happens after the free trial?</summary>
              <p>
                Your plan starts at the monthly price you picked — no surprises, no contracts.
                Cancel anytime and your domain and content go with you.
              </p>
            </details>
            <details>
              <summary>Is my site fast and secure?</summary>
              <p>
                Every site ships with free SSL, a global CDN, daily backups, a web-application
                firewall, and 99.99% uptime on wp.cloud infrastructure.
              </p>
            </details>
          </div>
        </section>

        {/* ── Legal-lite footer (main nav/footer hidden here) ── */}
        <div className="ad-legal">
          <a href="/legal/privacy">Privacy</a>
          <a href="/legal/terms">Terms</a>
          <a href="/support">Support</a>
        </div>

        {/* ── Sticky mobile CTA ────────────────────────────── */}
        <div className="ad-sticky">
          <div className="in">
            <span className="pr">
              {fromPrice ? <>From <b>{fromPrice}/mo</b> · free trial</> : <>14-day free trial</>}
            </span>
            <AdCta label="Start Free" className="bp" />
          </div>
        </div>
      </div>
    </>
  );
}
