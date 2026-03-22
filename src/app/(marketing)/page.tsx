import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ScrollReveal } from '@/components/marketing/scroll-reveal';
import { TestimonialCarousel } from '@/components/marketing/homepage/testimonial-carousel';
import { GutenbergAnimation } from '@/components/marketing/homepage/gutenberg-animation';
import { GlobeSection } from '@/components/marketing/homepage/globe-section';
import { ArchitectureCards } from '@/components/marketing/homepage/architecture-cards';
import { LighthouseScores } from '@/components/marketing/homepage/lighthouse-scores';
import { SerpAnimation } from '@/components/marketing/homepage/serp-animation';
import { StarField } from '@/components/marketing/homepage/star-field';
import { FaqAccordion } from '@/components/marketing/homepage/faq-accordion';

export const metadata: Metadata = {
  title: 'Envosta \u2014 WordPress Hosting Made Simple',
  description: 'Enterprise-grade WordPress hosting powered by WP.cloud. Personal onboarding, custom themes, and hands-on support.',
  alternates: { canonical: 'https://envosta.com' },
};

export default async function HomePage() {
  // If accessed from the app domain, redirect to dashboard
  const host = (await headers()).get('host') ?? '';
  if (host.startsWith('my.') || host.startsWith('app.') || host.includes('localhost')) {
    redirect('/dashboard');
  }
  return (
    <>
      <ScrollReveal />

      {/* ═══ SECTION 1 — HERO ═══ */}
      <section id="section-hero" data-pattern="envosta/hero" className="hero">
        <div className="hero-bg">
          <video autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }}>
            <source src="/assets/videos/hero-video.mp4" type="video/mp4" />
            <track kind="captions" default />
          </video>
        </div>
        <div className="hero-overlay"></div>
        <div className="c">
          <div className="hero-text">
            <h1>Where the best<br />websites are <em>created</em></h1>
            <p>
              <span className="hero-stagger">Personal onboarding. </span>
              <span className="hero-stagger">Handled from day one.</span><br />
              <span className="hero-stagger">Built to grow with you.</span>
            </p>
            <div className="block-button">
              <Link href="/get-started" className="bp lg">Start Your Website</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ZONE A ═══ */}
      <div className="zone zone-a">

        {/* ═══ SECTION 2 — ONBOARDING EXPERIENCE ═══ */}
        <section id="section-onboarding" className="onboarding rv">
          <div className="c">
            <div className="ob-header">
              <h2>It starts with a conversation</h2>
            </div>

            <div className="ob-stages">
              <div className="ob-stage">
                <div className="ob-stage-name">Discovery</div>
                <p>A real conversation about your business, your goals, and what your website needs to do.</p>
              </div>

              <div className="ob-line"><div className="ob-line-fill"></div></div>

              <div className="ob-stage">
                <div className="ob-stage-name">We Build</div>
                <p>While you focus on your business, we&apos;re setting everything up. Design, structure, security, performance — all handled before you see it.</p>
              </div>

              <div className="ob-line"><div className="ob-line-fill"></div></div>

              <div className="ob-stage">
                <div className="ob-stage-name">You Make It Yours</div>
                <p>Add your copy, your images, your personality. Everything is ready for you to finish the details and go live.</p>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <div className="block-button">
                <Link href="/contact" className="bp">Book Your Call</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ SECTION 3 — METRICS ═══ */}
        <section id="section-metrics" style={{ padding: '48px 0' }}>
          <div className="c">
            <div className="sp-stats rv">
              <div className="sp-stat">
                <strong>&lt;1s</strong>
                <span>Average load time</span>
              </div>
              <div className="sp-divider"></div>
              <div className="sp-stat">
                <strong>5 days</strong>
                <span>Average time to launch</span>
              </div>
              <div className="sp-divider"></div>
              <div className="sp-stat">
                <strong>99.99%</strong>
                <span>Uptime guarantee</span>
              </div>
              <div className="sp-divider"></div>
              <div className="sp-stat">
                <strong>Responsive</strong>
                <span>On every device</span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ SECTION 4 — TESTIMONIALS ═══ */}
        <section id="section-proof" style={{ padding: '48px 0' }}>
          <div className="c">
            <TestimonialCarousel />

            <div className="sp-logos rv">
              <span className="sp-logos-label">Trusted by thousands across</span>
              <div className="sp-logo-row">
                <div className="sp-logo-pill">🇨🇦 Canada</div>
                <div className="sp-logo-pill">🇺🇸 United States</div>
                <div className="sp-logo-pill">🇬🇧 United Kingdom</div>
                <div className="sp-logo-pill">🇦🇺 Australia</div>
                <div className="sp-logo-pill">🇪🇺 Europe</div>
              </div>
            </div>
          </div>
        </section>

      </div>{/* /zone-a */}

      {/* ═══ ZONE B ═══ */}
      <div className="zone zone-b">

        {/* ═══ SECTION 5 — THE EDITOR & SHOP ═══ */}
        <section id="section-editor" className="zm-section">
          <div className="c">

            {/* Text centered above */}
            <div className="rv zm-header">
              <div className="zm-tag">Built for You</div>
              <h2>Your site, your control</h2>
              <p>After handoff, you&apos;re in control. A visual editor that lets you change anything on your site without writing a single line of code.</p>
              <div className="zm-pills">
                <span>Drag and drop</span>
                <span>Live preview</span>
                <span>Any device</span>
              </div>
            </div>

            {/* Full-width cinematic animation */}
            <GutenbergAnimation />

            {/* Shop cards grid */}
            <div className="rv zm-grid-3" style={{ marginTop: '20px' }}>

              {/* Card 1: Online Shop / Storefront */}
              <div className="zm-card zm-card-dark zm-card-tall" style={{ background: 'linear-gradient(165deg,#0c1424 0%,#0a1020 100%)' }}>
                <svg viewBox="0 0 480 480" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '460px', position: 'absolute', top: 0, left: 0, right: 0 }} className="shop-svg">
                  <defs>
                    <linearGradient id="shopGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#2563EB" stopOpacity=".08" />
                      <stop offset="1" stopColor="#2563EB" stopOpacity="0" />
                    </linearGradient>
                    <filter id="shopShadow">
                      <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000" floodOpacity=".4" />
                    </filter>
                  </defs>

                  {/* Background glow */}
                  <ellipse cx="240" cy="200" rx="200" ry="160" fill="url(#shopGlow)" />

                  {/* Browser window */}
                  <g filter="url(#shopShadow)">
                    <rect x="24" y="24" width="432" height="360" rx="14" fill="#ffffff" />
                    <rect x="24" y="24" width="432" height="360" rx="14" stroke="rgba(0,0,0,.08)" strokeWidth="1" />
                  </g>

                  {/* Title bar */}
                  <rect x="24" y="24" width="432" height="36" rx="14" fill="#f5f5f7" />
                  <rect x="24" y="46" width="432" height="14" fill="#f5f5f7" />
                  <circle cx="46" cy="42" r="5" fill="#ff5f57" />
                  <circle cx="64" cy="42" r="5" fill="#febc2e" />
                  <circle cx="82" cy="42" r="5" fill="#28c840" />
                  <rect x="140" y="35" width="200" height="16" rx="8" fill="rgba(0,0,0,.05)" />
                  <text x="188" y="47" fill="rgba(0,0,0,.4)" fontFamily="Inter,sans-serif" fontSize="9" fontWeight="400">yourstore.envosta.com</text>

                  {/* Hero banner */}
                  <rect x="40" y="72" width="400" height="130" rx="10" fill="rgba(37,99,235,.06)" />
                  <rect x="40" y="72" width="400" height="130" rx="10" stroke="rgba(37,99,235,.08)" strokeWidth=".5" />
                  <text x="64" y="118" fill="#1a1a2e" fontFamily="Inter,sans-serif" fontSize="18" fontWeight="600" letterSpacing="-.3">Summer Collection</text>
                  <text x="64" y="140" fill="rgba(26,26,46,.5)" fontFamily="Inter,sans-serif" fontSize="11" fontWeight="300">New arrivals — shop the latest styles</text>
                  <rect x="64" y="155" width="90" height="30" rx="15" fill="#2563EB" />
                  <text x="86" y="175" fill="#fff" fontFamily="Inter,sans-serif" fontSize="10" fontWeight="500">Shop Now</text>

                  {/* Product cards */}
                  <g filter="url(#shopShadow)">
                    <rect x="40" y="218" width="126" height="150" rx="10" fill="#fff" />
                    <rect x="40" y="218" width="126" height="150" rx="10" stroke="rgba(0,0,0,.06)" strokeWidth=".5" />
                  </g>
                  <rect x="48" y="226" width="110" height="80" rx="6" fill="rgba(37,99,235,.12)" />
                  <text x="72" y="260" fill="rgba(59,130,246,.4)" fontFamily="Inter,sans-serif" fontSize="20">👕</text>
                  <text x="56" y="326" fill="#1a1a2e" fontFamily="Inter,sans-serif" fontSize="11" fontWeight="500">Classic Tee</text>
                  <text x="56" y="344" fill="rgba(26,26,46,.5)" fontFamily="Inter,sans-serif" fontSize="10" fontWeight="400">$38.00</text>
                  <text x="138" y="344" fill="#22c55e" fontFamily="Inter,sans-serif" fontSize="8" textAnchor="end">In Stock</text>

                  <g filter="url(#shopShadow)">
                    <rect x="178" y="218" width="126" height="150" rx="10" fill="#fff" />
                    <rect x="178" y="218" width="126" height="150" rx="10" stroke="rgba(0,0,0,.06)" strokeWidth=".5" />
                  </g>
                  <rect x="186" y="226" width="110" height="80" rx="6" fill="rgba(34,197,94,.08)" />
                  <text x="210" y="260" fill="rgba(34,197,94,.4)" fontFamily="Inter,sans-serif" fontSize="20">👜</text>
                  <text x="194" y="326" fill="#1a1a2e" fontFamily="Inter,sans-serif" fontSize="11" fontWeight="500">Canvas Bag</text>
                  <text x="194" y="344" fill="rgba(26,26,46,.5)" fontFamily="Inter,sans-serif" fontSize="10" fontWeight="400">$54.00</text>
                  <text x="276" y="344" fill="#22c55e" fontFamily="Inter,sans-serif" fontSize="8" textAnchor="end">In Stock</text>

                  <g filter="url(#shopShadow)">
                    <rect x="316" y="218" width="126" height="150" rx="10" fill="#fff" />
                    <rect x="316" y="218" width="126" height="150" rx="10" stroke="rgba(0,0,0,.06)" strokeWidth=".5" />
                  </g>
                  <rect x="324" y="226" width="110" height="80" rx="6" fill="rgba(168,85,247,.08)" />
                  <text x="348" y="260" fill="rgba(168,85,247,.4)" fontFamily="Inter,sans-serif" fontSize="20">🧥</text>
                  <text x="332" y="326" fill="#1a1a2e" fontFamily="Inter,sans-serif" fontSize="11" fontWeight="500">Denim Jacket</text>
                  <text x="332" y="344" fill="rgba(26,26,46,.5)" fontFamily="Inter,sans-serif" fontSize="10" fontWeight="400">$129.00</text>
                  <text x="414" y="344" fill="#f59e0b" fontFamily="Inter,sans-serif" fontSize="8" textAnchor="end">Popular</text>
                </svg>

                {/* Floating revenue badge */}
                <div className="wp-float-1" style={{ position: 'absolute', top: '180px', right: '20px' }}>
                  <svg width="120" height="52" viewBox="0 0 120 52" fill="none">
                    <rect width="120" height="52" rx="12" fill="rgba(3,6,16,.8)" />
                    <rect x=".5" y=".5" width="119" height="51" rx="11.5" stroke="rgba(255,255,255,.08)" />
                    <circle cx="16" cy="26" r="5" fill="rgba(34,197,94,.2)" />
                    <circle cx="16" cy="26" r="3" fill="#22c55e">
                      <animate attributeName="opacity" values="1;.4;1" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <text x="28" y="22" fill="rgba(255,255,255,.4)" fontFamily="Inter,sans-serif" fontSize="7">Revenue</text>
                    <text x="28" y="36" fill="#fff" fontFamily="Inter,sans-serif" fontSize="14" fontWeight="500">$12,480</text>
                  </svg>
                </div>

                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(0deg,rgba(10,16,32,.95) 0%,rgba(10,16,32,.7) 60%,transparent 100%)', padding: '56px 28px 28px', zIndex: 2, height: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <h3 style={{ fontFamily: "'Inter',sans-serif", fontSize: '1.3rem', fontWeight: 400, color: '#fff', marginBottom: '6px' }}>Start selling immediately</h3>
                  <p style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.45)', fontWeight: 300, lineHeight: 1.6 }}>Your shop goes live with your site. Payments, products, and shipping ready at launch.</p>
                </div>
              </div>

              {/* Card 2: Checkout Experience */}
              <div className="zm-card zm-card-dark zm-card-tall" style={{ background: 'linear-gradient(165deg,#0a0e1a 0%,#0c1424 100%)' }}>
                <svg viewBox="0 0 480 520" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '440px', position: 'absolute', top: 0, left: 0, right: 0 }} className="shop-svg">
                  <defs>
                    <linearGradient id="chkGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#2563EB" stopOpacity=".04" />
                      <stop offset="1" stopColor="transparent" />
                    </linearGradient>
                    <filter id="chkPanel">
                      <feDropShadow dx="0" dy="8" stdDeviation="16" floodColor="#000" floodOpacity=".45" />
                    </filter>
                    <filter id="chkBtn">
                      <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#2563EB" floodOpacity=".3" />
                    </filter>
                    <linearGradient id="btnGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#3B82F6" />
                      <stop offset="1" stopColor="#2563EB" />
                    </linearGradient>
                  </defs>

                  {/* Ambient glow */}
                  <ellipse cx="240" cy="200" rx="180" ry="160" fill="url(#chkGlow)" />

                  {/* Checkout panel */}
                  <g filter="url(#chkPanel)">
                    <rect x="48" y="16" width="384" height="440" rx="20" fill="#ffffff" />
                    <rect x="48" y="16" width="384" height="440" rx="20" stroke="rgba(0,0,0,.05)" strokeWidth="1" />
                  </g>

                  {/* Header area */}
                  <rect x="48" y="16" width="384" height="64" rx="20" fill="#fafafa" />
                  <rect x="48" y="60" width="384" height="20" fill="#fafafa" />
                  <line x1="48" y1="80" x2="432" y2="80" stroke="rgba(0,0,0,.06)" />
                  <text x="240" y="55" fill="#1a1a2e" fontFamily="Inter,sans-serif" fontSize="15" fontWeight="600" textAnchor="middle" letterSpacing="-.3">Checkout</text>
                  <rect x="68" y="42" width="8" height="8" rx="2" fill="rgba(0,0,0,.15)" />
                  <text x="400" y="55" fill="#2563EB" fontFamily="Inter,sans-serif" fontSize="11" fontWeight="500" textAnchor="end">Cart (2)</text>

                  {/* Order items */}
                  <text x="72" y="106" fill="rgba(26,26,46,.35)" fontFamily="Inter,sans-serif" fontSize="9" fontWeight="500" letterSpacing="1.5">ORDER</text>

                  {/* Item 1 */}
                  <rect x="72" y="118" width="48" height="48" rx="12" fill="#f0f4ff" />
                  <text x="88" y="150" fill="rgba(37,99,235,.6)" fontFamily="Inter,sans-serif" fontSize="22">👕</text>
                  <text x="132" y="137" fill="#1a1a2e" fontFamily="Inter,sans-serif" fontSize="12" fontWeight="500">Classic Tee</text>
                  <text x="132" y="154" fill="rgba(26,26,46,.4)" fontFamily="Inter,sans-serif" fontSize="10">White · M · Qty: 2</text>
                  <text x="408" y="144" fill="#1a1a2e" fontFamily="Inter,sans-serif" fontSize="13" fontWeight="600" textAnchor="end">$76.00</text>

                  {/* Item 2 */}
                  <rect x="72" y="178" width="48" height="48" rx="12" fill="#f0faf4" />
                  <text x="88" y="210" fill="rgba(34,197,94,.6)" fontFamily="Inter,sans-serif" fontSize="22">👜</text>
                  <text x="132" y="197" fill="#1a1a2e" fontFamily="Inter,sans-serif" fontSize="12" fontWeight="500">Canvas Bag</text>
                  <text x="132" y="214" fill="rgba(26,26,46,.4)" fontFamily="Inter,sans-serif" fontSize="10">Natural · Qty: 1</text>
                  <text x="408" y="204" fill="#1a1a2e" fontFamily="Inter,sans-serif" fontSize="13" fontWeight="600" textAnchor="end">$54.00</text>

                  <line x1="72" y1="240" x2="408" y2="240" stroke="rgba(0,0,0,.05)" />

                  {/* Payment method */}
                  <text x="72" y="264" fill="rgba(26,26,46,.35)" fontFamily="Inter,sans-serif" fontSize="9" fontWeight="500" letterSpacing="1.5">PAYMENT</text>

                  {/* Card input */}
                  <rect x="72" y="276" width="336" height="52" rx="12" fill="#f8f9fb" stroke="rgba(37,99,235,.15)" strokeWidth="1.5" />
                  <rect x="84" y="290" width="36" height="24" rx="5" fill="#1a1a2e" />
                  <text x="102" y="306" fill="#fff" fontFamily="Inter,sans-serif" fontSize="8" fontWeight="600" textAnchor="middle">VISA</text>
                  <text x="132" y="305" fill="#1a1a2e" fontFamily="Inter,sans-serif" fontSize="12" fontWeight="500">•••• 4242</text>
                  <text x="250" y="305" fill="rgba(26,26,46,.3)" fontFamily="Inter,sans-serif" fontSize="10">12/28</text>
                  <text x="396" y="305" fill="#2563EB" fontFamily="Inter,sans-serif" fontSize="10" fontWeight="500" textAnchor="end">Change</text>

                  {/* OR divider */}
                  <line x1="72" y1="344" x2="145" y2="344" stroke="rgba(0,0,0,.06)" />
                  <text x="168" y="348" fill="rgba(26,26,46,.25)" fontFamily="Inter,sans-serif" fontSize="9">or pay with</text>
                  <line x1="230" y1="344" x2="408" y2="344" stroke="rgba(0,0,0,.06)" />

                  {/* Apple Pay button */}
                  <rect x="72" y="358" width="160" height="40" rx="8" fill="#1a1a2e" />
                  <text x="132" y="383" fill="#fff" fontFamily="Inter,sans-serif" fontSize="11" fontWeight="500" textAnchor="middle"> Pay</text>

                  {/* Google Pay button */}
                  <rect x="244" y="358" width="164" height="40" rx="8" fill="#fff" stroke="rgba(0,0,0,.1)" strokeWidth="1" />
                  <text x="326" y="383" fill="#1a1a2e" fontFamily="Inter,sans-serif" fontSize="11" fontWeight="500" textAnchor="middle">G Pay</text>

                  {/* Total + CTA */}
                  <line x1="72" y1="412" x2="408" y2="412" stroke="rgba(0,0,0,.06)" />
                  <text x="72" y="436" fill="rgba(26,26,46,.45)" fontFamily="Inter,sans-serif" fontSize="11">Subtotal</text>
                  <text x="408" y="436" fill="rgba(26,26,46,.5)" fontFamily="Inter,sans-serif" fontSize="11" textAnchor="end">$130.00</text>
                  <text x="72" y="455" fill="rgba(26,26,46,.45)" fontFamily="Inter,sans-serif" fontSize="11">Shipping</text>
                  <text x="408" y="455" fill="#22c55e" fontFamily="Inter,sans-serif" fontSize="11" fontWeight="500" textAnchor="end">Free</text>

                  {/* Trust badges */}
                  <rect x="72" y="462" width="24" height="2" rx="1" fill="rgba(0,0,0,.04)" />
                  <text x="240" y="478" fill="rgba(26,26,46,.2)" fontFamily="Inter,sans-serif" fontSize="8" textAnchor="middle">🔒 Secured by Stripe · 256-bit encryption</text>
                </svg>

                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(0deg,rgba(10,14,26,.95) 0%,rgba(10,14,26,.7) 60%,transparent 100%)', padding: '56px 28px 28px', zIndex: 2, height: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <h3 style={{ fontFamily: "'Inter',sans-serif", fontSize: '1.3rem', fontWeight: 400, color: '#fff', marginBottom: '6px' }}>Checkout that converts</h3>
                  <p style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.45)', fontWeight: 300, lineHeight: 1.6 }}>One page, no friction. Powered by Stripe and optimized for every device.</p>
                </div>
              </div>

              {/* Card 3: Point of Sale */}
              <div className="zm-card zm-card-dark zm-card-tall" style={{ background: 'linear-gradient(165deg,#0c1220 0%,#0a1018 100%)' }}>
                <svg viewBox="0 0 480 560" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '440px', position: 'absolute', top: 0, left: 0, right: 0 }} className="shop-svg">
                  <defs>
                    <linearGradient id="posGlow2" x1=".5" y1="0" x2=".5" y2="1">
                      <stop offset="0" stopColor="#2563EB" stopOpacity=".06" />
                      <stop offset=".6" stopColor="transparent" />
                    </linearGradient>
                    <filter id="phoneDrop">
                      <feDropShadow dx="8" dy="16" stdDeviation="18" floodColor="#000" floodOpacity=".55" />
                    </filter>
                    <filter id="cardDrop">
                      <feDropShadow dx="4" dy="8" stdDeviation="12" floodColor="#000" floodOpacity=".5" />
                    </filter>
                    <linearGradient id="titanium" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#8e8e93" />
                      <stop offset=".3" stopColor="#b0b0b5" />
                      <stop offset=".5" stopColor="#c8c8cc" />
                      <stop offset=".7" stopColor="#a0a0a5" />
                      <stop offset="1" stopColor="#78787d" />
                    </linearGradient>
                    <linearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#1c1c2e" />
                      <stop offset=".4" stopColor="#2a2a3e" />
                      <stop offset="1" stopColor="#1a1a28" />
                    </linearGradient>
                  </defs>

                  <ellipse cx="220" cy="240" rx="160" ry="200" fill="url(#posGlow2)" />

                  {/* Phone — angled 3D perspective */}
                  <g transform="translate(105,25) skewY(3) rotate(-5) scale(0.88)" filter="url(#phoneDrop)">
                    {/* Phone body */}
                    <rect x="0" y="0" width="250" height="480" rx="36" fill="url(#titanium)" />
                    <rect x="3" y="3" width="244" height="474" rx="34" fill="#111" />
                    <rect x="8" y="12" width="234" height="456" rx="28" fill="#ffffff" />

                    {/* Dynamic Island */}
                    <rect x="85" y="18" width="80" height="24" rx="12" fill="#111" />

                    {/* Status bar */}
                    <text x="28" y="54" fill="rgba(0,0,0,.5)" fontFamily="Inter,sans-serif" fontSize="10" fontWeight="600">9:41</text>
                    <text x="222" y="54" fill="rgba(0,0,0,.4)" fontFamily="Inter,sans-serif" fontSize="9" textAnchor="end">100%</text>

                    {/* Tap to Pay UI */}
                    <circle cx="125" cy="155" r="52" fill="rgba(37,99,235,.05)" />
                    <circle cx="125" cy="155" r="38" fill="none" stroke="rgba(37,99,235,.1)" strokeWidth="1.5" />

                    {/* Animated waves */}
                    <path d="M113 143 a18 18 0 0 1 0 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" opacity=".4">
                      <animate attributeName="opacity" values=".15;.6;.15" dur="1.5s" repeatCount="indefinite" />
                    </path>
                    <path d="M107 135 a28 28 0 0 1 0 40" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" opacity=".25">
                      <animate attributeName="opacity" values=".08;.4;.08" dur="1.5s" begin=".3s" repeatCount="indefinite" />
                    </path>
                    <path d="M101 127 a38 38 0 0 1 0 56" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" opacity=".12">
                      <animate attributeName="opacity" values=".04;.25;.04" dur="1.5s" begin=".6s" repeatCount="indefinite" />
                    </path>

                    {/* Pulse ring */}
                    <circle cx="125" cy="155" r="42" fill="none" stroke="#2563EB" strokeWidth="1" opacity=".1">
                      <animate attributeName="r" values="38;55;38" dur="2.2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values=".15;.03;.15" dur="2.2s" repeatCount="indefinite" />
                    </circle>

                    {/* Ready text */}
                    <text x="125" y="228" fill="#1a1a2e" fontFamily="Inter,sans-serif" fontSize="15" fontWeight="600" textAnchor="middle">Ready for payment</text>
                    <text x="125" y="248" fill="rgba(26,26,46,.4)" fontFamily="Inter,sans-serif" fontSize="10" textAnchor="middle">Hold card near device</text>

                    {/* Amount */}
                    <rect x="60" y="268" width="130" height="50" rx="14" fill="rgba(37,99,235,.06)" stroke="rgba(37,99,235,.08)" strokeWidth=".5" />
                    <text x="125" y="300" fill="#1a1a2e" fontFamily="Inter,sans-serif" fontSize="24" fontWeight="700" textAnchor="middle">$17.00</text>

                    {/* Divider */}
                    <line x1="28" y1="336" x2="222" y2="336" stroke="rgba(0,0,0,.06)" />

                    {/* Cart items */}
                    <text x="28" y="358" fill="rgba(26,26,46,.3)" fontFamily="Inter,sans-serif" fontSize="8" fontWeight="500" letterSpacing="1">3 ITEMS</text>
                    <text x="28" y="378" fill="rgba(26,26,46,.55)" fontFamily="Inter,sans-serif" fontSize="10">Latte × 1</text>
                    <text x="222" y="378" fill="rgba(26,26,46,.35)" fontFamily="Inter,sans-serif" fontSize="10" textAnchor="end">$5.50</text>
                    <text x="28" y="398" fill="rgba(26,26,46,.55)" fontFamily="Inter,sans-serif" fontSize="10">Croissant × 2</text>
                    <text x="222" y="398" fill="rgba(26,26,46,.35)" fontFamily="Inter,sans-serif" fontSize="10" textAnchor="end">$7.00</text>
                    <text x="28" y="418" fill="rgba(26,26,46,.55)" fontFamily="Inter,sans-serif" fontSize="10">Blueberry Muffin</text>
                    <text x="222" y="418" fill="rgba(26,26,46,.35)" fontFamily="Inter,sans-serif" fontSize="10" textAnchor="end">$4.50</text>

                    {/* Home indicator */}
                    <rect x="90" y="454" width="70" height="4" rx="2" fill="rgba(0,0,0,.12)" />
                  </g>

                  {/* Credit card — angled, floating */}
                  <g transform="translate(250,60) rotate(-18) skewX(5)" filter="url(#cardDrop)">
                    <rect x="0" y="0" width="180" height="110" rx="12" fill="url(#cardGrad)" />
                    <rect x="0" y="0" width="180" height="110" rx="12" stroke="rgba(255,255,255,.08)" strokeWidth=".5" />
                    <rect x="0" y="0" width="180" height="55" rx="12" fill="rgba(255,255,255,.03)" />

                    {/* EMV Chip */}
                    <rect x="20" y="28" width="28" height="22" rx="4" fill="none" stroke="rgba(212,175,55,.5)" strokeWidth="1" />
                    <line x1="20" y1="39" x2="48" y2="39" stroke="rgba(212,175,55,.3)" strokeWidth=".5" />
                    <line x1="34" y1="28" x2="34" y2="50" stroke="rgba(212,175,55,.3)" strokeWidth=".5" />
                    <rect x="22" y="30" width="24" height="18" rx="3" fill="rgba(212,175,55,.12)" />

                    {/* Contactless symbol */}
                    <path d="M60 34 a6 6 0 0 1 0 10" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1.2" strokeLinecap="round" />
                    <path d="M64 30 a10 10 0 0 1 0 18" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1.2" strokeLinecap="round" />
                    <path d="M68 26 a14 14 0 0 1 0 26" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="1.2" strokeLinecap="round" />

                    {/* Card number */}
                    <text x="20" y="78" fill="rgba(255,255,255,.45)" fontFamily="Inter,sans-serif" fontSize="11" fontWeight="400" letterSpacing="2">•••• •••• •••• 4242</text>

                    {/* Cardholder */}
                    <text x="20" y="98" fill="rgba(255,255,255,.3)" fontFamily="Inter,sans-serif" fontSize="8" fontWeight="400" letterSpacing="1">J. MITCHELL</text>

                    {/* Card brand */}
                    <circle cx="152" cy="92" r="10" fill="rgba(255,100,50,.25)" />
                    <circle cx="162" cy="92" r="10" fill="rgba(255,200,50,.2)" />

                    {/* Expiry */}
                    <text x="100" y="98" fill="rgba(255,255,255,.25)" fontFamily="Inter,sans-serif" fontSize="7">VALID THRU</text>
                    <text x="100" y="106" fill="rgba(255,255,255,.35)" fontFamily="Inter,sans-serif" fontSize="8" fontWeight="500">12/28</text>
                  </g>
                </svg>

                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(0deg,rgba(10,16,24,.95) 0%,rgba(10,16,24,.7) 60%,transparent 100%)', padding: '56px 28px 28px', zIndex: 2, height: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <h3 style={{ fontFamily: "'Inter',sans-serif", fontSize: '1.3rem', fontWeight: 400, color: '#fff', marginBottom: '6px' }}>Sell in person, too</h3>
                  <p style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.45)', fontWeight: 300, lineHeight: 1.6 }}>Accept tap, card, and cash payments from your phone. Same inventory, anywhere.</p>
                </div>
              </div>

            </div>{/* /zm-grid-3 */}

          </div>
        </section>

        {/* ═══ SECTION 7 — RESPONSIVE ═══ */}
        <section id="section-about" data-pattern="envosta/about" className="zm-section">
          <div className="c">
            <div className="rv zm-header zm-header-left">
              <div className="zm-tag">Responsive</div>
              <h2>Designed for every screen</h2>
            </div>
            <div className="zm-grid-2 rv">

              {/* Card 1 — Desktop: Bakery site with visual editor */}
              <div className="zm-card zm-card-tall" style={{ padding: 0, overflow: 'hidden', background: 'linear-gradient(145deg,#faf8f3 0%,#f4f1ea 50%,#efeadf 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: '1200px', position: 'relative' }}>
                <div className="resp-tilt" style={{ transform: 'rotateY(-12deg) rotateX(4deg)', transformStyle: 'preserve-3d', transition: 'transform .6s cubic-bezier(.22,1,.36,1)' }}>
                  <div className="resp-mon">
                    <div className="resp-mon-screen">

                      <div className="resp-editor-bar">
                        <div className="reb-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" width="6" height="6"><path d="M12 20h9" /><path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z" /></svg></div>
                        <div className="reb-sep"></div>
                        <div className="reb-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" width="6" height="6"><rect x="3" y="3" width="18" height="18" rx="2" /></svg></div>
                        <div className="reb-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" width="6" height="6"><path d="M4 6h16M4 12h16M4 18h7" /></svg></div>
                        <div className="reb-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" width="6" height="6"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg></div>
                        <div className="reb-sep"></div>
                        <div className="reb-label">Editing: Hero Section</div>
                      </div>

                      <div className="rds-nav">
                        <div className="rds-logo">Maison Pâtisserie</div>
                        <div className="rds-links"><span>Menu</span><span>About</span><span>Catering</span><span>Contact</span><div className="rds-cart">2</div></div>
                      </div>

                      <div className="rds-hero">
                        <div className="rds-hero-img"></div>
                        <div className="rds-hero-text">
                          <h2 style={{ fontSize: '8px', fontWeight: 700, color: '#1a1a2e', letterSpacing: '-.3px', lineHeight: 1.15, margin: 0 }}>Handcrafted pastries,<br />delivered fresh daily.</h2>
                          <p style={{ fontSize: '4.5px', color: '#8a8a9a', lineHeight: 1.5, fontWeight: 300, margin: '4px 0 0' }}>Artisan croissants, custom cakes, and seasonal specialties.</p>
                          <div className="rds-btn">Order Now →</div>
                        </div>
                      </div>

                      <div className="rds-products">
                        <div className="rds-ptitle">Popular This Week</div>
                        <div className="rds-pgrid">
                          <div className="rds-prod">
                            <div className="rds-pimg rds-p1"><div className="rds-price">$4.50</div></div>
                            <div className="rds-pbody"><div>Butter Croissant</div><div className="rds-psub">Flaky, golden, perfect</div></div>
                          </div>
                          <div className="rds-prod">
                            <div className="rds-pimg rds-p2"><div className="rds-price">$38</div></div>
                            <div className="rds-pbody"><div>Celebration Cake</div><div className="rds-psub">Custom decorated</div></div>
                          </div>
                          <div className="rds-prod">
                            <div className="rds-pimg rds-p3"><div className="rds-price">$6</div></div>
                            <div className="rds-pbody"><div>Pain au Chocolat</div><div className="rds-psub">Double chocolate</div></div>
                          </div>
                        </div>
                      </div>

                    </div>
                    <div className="resp-mon-chin"><div className="resp-mon-dot"></div></div>
                  </div>
                  <div className="resp-mon-stand"><div className="resp-mon-neck"></div><div className="resp-mon-base"></div></div>
                  <div className="resp-mon-shadow"></div>
                </div>
                <div style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(8px)', border: '1px solid #e8e4da', borderRadius: '10px', padding: '8px 14px', boxShadow: '0 4px 12px rgba(0,0,0,.04)', zIndex: 5 }}>
                  <span style={{ fontSize: '.58rem', fontWeight: 500, color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: '5px' }}>🖥 Visual editor included</span>
                </div>
                <div style={{ position: 'absolute', bottom: '28px', left: '28px', zIndex: 5 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 500, color: '#1a1a2e', marginBottom: '4px' }}>Desktop first</div>
                  <div style={{ fontSize: '.72rem', color: '#8a8a9a', fontWeight: 300, maxWidth: '200px', lineHeight: 1.5 }}>Full-width layouts with the visual editor built right in.</div>
                </div>
              </div>

              {/* Card 2 — Mobile: E-commerce store */}
              <div className="zm-card zm-card-tall" style={{ padding: 0, overflow: 'hidden', background: 'linear-gradient(145deg,#faf8f3 0%,#f4f1ea 50%,#efeadf 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: '1200px', position: 'relative' }}>

                <div className="resp-tab-bg">
                  <div className="resp-tab-bg-screen">
                    <div className="rtbs-line"></div>
                    <div className="rtbs-line w50"></div>
                    <div className="rtbs-block"></div>
                    <div className="rtbs-grid"><div></div><div></div><div></div><div></div></div>
                  </div>
                </div>

                <div className="resp-tilt" style={{ transform: 'rotateY(8deg) rotateX(3deg)' }}>
                  <div className="resp-ph">
                    <div className="resp-ph-screen">
                      <div className="resp-ph-notch"><div className="resp-ph-island"></div></div>

                      <div className="rms-nav">
                        <div className="rms-logo">Maison</div>
                        <div className="rms-icons">
                          <div className="rms-icon"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg></div>
                          <div className="rms-icon rms-cart-badge"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /></svg></div>
                        </div>
                      </div>

                      <div className="rms-search">
                        <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        <span>Search pastries...</span>
                      </div>

                      <div className="rms-banner">
                        <div className="rms-banner-text">
                          <div>Free delivery this weekend</div>
                          <div className="rms-banner-sub">Orders over $25 ship free</div>
                          <div className="rms-banner-btn">Shop Now</div>
                        </div>
                        <div className="rms-banner-emoji">🥐</div>
                      </div>

                      <div className="rms-section">
                        <div className="rms-section-title"><span>Bestsellers</span><span className="rms-see-all">See all →</span></div>
                        <div className="rms-prods">
                          <div className="rms-prod">
                            <div className="rms-prod-img rms-pi1">
                              <div className="rms-heart"><svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" width="5" height="5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg></div>
                            </div>
                            <div className="rms-prod-body"><div>Butter Croissant</div><div className="rms-prod-sub">Classic french pastry</div><div className="rms-prod-price">$4.50</div></div>
                          </div>
                          <div className="rms-prod">
                            <div className="rms-prod-img rms-pi2">
                              <div className="rms-heart"><svg viewBox="0 0 24 24" fill="none" stroke="#d0d0d0" strokeWidth="2" width="5" height="5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg></div>
                            </div>
                            <div className="rms-prod-body"><div>Almond Danish</div><div className="rms-prod-sub">Fresh baked daily</div><div className="rms-prod-price">$5.25</div></div>
                          </div>
                        </div>
                      </div>

                      <div className="rms-speed"><div className="rms-speed-dot"></div><span>Loaded in 0.8s</span></div>
                    </div>
                  </div>
                </div>

                <div style={{ position: 'absolute', top: '24px', left: '24px', background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(8px)', border: '1px solid #e8e4da', borderRadius: '10px', padding: '8px 14px', boxShadow: '0 4px 12px rgba(0,0,0,.04)', zIndex: 5 }}>
                  <span style={{ fontSize: '.58rem', fontWeight: 500, color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: '5px' }}>📱 Online store included</span>
                </div>
                <div style={{ position: 'absolute', bottom: '28px', right: '28px', textAlign: 'right', zIndex: 5 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 500, color: '#1a1a2e', marginBottom: '4px' }}>Mobile perfect</div>
                  <div style={{ fontSize: '.72rem', color: '#8a8a9a', fontWeight: 300, maxWidth: '200px', lineHeight: 1.5 }}>Full e-commerce with cart, search, and checkout on every device.</div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ═══ SECTION 6 — INTEGRATIONS ═══ */}
        <section className="zm-section">
          <div className="c">

            <div className="rv zm-header zm-header-left">
              <div className="zm-tag">Integrations</div>
              <h2>Connects to the tools you already use</h2>
            </div>

            <div className="rv zm-card zm-card-tall" style={{ padding: 0, overflow: 'hidden', background: 'linear-gradient(145deg,#f5f0e6 0%,#faf7f0 20%,#fffef9 50%,#faf7f0 80%,#f2ede2 100%)', position: 'relative', borderColor: '#ddd8cc' }}>
              {/* Dot grid pattern */}
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle,rgba(26,26,46,.03) 1px,transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }}></div>
              {/* Corner gradients */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '55%', height: '55%', background: 'radial-gradient(ellipse at top left,rgba(180,172,156,.3),transparent 65%)', pointerEvents: 'none', zIndex: 0 }}></div>
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '55%', height: '55%', background: 'radial-gradient(ellipse at bottom right,rgba(180,172,156,.3),transparent 65%)', pointerEvents: 'none', zIndex: 0 }}></div>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '45%', height: '45%', background: 'radial-gradient(ellipse at top right,rgba(200,192,176,.15),transparent 60%)', pointerEvents: 'none', zIndex: 0 }}></div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '45%', height: '45%', background: 'radial-gradient(ellipse at bottom left,rgba(200,192,176,.15),transparent 60%)', pointerEvents: 'none', zIndex: 0 }}></div>
              {/* Center highlight */}
              <div style={{ position: 'absolute', top: '30%', left: '30%', width: '40%', height: '40%', background: 'radial-gradient(ellipse at center,rgba(255,255,250,.5),transparent 65%)', pointerEvents: 'none', zIndex: 0 }}></div>
              {/* Inset shadow */}
              <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 80px rgba(180,172,156,.2),inset 0 2px 0 rgba(255,255,255,.5)', pointerEvents: 'none', borderRadius: '24px', zIndex: 0 }}></div>

              {/* D1 FOREGROUND — 6 large */}
              <div className="int-fl int-fl-lg int-d1 int-fa1" style={{ top: '16%', left: '10%' }}>
                <img loading="lazy" src="/assets/images/logos/stripe.jpeg" alt="Stripe" width="32" height="32" style={{ borderRadius: '6px' }} />
                <div><div className="int-fl-name">Stripe</div><div className="int-fl-desc">Payments</div></div>
              </div>

              <div className="int-fl int-fl-lg int-d1 int-fa3" style={{ top: '18%', left: '72%' }}>
                <img loading="lazy" src="/assets/images/logos/google-analytics.svg" alt="Google Analytics" width="32" height="32" />
                <div><div className="int-fl-name">Google Analytics</div><div className="int-fl-desc">Tracking</div></div>
              </div>

              <div className="int-fl int-fl-lg int-d1 int-fa4" style={{ top: '68%', left: '16%' }}>
                <img loading="lazy" src="/assets/images/logos/hubspot.svg" alt="HubSpot" width="32" height="32" />
                <div><div className="int-fl-name">HubSpot</div><div className="int-fl-desc">CRM</div></div>
              </div>

              <div className="int-fl int-fl-lg int-d1 int-fa2" style={{ top: '72%', left: '76%' }}>
                <img loading="lazy" src="/assets/images/logos/zapier.jpeg" alt="Zapier" width="32" height="32" style={{ borderRadius: '6px' }} />
                <div><div className="int-fl-name">Zapier</div><div className="int-fl-desc">Automation</div></div>
              </div>

              <div className="int-fl int-fl-lg int-d1 int-fa5" style={{ top: '42%', left: '84%' }}>
                <img loading="lazy" src="/assets/images/logos/microsoft365.svg" alt="Microsoft 365" width="32" height="32" />
                <div><div className="int-fl-name">Microsoft 365</div><div className="int-fl-desc">Productivity</div></div>
              </div>

              <div className="int-fl int-fl-lg int-d1 int-fa6" style={{ top: '44%', left: '6%' }}>
                <img loading="lazy" src="/assets/images/logos/paypal.jpeg" alt="PayPal" width="32" height="32" style={{ borderRadius: '6px' }} />
                <div><div className="int-fl-name">PayPal</div><div className="int-fl-desc">Payments</div></div>
              </div>

              {/* D2 MID — 8 medium */}
              <div className="int-fl int-fl-md int-d2 int-fa2" style={{ top: '8%', left: '40%' }}>
                <img loading="lazy" src="/assets/images/logos/meta.svg" alt="Meta" width="26" height="26" />
                <div><div className="int-fl-name">Meta Pixel</div></div>
              </div>

              <div className="int-fl int-fl-md int-d2 int-fa5" style={{ top: '32%', left: '28%' }}>
                <img loading="lazy" src="/assets/images/logos/square.svg" alt="Square" width="26" height="26" />
                <div><div className="int-fl-name">Square</div></div>
              </div>

              <div className="int-fl int-fl-md int-d2 int-fa1" style={{ top: '30%', left: '56%' }}>
                <img loading="lazy" src="/assets/images/logos/instagram.svg" alt="Instagram" width="26" height="26" />
                <div><div className="int-fl-name">Instagram</div></div>
              </div>

              <div className="int-fl int-fl-md int-d2 int-fa3" style={{ top: '88%', left: '42%' }}>
                <img loading="lazy" src="/assets/images/logos/jetpack.jpeg" alt="Jetpack" width="26" height="26" style={{ borderRadius: '6px' }} />
                <div><div className="int-fl-name">Jetpack</div></div>
              </div>

              <div className="int-fl int-fl-md int-d2 int-fa6" style={{ top: '60%', left: '52%' }}>
                <img loading="lazy" src="/assets/images/logos/intuit.png" alt="Intuit" width="26" height="26" style={{ borderRadius: '6px' }} />
                <div><div className="int-fl-name">Intuit</div></div>
              </div>

              <div className="int-fl int-fl-md int-d2 int-fa4" style={{ top: '10%', left: '62%' }}>
                <img loading="lazy" src="/assets/images/logos/stripe.jpeg" alt="Stripe" width="26" height="26" style={{ borderRadius: '6px' }} />
                <div><div className="int-fl-name">Shopify</div></div>
              </div>

              <div className="int-fl int-fl-md int-d2 int-fa1" style={{ top: '84%', left: '68%' }}>
                <img loading="lazy" src="/assets/images/logos/google-analytics.svg" alt="Google Analytics" width="26" height="26" />
                <div><div className="int-fl-name">Search Console</div></div>
              </div>

              <div className="int-fl int-fl-md int-d2 int-fa5" style={{ top: '56%', left: '34%' }}>
                <img loading="lazy" src="/assets/images/logos/meta.svg" alt="Meta" width="26" height="26" />
                <div><div className="int-fl-name">Facebook</div></div>
              </div>

              {/* D3 BACKGROUND — 8 small */}
              <div className="int-fl int-fl-sm int-d3 int-fa4" style={{ top: '24%', left: '45%' }}>
                <img loading="lazy" src="/assets/images/logos/paypal.jpeg" alt="PayPal" width="20" height="20" style={{ borderRadius: '5px' }} />
                <div><div className="int-fl-name">Mailchimp</div></div>
              </div>

              <div className="int-fl int-fl-sm int-d3 int-fa6" style={{ top: '6%', left: '20%' }}>
                <img loading="lazy" src="/assets/images/logos/square.svg" alt="Square" width="20" height="20" />
                <div><div className="int-fl-name">Slack</div></div>
              </div>

              <div className="int-fl int-fl-sm int-d3 int-fa2" style={{ top: '50%', left: '66%' }}>
                <img loading="lazy" src="/assets/images/logos/hubspot.svg" alt="HubSpot" width="20" height="20" />
                <div><div className="int-fl-name">Salesforce</div></div>
              </div>

              <div className="int-fl int-fl-sm int-d3 int-fa3" style={{ top: '78%', left: '92%' }}>
                <img loading="lazy" src="/assets/images/logos/instagram.svg" alt="Instagram" width="20" height="20" />
                <div><div className="int-fl-name">TikTok</div></div>
              </div>

              <div className="int-fl int-fl-sm int-d3 int-fa5" style={{ top: '92%', left: '16%' }}>
                <img loading="lazy" src="/assets/images/logos/microsoft365.svg" alt="Microsoft 365" width="20" height="20" />
                <div><div className="int-fl-name">Google Ads</div></div>
              </div>

              <div className="int-fl int-fl-sm int-d3 int-fa1" style={{ top: '38%', left: '92%' }}>
                <img loading="lazy" src="/assets/images/logos/zapier.jpeg" alt="Zapier" width="20" height="20" style={{ borderRadius: '5px' }} />
                <div><div className="int-fl-name">Airtable</div></div>
              </div>

              <div className="int-fl int-fl-sm int-d3 int-fa4" style={{ top: '74%', left: '44%' }}>
                <img loading="lazy" src="/assets/images/logos/jetpack.jpeg" alt="Jetpack" width="20" height="20" style={{ borderRadius: '5px' }} />
                <div><div className="int-fl-name">Calendly</div></div>
              </div>

              <div className="int-fl int-fl-sm int-d3 int-fa6" style={{ top: '6%', left: '88%' }}>
                <img loading="lazy" src="/assets/images/logos/intuit.png" alt="Intuit" width="20" height="20" style={{ borderRadius: '5px' }} />
                <div><div className="int-fl-name">QuickBooks</div></div>
              </div>

              {/* 1000s more */}
              <div className="int-fl int-fl-md int-d2 int-fa3" style={{ top: '90%', left: '88%', background: 'rgba(34,197,94,.06)', borderColor: 'rgba(34,197,94,.15)' }}>
                <div><div className="int-fl-name" style={{ fontWeight: 600 }}>1000s</div><div className="int-fl-desc">&amp; more</div></div>
              </div>

              {/* Center badge */}
              <div className="int-cb">
                <div className="int-cb-pill"><div className="int-cb-dot"></div> Connected to everything</div>
                <div className="int-cb-sub">Configured during onboarding</div>
              </div>

            </div>
          </div>
        </section>

        <div style={{ height: '64px' }}></div>

      </div>{/* /zone-b */}

      {/* ═══ ZONE C ═══ */}
      <div className="zone zone-c">
        <StarField />
        {/* Solid top edge */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '12%', background: 'linear-gradient(180deg,#030818 0%,#020610 40%,transparent 100%)', pointerEvents: 'none', zIndex: 1 }}></div>
        {/* Subtle blue glow — left */}
        <div style={{ position: 'absolute', top: '15%', left: '-5%', width: '40%', height: '35%', background: 'radial-gradient(ellipse at center,rgba(37,99,235,.04),transparent 65%)', pointerEvents: 'none', zIndex: 0 }}></div>
        {/* Subtle blue glow — right */}
        <div style={{ position: 'absolute', top: '25%', right: '-5%', width: '35%', height: '30%', background: 'radial-gradient(ellipse at center,rgba(59,130,246,.03),transparent 65%)', pointerEvents: 'none', zIndex: 0 }}></div>
        {/* Deep void center */}
        <div style={{ position: 'absolute', top: '30%', left: 0, right: 0, height: '40%', background: 'radial-gradient(ellipse at center,rgba(2,4,8,.4),transparent 70%)', pointerEvents: 'none', zIndex: 0 }}></div>
        {/* Subtle green glow — bottom */}
        <div style={{ position: 'absolute', bottom: '10%', left: '0%', width: '40%', height: '30%', background: 'radial-gradient(ellipse at center,rgba(34,197,94,.025),transparent 65%)', pointerEvents: 'none', zIndex: 0 }}></div>
        <div style={{ position: 'absolute', bottom: '15%', right: '0%', width: '35%', height: '25%', background: 'radial-gradient(ellipse at center,rgba(34,197,94,.02),transparent 65%)', pointerEvents: 'none', zIndex: 0 }}></div>
        {/* Solid bottom edge */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '12%', background: 'linear-gradient(0deg,#031210 0%,#031210 30%,transparent 100%)', pointerEvents: 'none', zIndex: 1 }}></div>

        {/* ═══ ARCHITECTURE STACK ═══ */}
        <div className="c" style={{ position: 'relative', zIndex: 2, paddingTop: '64px' }}>
          <div className="rv zc-header">
            <div className="zc-tag">Every Layer</div>
            <h2 className="zc-title">Nothing is an afterthought</h2>
            <p className="zc-desc">Five layers. Each one the best in its class. Together, they&apos;re the reason everything above just works.</p>
          </div>
        </div>

        <div style={{ padding: '0 0 80px' }}>
          <div className="c" style={{ position: 'relative', zIndex: 2 }}>
            <ArchitectureCards />
          </div>
        </div>

        {/* ═══ WP.CLOUD GLOBE ═══ */}
        <div className="c" style={{ position: 'relative', zIndex: 10, textAlign: 'center', marginBottom: 0 }}>
          <div style={{ display: 'inline-block', fontSize: '.7rem', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '3px', color: '#3b82f6', marginBottom: '14px' }}>wp.cloud</div>
          <h2 className="ig-hdr-title">The infrastructure behind<br />the simplicity</h2>
        </div>

        <GlobeSection />

        {/* Badges + trust + status */}
        <div className="c" style={{ position: 'relative', zIndex: 10 }}>
          <div className="ig-wrap" id="ig-wrap">
            <div className="ig-fm ig-fm-1" id="igf1"><div className="ig-fm-card"><div className="ig-fm-val">99.99<span>%</span></div><div className="ig-fm-label">Uptime SLA</div></div></div>
            <div className="ig-fm ig-fm-2" id="igf2"><div className="ig-fm-card"><div className="ig-fm-val">&lt;142<span>ms</span></div><div className="ig-fm-label">Response Time</div></div></div>
            <div className="ig-fm ig-fm-3" id="igf3"><div className="ig-fm-card"><div className="ig-fm-val">28<span>+</span></div><div className="ig-fm-label">Edge Locations</div></div></div>
            <div className="ig-fm ig-fm-4" id="igf4"><div className="ig-fm-card"><div className="ig-fm-val" id="ig-req-val">0</div><div className="ig-fm-label">Requests Today</div></div></div>
          </div>

          <div className="ig-trust" id="ig-trust">
            <p>Your site runs on <em>wp.cloud</em> — 28 edge locations, sub-150ms response times, and 99.99% uptime backed by the same platform that powers <strong>WordPress.com</strong> and <strong>WordPress VIP</strong>.</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="ig-status" id="ig-status">
              <div className="ig-status-inner">
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,.5)', animation: 'dotPulse 2s ease-in-out infinite' }}></div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.56rem', color: '#86efac', letterSpacing: '.5px' }}>All systems operational</div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ SECTION 8C — SEO & CUSTOM THEME ═══ */}
        <section className="zc-section">
          <div className="c zc-inner">
            <div className="rv zc-split" id="seo-split">

              {/* Left — Text */}
              <div>
                <div className="zc-tag">Custom Theme</div>
                <h2 className="zc-title zc-title--md">Built to rank<br />from day one</h2>
                <p className="zc-desc zc-desc--left">Every Envosta theme is built from scratch — proper heading hierarchy, semantic HTML, structured data, clean URLs, and Core Web Vitals optimization baked into the code. Not a template with an SEO plugin. A real site engineered for search engines.</p>

                <div className="zc-checklist">
                  <div className="zc-check"><div className="zc-check-dot" style={{ background: '#22c55e' }}></div><span>Custom block theme architecture</span></div>
                  <div className="zc-check"><div className="zc-check-dot" style={{ background: '#3b82f6' }}></div><span>Schema &amp; structured data built-in</span></div>
                  <div className="zc-check"><div className="zc-check-dot" style={{ background: '#8b5cf6' }}></div><span>Semantic HTML5 &amp; heading hierarchy</span></div>
                  <div className="zc-check"><div className="zc-check-dot" style={{ background: '#63b3ed' }}></div><span>Core Web Vitals optimized</span></div>
                  <div className="zc-check"><div className="zc-check-dot" style={{ background: '#f59e0b' }}></div><span>Clean URLs &amp; XML sitemaps on launch</span></div>
                </div>
              </div>

              {/* Right — SERP visual */}
              <SerpAnimation />

            </div>
          </div>
        </section>

        {/* ═══ SECTION 8C2 — PERFORMANCE / LIGHTHOUSE ═══ */}
        <section className="zc-section">
          <div className="c zc-inner">
            <div className="rv zc-split" id="perf-split">

              {/* Left — Text */}
              <div>
                <div className="zc-tag">Speed</div>
                <h2 className="zc-title zc-title--md">Performance you<br />can measure</h2>
                <p className="zc-desc zc-desc--left">No page builder bloat. No unnecessary JavaScript. No render-blocking CSS. Every Envosta site is built lean — and the Lighthouse scores prove it.</p>

                <div className="zc-checklist">
                  <div className="zc-check"><div className="zc-check-dot" style={{ background: '#22c55e' }}></div><span>Sub-second load times</span></div>
                  <div className="zc-check"><div className="zc-check-dot" style={{ background: '#22c55e' }}></div><span>Zero render-blocking resources</span></div>
                  <div className="zc-check"><div className="zc-check-dot" style={{ background: '#22c55e' }}></div><span>Optimized images &amp; lazy loading</span></div>
                  <div className="zc-check"><div className="zc-check-dot" style={{ background: '#22c55e' }}></div><span>Critical CSS inlined</span></div>
                </div>
              </div>

              {/* Right — Lighthouse score rings */}
              <LighthouseScores />

            </div>
          </div>
        </section>

        {/* ═══ SECTION 8D — SECURITY & MAINTENANCE ═══ */}
        <section className="zc-section">
          <div className="c zc-inner">
            <div className="rv zc-split" id="sec-split">

              {/* Left — Security feature grid */}
              <div className="zc-feat-grid">
                <div className="zc-feat">
                  <div className="zc-feat-icon">🛡️</div>
                  <div className="zc-feat-name">WAF Protection</div>
                  <div className="zc-feat-desc">Enterprise firewall blocks threats before they reach your site.</div>
                </div>
                <div className="zc-feat">
                  <div className="zc-feat-icon">🔒</div>
                  <div className="zc-feat-name">Free SSL</div>
                  <div className="zc-feat-desc">Auto-provisioned certificates for every domain.</div>
                </div>
                <div className="zc-feat">
                  <div className="zc-feat-icon">💾</div>
                  <div className="zc-feat-name">Daily Backups</div>
                  <div className="zc-feat-desc">30-day retention with one-click restore.</div>
                </div>
                <div className="zc-feat">
                  <div className="zc-feat-icon">🔄</div>
                  <div className="zc-feat-name">Managed Updates</div>
                  <div className="zc-feat-desc">Core, themes, and plugins updated for you.</div>
                </div>
                <div className="zc-feat">
                  <div className="zc-feat-icon">🔍</div>
                  <div className="zc-feat-name">Malware Scanning</div>
                  <div className="zc-feat-desc">Daily scanning with real-time threat detection.</div>
                </div>
                <div className="zc-feat">
                  <div className="zc-feat-icon">📊</div>
                  <div className="zc-feat-name">Uptime Monitoring</div>
                  <div className="zc-feat-desc">24/7 monitoring with instant alerts.</div>
                </div>
              </div>

              {/* Right — Text */}
              <div>
                <div className="zc-tag">Always On</div>
                <h2 className="zc-title zc-title--md">Protected while<br />you sleep</h2>
                <p className="zc-desc zc-desc--left">Enterprise firewall, automated malware scanning, daily backups, free SSL, and managed updates — all included, all automatic. Your site is monitored and protected around the clock. You never have to think about it.</p>

                <div className="zc-status">
                  <div className="plat-badge-dot"></div>
                  <span>All systems operational</span>
                </div>
              </div>

            </div>
          </div>
        </section>

      </div>{/* /zone-c */}

      {/* ═══ SECTION 9 — FAQ ═══ */}
      <section id="section-booking" data-pattern="envosta/booking" className="faq-section">
        <div className="c">
          <div className="rv" style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto' }}>
            <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 400, letterSpacing: '-1px', lineHeight: 1.1, color: 'var(--t1)', marginBottom: '16px' }}>Frequently asked questions</h2>
            <p style={{ fontSize: '.95rem', color: 'var(--t2)', lineHeight: 1.75, fontWeight: 300 }}>Everything business owners ask before getting started.</p>
          </div>

          <FaqAccordion />
        </div>
      </section>

      {/* ═══ SECTION 10 — CLOSING CTA ═══ */}
      <section className="rv" style={{ padding: '100px 0' }}>
        <div className="c">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
            <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 400, letterSpacing: '-1px', lineHeight: 1.1, color: 'var(--t1)', marginBottom: '20px' }}>Ready for a website<br />that just works?</h2>
            <p style={{ fontSize: '1rem', color: 'var(--t2)', lineHeight: 1.8, fontWeight: 300, maxWidth: '480px', margin: '0 auto 36px' }}>Book your onboarding call. We&apos;ll learn your business, build your site, and hand you something you&apos;re proud of.</p>
            <div className="block-button">
              <Link href="/get-started" className="bp lg">Get Started</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
