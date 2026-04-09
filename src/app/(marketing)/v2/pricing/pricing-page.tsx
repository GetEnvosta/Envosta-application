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
      <section className="pricing-faq">
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
