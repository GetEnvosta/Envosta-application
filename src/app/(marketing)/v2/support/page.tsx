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
