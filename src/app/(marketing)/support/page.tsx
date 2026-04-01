'use client';

import { useEffect } from 'react';
import { ContactForm } from '@/components/marketing/contact-form';

export default function SupportPage() {
  useEffect(() => {
    // Scroll-reveal observer
    document.querySelectorAll('.rv').forEach((el) => {
      new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) entries[0].target.classList.add('v');
        },
        { threshold: 0.05 }
      ).observe(el);
    });
  }, []);

  return (
    <>
      <style>{`
        /* ── Section headers ── */
        .sh{text-align:left;margin-bottom:56px}
        .sh-tag{display:inline-block;font-size:.72rem;font-weight:500;text-transform:uppercase;letter-spacing:3px;color:var(--gold);margin-bottom:10px}
        .sh h2{font-family:'Inter',sans-serif;font-size:clamp(2rem,4vw,3.2rem);font-weight:500;letter-spacing:-1px;line-height:1.1;color:var(--t1)}
        .sh-desc{font-size:.95rem;color:var(--t2);line-height:1.75;font-weight:300;margin-top:16px;max-width:560px}

        /* ── Scroll reveal ── */
        .rv{opacity:0;transform:translateY(20px);transition:opacity .6s,transform .6s}.rv.v{opacity:1;transform:none}

        /* ═══ HERO ═══ */
        .hero{padding:160px 0 120px;position:relative;overflow:hidden;min-height:50vh;display:flex;align-items:center}
        .hero-overlay{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 30%,rgba(37,99,235,.15),transparent 65%);z-index:0}
        .hero .c{position:relative;z-index:2;text-align:center}
        .hero-text{max-width:720px;margin:0 auto}
        .hero-text h1{font-family:'Inter',sans-serif;font-size:clamp(2.4rem,5vw,3.8rem);font-weight:600;line-height:1.08;letter-spacing:-2px;margin-bottom:28px;background:linear-gradient(180deg,#fff 30%,rgba(255,255,255,.7));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .hero-text h1 em{font-style:normal;-webkit-text-fill-color:#fff;color:#fff;font-weight:500}
        .hero-text p{font-size:1.05rem;color:var(--t2);max-width:520px;margin-left:auto;margin-right:auto;line-height:1.8;font-weight:300}

        /* ═══ ZONE A ═══ */
        .zone-a{background:#050a14;border-radius:48px 48px 0 0;margin-top:-48px;position:relative;z-index:2;border-top:1px solid var(--bdr);padding:100px 0 80px;overflow:hidden}
        .zone-a::before{content:'';position:absolute;top:-30%;left:-20%;width:80%;height:90%;background:radial-gradient(ellipse,rgba(37,99,235,.08),transparent 55%);pointer-events:none;z-index:0}
        .zone-a::after{content:'';position:absolute;bottom:-20%;right:-15%;width:70%;height:80%;background:radial-gradient(ellipse,rgba(37,99,235,.06),transparent 55%);pointer-events:none;z-index:0}
        .zone-a .c{position:relative;z-index:1}

        /* ── Contact Cards ── */
        .contact-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
        .contact-card{background:var(--card);border:1px solid var(--bdr);border-radius:24px;padding:40px 32px;text-align:center;transition:all .3s}
        .contact-card:hover{border-color:var(--bdr2);transform:translateY(-3px)}
        .contact-card.featured{border-color:rgba(37,99,235,.15);background:linear-gradient(180deg,rgba(37,99,235,.06),var(--card) 50%)}
        .contact-icon{width:56px;height:56px;border-radius:14px;background:rgba(37,99,235,.1);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;color:var(--gold)}
        .contact-icon svg{width:24px;height:24px}
        .contact-card h3{font-size:1.05rem;font-weight:500;margin-bottom:8px;color:var(--t1)}
        .contact-card p{font-size:.84rem;color:var(--t3);line-height:1.7;font-weight:300;margin-bottom:20px}
        .contact-card .response{font-size:.72rem;color:var(--gold);font-weight:500;margin-bottom:20px;display:block}
        .contact-card .bp{width:100%;justify-content:center;padding:14px 24px;font-size:.88rem}

        /* ═══ ZONE B ═══ */
        .zone-b{background:#020510;border-radius:48px 48px 0 0;margin-top:-24px;position:relative;z-index:3;border-top:1px solid rgba(37,99,235,.1);overflow:hidden;padding:100px 0 0}
        .zone-b .c{position:relative;z-index:2}

        /* ── Studio Plan ── */
        .studio{padding:0 0 100px}
        .studio-card{background:linear-gradient(180deg,rgba(201,164,92,.04),rgba(255,255,255,.01));border:1px solid rgba(201,164,92,.15);border-radius:24px;padding:64px 56px;position:relative;overflow:hidden;display:grid;grid-template-columns:1.2fr 1fr;gap:56px;align-items:center}
        .studio-card::before{content:'';position:absolute;top:-40%;right:-20%;width:500px;height:500px;background:radial-gradient(circle,rgba(201,164,92,.08),transparent 60%);pointer-events:none}
        .studio-card::after{content:'';position:absolute;bottom:-30%;left:-10%;width:400px;height:400px;background:radial-gradient(circle,rgba(37,99,235,.06),transparent 60%);pointer-events:none}
        .studio-left{position:relative;z-index:1}
        .studio-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(201,164,92,.1);border:1px solid rgba(201,164,92,.2);border-radius:100px;padding:6px 16px;font-size:.68rem;font-weight:600;color:#c9a45c;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:24px}
        .studio-badge-dot{width:6px;height:6px;border-radius:50%;background:#c9a45c;animation:sbpulse 2s ease-in-out infinite}
        @keyframes sbpulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(201,164,92,.4)}50%{opacity:.7;box-shadow:0 0 0 6px rgba(201,164,92,0)}}
        .studio-left h3{font-family:'Inter',sans-serif;font-size:clamp(1.6rem,3vw,2.4rem);font-weight:500;letter-spacing:-.5px;line-height:1.15;margin-bottom:16px;color:var(--t1)}
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

        /* ── Form ── */
        .form-section{padding:0 0 100px}
        .form-wrap{max-width:640px;margin:0 auto;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);border-radius:24px;padding:48px 40px}
        .form-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
        .form-group{display:flex;flex-direction:column;gap:6px}
        .form-group.full{grid-column:1/-1}
        .form-group label{font-size:.76rem;font-weight:500;color:var(--t2)}
        .form-group input,.form-group select,.form-group textarea{background:var(--bg);border:1px solid var(--bdr2);border-radius:10px;padding:12px 16px;color:var(--t1);font-size:.88rem;font-family:inherit;outline:none;transition:border-color .3s}
        .form-group input:focus,.form-group select:focus,.form-group textarea:focus{border-color:var(--gold)}
        .form-group select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236a7a94' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 16px center}
        .form-group select option{background:#0b1220;color:var(--t1)}
        .form-group textarea{resize:vertical;min-height:120px}
        .form-submit{text-align:center;margin-top:24px}
        .form-submit .bp{padding:14px 48px;font-size:.92rem}

        /* ── FAQ ── */
        .faq-section{padding:100px 0}
        .faq-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:48px}
        .faq-item{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);border-radius:16px;overflow:hidden;transition:all .3s}
        .faq-item:hover{border-color:rgba(255,255,255,.1)}
        .faq-item:nth-child(1){background:linear-gradient(135deg,rgba(52,211,153,.03),rgba(255,255,255,.015))}
        .faq-item:nth-child(2){background:linear-gradient(135deg,rgba(99,179,237,.03),rgba(255,255,255,.015))}
        .faq-item:nth-child(3){background:linear-gradient(135deg,rgba(212,173,90,.03),rgba(255,255,255,.015))}
        .faq-item:nth-child(4){background:linear-gradient(135deg,rgba(159,122,234,.03),rgba(255,255,255,.015))}
        .faq-item:nth-child(5){background:linear-gradient(135deg,rgba(127,84,179,.03),rgba(255,255,255,.015))}
        .faq-item:nth-child(6){background:linear-gradient(135deg,rgba(56,178,172,.03),rgba(255,255,255,.015))}
        .faq-q{padding:22px 28px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:16px;-webkit-user-select:none;user-select:none}
        .faq-q h4{font-size:.92rem;font-weight:500;color:var(--t1);line-height:1.4;margin:0}
        .faq-q-icon{width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .3s;font-size:.7rem;color:var(--t3)}
        .faq-item.open .faq-q-icon{background:rgba(212,173,90,.12);border-color:rgba(212,173,90,.2);color:var(--gold);transform:rotate(45deg)}
        .faq-a{max-height:0;overflow:hidden;transition:max-height .4s ease,padding .3s}
        .faq-item.open .faq-a{max-height:200px;padding:0 28px 22px}
        .faq-a p{font-size:.82rem;color:var(--t3);line-height:1.7;font-weight:300}

        /* ── Social Proof ── */
        .social-proof{padding:80px 0;text-align:center}
        .sp-stats{display:flex;align-items:center;justify-content:center;gap:40px;margin-bottom:64px}
        .sp-stat strong{display:block;font-family:'Inter',sans-serif;font-size:clamp(1.8rem,3vw,2.6rem);font-weight:600;color:#fff;margin-bottom:4px;background:linear-gradient(180deg,#fff 30%,rgba(255,255,255,.7));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .sp-stat span{font-size:.8rem;color:rgba(255,255,255,.45);font-weight:300}
        .sp-divider{width:1px;height:48px;background:var(--bdr2)}
        .sp-testimonials{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
        .sp-card{background:#0f1a2e;border:1px solid #1e2f4a;border-radius:20px;padding:32px 28px;text-align:left;display:flex;flex-direction:column}
        .sp-stars{color:#f59e0b;font-size:.85rem;letter-spacing:2px;margin-bottom:16px}
        .sp-card p{font-size:.85rem;color:var(--t2);line-height:1.7;font-weight:300;flex:1;margin-bottom:24px}
        .sp-author{display:flex;align-items:center;gap:12px}
        .sp-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,rgba(37,99,235,.2),rgba(37,99,235,.08));display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:600;color:var(--gold);flex-shrink:0}
        .sp-name{font-size:.8rem;font-weight:500;color:var(--t1)}
        .sp-role{font-size:.7rem;color:var(--t3);margin-top:2px}

        /* ── Responsive ── */
        @media(max-width:1024px){.contact-grid{grid-template-columns:1fr 1fr}.faq-grid{grid-template-columns:1fr 1fr}.studio-card{grid-template-columns:1fr;gap:40px}}
        @media(max-width:768px){.contact-grid,.faq-grid,.sp-testimonials{grid-template-columns:1fr}.form-row{grid-template-columns:1fr}.hero{padding:140px 0 60px}.zone-a,.zone-b{border-radius:32px 32px 0 0}.studio-card{padding:40px 28px}.sp-stats{flex-wrap:wrap;gap:24px}.sp-divider{display:none}}
      `}</style>

      {/* ═══ HERO ═══ */}
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="c">
          <div className="hero-text">
            <h1>We&apos;re here to <em>help</em></h1>
            <p>Reach out to our team, browse common questions, or explore support resources. Whatever you need, we&apos;ve got you covered.</p>
          </div>
        </div>
      </section>

      {/* ═══ ZONE A ═══ */}
      <div className="zone-a">

        {/* Contact Options */}
        <section className="rv"><div className="c">
          <div className="sh">
            <div className="sh-tag">Get in Touch</div>
            <h2>Contact our team</h2>
            <p className="sh-desc">Choose the channel that works best for you. Our WordPress experts are standing by and ready to help.</p>
          </div>
          <div className="contact-grid">
            <div className="contact-card rv">
              <div className="contact-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg></div>
              <h3>Email Support</h3>
              <p>Send us a detailed message and our team will get back to you with a thorough response.</p>
              <span className="response">Response within 24 hours</span>
              <a href="#contact-form" className="bp ghost">Send a Message</a>
            </div>
            <div className="contact-card featured rv">
              <div className="contact-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg></div>
              <h3>Live Chat</h3>
              <p>Chat with a WordPress expert in real time. Available during business hours for instant help.</p>
              <span className="response">Coming Soon</span>
              <a href="#" className="bp ghost" style={{ pointerEvents: 'none', opacity: 0.5 }}>Coming Soon</a>
            </div>
            <div className="contact-card rv">
              <div className="contact-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg></div>
              <h3>Schedule a Call</h3>
              <p>Book a one-on-one video call with a member of our support team at a time that works for you.</p>
              <span className="response">Next available: today</span>
              <a href="#" className="bp ghost">Book a Call</a>
            </div>
          </div>
        </div></section>

      </div>{/* /zone-a */}

      {/* ═══ ZONE B ═══ */}
      <div className="zone-b">

        {/* Contact Form */}
        <section id="contact-form" className="form-section rv" style={{ padding: '0 0 100px' }}><div className="c">
          <div className="sh" style={{ textAlign: 'center' }}>
            <div className="sh-tag">Send a Message</div>
            <h2>Get in touch</h2>
            <p className="sh-desc" style={{ marginLeft: 'auto', marginRight: 'auto' }}>Fill out the form below and a member of our team will respond within one business day.</p>
          </div>
          <div className="form-wrap">
            <ContactForm
              type="support"
              subject="Support Request"
              buttonText="Send Message"
              successMessage="Message received! We'll get back to you within one business day."
            />
          </div>
        </div></section>

        {/* Social Proof */}
        <section className="social-proof"><div className="c">
          <div className="sp-stats rv">
            <div className="sp-stat">
              <strong>500+</strong>
              <span>Websites launched</span>
            </div>
            <div className="sp-divider"></div>
            <div className="sp-stat">
              <strong>99.99%</strong>
              <span>Uptime guarantee</span>
            </div>
            <div className="sp-divider"></div>
            <div className="sp-stat">
              <strong>4.9/5</strong>
              <span>Client satisfaction</span>
            </div>
            <div className="sp-divider"></div>
            <div className="sp-stat">
              <strong>&lt;24hr</strong>
              <span>Support response</span>
            </div>
          </div>

          <div className="sp-testimonials rv">
            <div className="sp-card">
              <div className="sp-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
              <p>&ldquo;Envosta handled everything &mdash; the design, the migration, even our WooCommerce setup. We were live in under a week. Best decision we&apos;ve made for our business online.&rdquo;</p>
              <div className="sp-author">
                <div className="sp-avatar">JM</div>
                <div><div className="sp-name">Jordan Mitchell</div><div className="sp-role">Owner, Mitchell Landscaping</div></div>
              </div>
            </div>
            <div className="sp-card">
              <div className="sp-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
              <p>&ldquo;Our old site was slow and broken. Envosta rebuilt it from scratch, migrated everything, and now it loads in under a second. Our leads have doubled since the switch.&rdquo;</p>
              <div className="sp-author">
                <div className="sp-avatar">SR</div>
                <div><div className="sp-name">Sarah Reynolds</div><div className="sp-role">Founder, Bloom &amp; Co Salon</div></div>
              </div>
            </div>
            <div className="sp-card">
              <div className="sp-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
              <p>&ldquo;The onboarding call alone was worth it. They set up our SEO, security, backups &mdash; things I didn&apos;t even know I needed. It&apos;s like having a dev team on retainer for a fraction of the cost.&rdquo;</p>
              <div className="sp-author">
                <div className="sp-avatar">DK</div>
                <div><div className="sp-name">David Kim</div><div className="sp-role">CEO, Apex Consulting Group</div></div>
              </div>
            </div>
          </div>
        </div></section>

        {/* Studio Plan */}
        <section className="studio rv"><div className="c">
          <div className="sh">
            <div className="sh-tag">Envosta Studio</div>
            <h2>Need a team, not just a host?</h2>
            <p className="sh-desc">For businesses that want dedicated WordPress experts handling design, development, and ongoing optimization alongside their hosting.</p>
          </div>
          <div className="studio-card">
            <div className="studio-left">
              <div className="studio-badge"><div className="studio-badge-dot"></div>Waitlist Full</div>
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
                  <div className="studio-feat-text"><h4>Proactive Monitoring</h4><p>We catch problems before you do. Uptime, performance, and security &mdash; watched 24/7.</p></div>
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

        {/* FAQ */}
        <section className="faq-section"><div className="c">
          <div className="sh rv">
            <h2>Answers to the questions we hear most</h2>
            <p className="sh-desc">Everything you need to know about getting help at Envosta.</p>
          </div>

          <div className="faq-grid rv">
            <div className="faq-item open">
              <div className="faq-q" onClick={(e) => (e.currentTarget.parentElement as HTMLElement).classList.toggle('open')}><h4>What are your support hours?</h4><div className="faq-q-icon">+</div></div>
              <div className="faq-a"><p>Our email support is monitored around the clock, and we respond to all inquiries within 24 hours. Phone and video call support are available Monday through Friday, 9am to 6pm EST.</p></div>
            </div>
            <div className="faq-item">
              <div className="faq-q" onClick={(e) => (e.currentTarget.parentElement as HTMLElement).classList.toggle('open')}><h4>How do I migrate my site to Envosta?</h4><div className="faq-q-icon">+</div></div>
              <div className="faq-a"><p>We handle migrations for you at no extra cost. Simply submit a migration request through your dashboard and our team will move your site with zero downtime.</p></div>
            </div>
            <div className="faq-item">
              <div className="faq-q" onClick={(e) => (e.currentTarget.parentElement as HTMLElement).classList.toggle('open')}><h4>Can I upgrade my plan at any time?</h4><div className="faq-q-icon">+</div></div>
              <div className="faq-a"><p>Yes, you can upgrade your hosting plan at any time from your account dashboard. Changes take effect immediately and are prorated for the remainder of your billing cycle.</p></div>
            </div>
            <div className="faq-item">
              <div className="faq-q" onClick={(e) => (e.currentTarget.parentElement as HTMLElement).classList.toggle('open')}><h4>Do you offer emergency support?</h4><div className="faq-q-icon">+</div></div>
              <div className="faq-a"><p>We treat security incidents and complete site outages as top priority regardless of plan. Studio clients have access to same-day escalation for all critical issues.</p></div>
            </div>
            <div className="faq-item">
              <div className="faq-q" onClick={(e) => (e.currentTarget.parentElement as HTMLElement).classList.toggle('open')}><h4>What&apos;s included in onboarding?</h4><div className="faq-q-icon">+</div></div>
              <div className="faq-a"><p>Every new account includes a guided onboarding consultation where we review your site, configure performance settings, and ensure everything is optimized from day one.</p></div>
            </div>
            <div className="faq-item">
              <div className="faq-q" onClick={(e) => (e.currentTarget.parentElement as HTMLElement).classList.toggle('open')}><h4>How do backups work?</h4><div className="faq-q-icon">+</div></div>
              <div className="faq-a"><p>We take automatic daily backups of your entire site, including files and database. You can also create manual backups and restore any backup with a single click from your dashboard.</p></div>
            </div>
          </div>

        </div></section>

      </div>{/* /zone-b */}
    </>
  );
}
