'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const ADDONS = [
  { name: 'SMS Follow-Up', price: 29, desc: 'Automatically text leads after every call with booking links' },
  { name: 'AI Web Chat', price: 39, desc: 'Chat widget that answers questions and captures leads 24/7' },
  { name: 'Appointment Reminders', price: 29, desc: 'AI calls or texts customers to confirm appointments, reducing no-shows' },
  { name: 'Extra Phone Number', price: 19, desc: 'Second AI receptionist line for another location or department' },
  { name: 'WooCommerce Store', price: 49, desc: 'Full online store with product catalog, cart, and checkout' },
  { name: 'WooCommerce Boost', price: 29, desc: 'Faster load times and checkout for high-traffic stores' },
  { name: 'Monthly SEO Content', price: 99, desc: 'AI-generated, human-reviewed blog content to boost Google rankings' },
  { name: 'Google Business Profile', price: 29, desc: 'We keep your listing updated, respond to reviews, and post updates' },
];

const MINUTES = [
  { amount: 200, price: 39 },
  { amount: 500, price: 79 },
  { amount: 1000, price: 129 },
];

const FAQS = [
  { q: 'What if I already have a website?', a: 'We\'ll migrate it to our platform, redesign it, and connect your AI receptionist. No extra charge — it\'s included in the setup fee.' },
  { q: 'How does the AI receptionist work?', a: 'You get a dedicated phone number. When someone calls, our AI answers naturally, captures their information, books appointments on your calendar, and sends you a transcript. It works 24/7 — nights, weekends, holidays.' },
  { q: 'Can I keep my current phone number?', a: 'Yes. We can forward your existing number to your AI receptionist, or you can use the new number we provide alongside your current one.' },
  { q: 'What happens if I use all my minutes?', a: 'Your receptionist keeps working. If you have an auto-refill pack set up, your card is charged automatically. If not, we\'ll notify you and you can add more anytime.' },
  { q: 'Is there a contract?', a: 'No long-term contracts. Month-to-month billing. Cancel anytime — though we think you\'ll stay once you see how many leads you\'re capturing.' },
  { q: 'How long does setup take?', a: 'Most businesses are fully live within 5 business days. That includes your website, AI receptionist configuration, and calendar integration.' },
];

const INCLUDED = [
  { icon: '🌐', title: 'Professional Website', desc: 'Custom-designed, mobile-ready, managed by us' },
  { icon: '📞', title: 'AI Receptionist', desc: 'Answers calls 24/7, books appointments, captures leads' },
  { icon: '⏱️', title: '150 AI Minutes', desc: 'Included every month — enough for most businesses' },
  { icon: '📊', title: 'Call Dashboard', desc: 'Transcripts, lead info, and call analytics in one place' },
  { icon: '📅', title: 'Calendar Integration', desc: 'Bookings sync directly to your calendar' },
  { icon: '🔒', title: 'Fully Managed', desc: 'SSL, hosting, backups, updates — we handle everything' },
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    document.querySelectorAll('.rv').forEach((el) => {
      new IntersectionObserver(
        (entries) => { if (entries[0].isIntersecting) entries[0].target.classList.add('v'); },
        { threshold: 0.05 },
      ).observe(el);
    });
  }, []);

  return (
    <>
      <style>{`
        .rv{opacity:0;transform:translateY(24px);transition:opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1)}.rv.v{opacity:1;transform:none}

        /* ═══ HERO ═══ */
        .pricing-hero{padding:180px 0 120px;position:relative;overflow:hidden;text-align:center}
        .pricing-hero::before{content:'';position:absolute;top:-40%;left:50%;transform:translateX(-50%);width:900px;height:900px;background:radial-gradient(circle,rgba(37,99,235,.12),transparent 60%);pointer-events:none}
        .pricing-hero .c{position:relative;z-index:1;max-width:800px;margin:0 auto;padding:0 24px}
        .pricing-hero h1{font-family:'Inter',sans-serif;font-size:clamp(2.8rem,6vw,4.5rem);font-weight:700;letter-spacing:-2.5px;line-height:1.05;margin-bottom:24px;color:#fff}
        .pricing-hero h1 em{font-style:normal;background:linear-gradient(135deg,#2563EB,#60a5fa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .pricing-hero p{font-size:1.15rem;color:rgba(255,255,255,.5);max-width:540px;margin:0 auto 20px;line-height:1.7;font-weight:300}

        /* Price display */
        .price-display{display:flex;align-items:baseline;justify-content:center;gap:4px;margin-bottom:8px}
        .price-display .dollar{font-size:1.6rem;font-weight:500;color:rgba(255,255,255,.5)}
        .price-display .amount{font-size:4.5rem;font-weight:700;color:#fff;letter-spacing:-2px;line-height:1}
        .price-display .period{font-size:1rem;color:rgba(255,255,255,.35);font-weight:400}
        .setup-note{font-size:.82rem;color:rgba(255,255,255,.3);margin-bottom:32px}

        .cta-primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:#2563EB;color:#fff;font-weight:600;font-size:1rem;padding:16px 40px;border-radius:100px;border:none;cursor:pointer;transition:all .2s;text-decoration:none}
        .cta-primary:hover{background:#1d4ed8;transform:translateY(-1px);box-shadow:0 8px 32px rgba(37,99,235,.3)}
        .cta-secondary{display:inline-flex;align-items:center;gap:6px;color:rgba(255,255,255,.5);font-size:.88rem;font-weight:400;text-decoration:none;margin-top:16px;transition:color .2s}
        .cta-secondary:hover{color:rgba(255,255,255,.8)}

        /* ═══ INCLUDED ═══ */
        .included{padding:100px 0;position:relative}
        .included::before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(37,99,235,.03),transparent 50%);pointer-events:none}
        .included .c{max-width:1100px;margin:0 auto;padding:0 24px;position:relative;z-index:1}
        .included h2{font-family:'Inter',sans-serif;font-size:clamp(1.8rem,3.5vw,2.8rem);font-weight:600;letter-spacing:-1.5px;text-align:center;margin-bottom:16px;color:#fff}
        .included .sub{text-align:center;font-size:.95rem;color:rgba(255,255,255,.4);max-width:480px;margin:0 auto 56px;font-weight:300}
        .included-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
        .inc-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:20px;padding:36px 28px;transition:all .3s}
        .inc-card:hover{border-color:rgba(37,99,235,.2);background:rgba(37,99,235,.04);transform:translateY(-2px)}
        .inc-icon{font-size:1.8rem;margin-bottom:16px}
        .inc-card h3{font-size:1rem;font-weight:600;color:#fff;margin-bottom:6px}
        .inc-card p{font-size:.84rem;color:rgba(255,255,255,.4);line-height:1.6;font-weight:300}

        /* ═══ ADDONS ═══ */
        .addons{padding:100px 0}
        .addons .c{max-width:1100px;margin:0 auto;padding:0 24px}
        .addons h2{font-family:'Inter',sans-serif;font-size:clamp(1.8rem,3.5vw,2.8rem);font-weight:600;letter-spacing:-1.5px;text-align:center;margin-bottom:16px;color:#fff}
        .addons .sub{text-align:center;font-size:.95rem;color:rgba(255,255,255,.4);max-width:480px;margin:0 auto 56px;font-weight:300}
        .addons-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
        .addon-card{display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:24px 28px;transition:all .3s}
        .addon-card:hover{border-color:rgba(37,99,235,.15);background:rgba(37,99,235,.03)}
        .addon-info{flex:1;min-width:0}
        .addon-info h3{font-size:.92rem;font-weight:600;color:#fff;margin-bottom:4px}
        .addon-info p{font-size:.78rem;color:rgba(255,255,255,.35);line-height:1.5;font-weight:300}
        .addon-price{font-size:.88rem;font-weight:600;color:#2563EB;white-space:nowrap;margin-left:20px}

        /* ═══ MINUTES ═══ */
        .minutes{padding:100px 0;position:relative}
        .minutes::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(37,99,235,.06),transparent 60%);pointer-events:none}
        .minutes .c{max-width:900px;margin:0 auto;padding:0 24px;position:relative;z-index:1}
        .minutes h2{font-family:'Inter',sans-serif;font-size:clamp(1.8rem,3.5vw,2.8rem);font-weight:600;letter-spacing:-1.5px;text-align:center;margin-bottom:16px;color:#fff}
        .minutes .sub{text-align:center;font-size:.95rem;color:rgba(255,255,255,.4);max-width:520px;margin:0 auto 20px;font-weight:300}
        .minutes .note{text-align:center;font-size:.82rem;color:rgba(255,255,255,.25);margin-bottom:48px}
        .minutes-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .min-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:20px;padding:32px;text-align:center;transition:all .3s}
        .min-card:hover{border-color:rgba(37,99,235,.2);transform:translateY(-2px)}
        .min-amount{font-size:2.4rem;font-weight:700;color:#fff;letter-spacing:-1px}
        .min-label{font-size:.78rem;color:rgba(255,255,255,.35);margin-bottom:12px;font-weight:300}
        .min-price{font-size:1.1rem;font-weight:600;color:#2563EB}
        .min-per{font-size:.72rem;color:rgba(255,255,255,.3);margin-top:4px}

        /* ═══ DOMAIN ═══ */
        .domain-section{padding:40px 0 80px;text-align:center}
        .domain-section p{font-size:.88rem;color:rgba(255,255,255,.3);font-weight:300}
        .domain-section strong{color:rgba(255,255,255,.5);font-weight:500}

        /* ═══ FAQ ═══ */
        .faq{padding:80px 0 100px}
        .faq .c{max-width:720px;margin:0 auto;padding:0 24px}
        .faq h2{font-family:'Inter',sans-serif;font-size:clamp(1.8rem,3.5vw,2.4rem);font-weight:600;letter-spacing:-1px;text-align:center;margin-bottom:48px;color:#fff}
        .faq-item{border-bottom:1px solid rgba(255,255,255,.06)}
        .faq-q{display:flex;align-items:center;justify-content:space-between;padding:20px 0;cursor:pointer;gap:16px}
        .faq-q h4{font-size:.92rem;font-weight:500;color:rgba(255,255,255,.8);transition:color .2s}
        .faq-q:hover h4{color:#fff}
        .faq-icon{width:24px;height:24px;flex-shrink:0;color:rgba(255,255,255,.3);transition:transform .3s,color .3s;font-size:1.2rem;display:flex;align-items:center;justify-content:center}
        .faq-item.open .faq-icon{transform:rotate(45deg);color:#2563EB}
        .faq-a{max-height:0;overflow:hidden;transition:max-height .4s ease,padding .4s ease}
        .faq-item.open .faq-a{max-height:300px;padding-bottom:20px}
        .faq-a p{font-size:.84rem;color:rgba(255,255,255,.4);line-height:1.7;font-weight:300}

        /* ═══ FINAL CTA ═══ */
        .final-cta{padding:80px 0 120px;text-align:center;position:relative}
        .final-cta::before{content:'';position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:800px;height:400px;background:radial-gradient(ellipse,rgba(37,99,235,.1),transparent 60%);pointer-events:none}
        .final-cta .c{position:relative;z-index:1;max-width:600px;margin:0 auto;padding:0 24px}
        .final-cta h2{font-family:'Inter',sans-serif;font-size:clamp(1.8rem,3.5vw,2.8rem);font-weight:600;letter-spacing:-1.5px;margin-bottom:16px;color:#fff}
        .final-cta p{font-size:.95rem;color:rgba(255,255,255,.4);margin-bottom:32px;font-weight:300}

        @media(max-width:768px){
          .included-grid{grid-template-columns:1fr}
          .addons-grid{grid-template-columns:1fr}
          .minutes-grid{grid-template-columns:1fr}
          .price-display .amount{font-size:3.5rem}
        }
      `}</style>

      {/* ═══ HERO ═══ */}
      <section className="pricing-hero">
        <div className="c rv">
          <h1>Stop missing <em>customers</em></h1>
          <p>AI receptionist, professional website, lead capture, booking — all managed for you. One plan. No tiers. No confusion.</p>
          <div className="price-display">
            <span className="dollar">$</span>
            <span className="amount">129</span>
            <span className="period">/month</span>
          </div>
          <p className="setup-note">Custom website design + AI receptionist setup — $500 one-time</p>
          <a href="/get-started?plan=envosta" className="cta-primary">Get Started</a>
          <br />
          <a href="/support" className="cta-secondary">Book a 10-minute demo &rarr;</a>
        </div>
      </section>

      {/* ═══ INCLUDED ═══ */}
      <section className="included">
        <div className="c">
          <h2 className="rv">Everything included</h2>
          <p className="sub rv">No add-ons required to get started. This is what you get on day one.</p>
          <div className="included-grid">
            {INCLUDED.map((item, i) => (
              <div key={i} className="inc-card rv" style={{ transitionDelay: `${i * 60}ms` }}>
                <div className="inc-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ADDONS ═══ */}
      <section className="addons">
        <div className="c">
          <h2 className="rv">Add what you need as you grow</h2>
          <p className="sub rv">Each add-on increases your monthly subscription. No contracts — add or remove anytime.</p>
          <div className="addons-grid">
            {ADDONS.map((addon, i) => (
              <div key={i} className="addon-card rv" style={{ transitionDelay: `${i * 40}ms` }}>
                <div className="addon-info">
                  <h3>{addon.name}</h3>
                  <p>{addon.desc}</p>
                </div>
                <span className="addon-price">+${addon.price}/mo</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ AI MINUTES ═══ */}
      <section className="minutes">
        <div className="c">
          <h2 className="rv">Your AI receptionist never sleeps</h2>
          <p className="sub rv">150 minutes are included every month. Most small businesses use 100–200. Need more? Add a pack — your card is charged automatically so your receptionist never goes offline.</p>
          <p className="note rv">Set it and forget it. Your AI receptionist stays online no matter how busy things get.</p>
          <div className="minutes-grid">
            {MINUTES.map((pack, i) => (
              <div key={i} className="min-card rv" style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="min-amount">{pack.amount.toLocaleString()}</div>
                <div className="min-label">minutes</div>
                <div className="min-price">${pack.price}</div>
                <div className="min-per">${(pack.price / pack.amount * 100).toFixed(0)}¢ per minute</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ DOMAIN ═══ */}
      <section className="domain-section rv">
        <p><strong>Domain registration — $19.99/year.</strong> Already have one? We&apos;ll connect it for free.</p>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="faq">
        <div className="c">
          <h2 className="rv">Frequently asked questions</h2>
          {FAQS.map((faq, i) => (
            <div key={i} className={`faq-item rv ${openFaq === i ? 'open' : ''}`} style={{ transitionDelay: `${i * 40}ms` }}>
              <div className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <h4>{faq.q}</h4>
                <span className="faq-icon">+</span>
              </div>
              <div className="faq-a">
                <p>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="final-cta">
        <div className="c rv">
          <h2>Ready to stop missing customers?</h2>
          <p>One plan. $129/month. Your AI receptionist + website — live in 5 days.</p>
          <a href="/get-started?plan=envosta" className="cta-primary">Get Started for $129/month</a>
          <br />
          <a href="/support" className="cta-secondary">Or book a free demo &rarr;</a>
        </div>
      </section>
    </>
  );
}
