'use client';

import { useEffect } from 'react';
import { ContactForm } from '@/components/marketing/contact-form';

export default function StudioPage() {
  useEffect(() => {
    // Scroll reveal
    const els = document.querySelectorAll('.rv');
    els.forEach((el) => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            entries[0].target.classList.add('v');
          }
        },
        { threshold: 0.05 }
      );
      observer.observe(el);
    });

    // FAQ toggle
    const faqQuestions = document.querySelectorAll('.studio-faq-q');
    faqQuestions.forEach((q) => {
      q.addEventListener('click', () => {
        q.parentElement?.classList.toggle('open');
      });
    });

    return () => {
      els.forEach((el) => {
        // cleanup observers not strictly needed but good practice
      });
    };
  }, []);

  return (
    <>
      {/* ═══ STUDIO HERO ═══ */}
      <section className="vip-hero">
        <div className="c">

          <div className="vip-badge rv">
            <svg className="vip-badge-diamond" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="12 2 22 8.5 18 22 6 22 2 8.5" />
              <polyline points="2 8.5 12 13 22 8.5" />
              <line x1="12" y1="13" x2="12" y2="22" />
            </svg>
            Studio
          </div>

          <h1 className="rv">Website management for<br /><em>those who expect more</em></h1>
          <p className="rv">A dedicated team, priority infrastructure, and hands-on management — so you can focus on growing your business while we handle everything behind the scenes.</p>

          <div className="hero-btns rv">
            <a href="#studio-waitlist" className="bp vip lg" onClick={(e) => { e.preventDefault(); document.getElementById('studio-waitlist')?.scrollIntoView({ behavior: 'smooth' }); }}>Schedule a Studio Consultation</a>
          </div>

          <div className="vip-trust rv">
            <div className="vip-trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Enterprise-grade security
            </div>
            <div className="vip-trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Sub-15 min response time
            </div>
            <div className="vip-trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Dedicated account team
            </div>
            <div className="vip-trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              99.99% uptime SLA
            </div>
          </div>

        </div>
      </section>

      {/* ═══ WHAT MAKES STUDIO DIFFERENT ═══ */}
      <section className="vip-diff rv">
        <div className="c">

          <div className="vip-diff-header">
            <div className="sh-tag">Studio Advantages</div>
            <h2>Everything our best plans include —<br />and then some</h2>
            <p>Studio goes beyond infrastructure. It&apos;s a fully managed partnership where our senior team becomes an extension of yours.</p>
          </div>

          <div className="vip-diff-grid">

            <div className="vip-diff-card">
              <div className="vip-diff-icon gold">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h4>Dedicated Account Manager</h4>
              <p>A named point of contact who knows your site, your goals, and your business inside and out. No ticket queues — just direct access.</p>
            </div>

            <div className="vip-diff-card">
              <div className="vip-diff-icon blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h4>Priority Response SLA</h4>
              <p>Critical issues get a response within 15 minutes. Non-critical requests within 1 hour. Your site is always our top priority.</p>
            </div>

            <div className="vip-diff-card">
              <div className="vip-diff-icon green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h4>Proactive Monitoring</h4>
              <p>We don&apos;t wait for problems — we catch them before they happen. Continuous performance audits, security scans, and uptime checks every 30 seconds.</p>
            </div>

            <div className="vip-diff-card">
              <div className="vip-diff-icon purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <h4>Staging &amp; Deployment</h4>
              <p>One-click staging environments with visual diff. Push changes live with confidence — rollback instantly if anything looks off.</p>
            </div>

            <div className="vip-diff-card">
              <div className="vip-diff-icon teal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <h4>Performance Optimization</h4>
              <p>Quarterly deep-dive audits on Core Web Vitals, database performance, and caching strategy. We tune your site like a precision instrument.</p>
            </div>

            <div className="vip-diff-card">
              <div className="vip-diff-icon red">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
              </div>
              <h4>Plugin &amp; Core Updates</h4>
              <p>We handle every WordPress core, plugin, and theme update. Each one is tested on staging first, then deployed with zero downtime.</p>
            </div>

          </div>

        </div>
      </section>

      {/* ═══ CONCIERGE EXPERIENCE — MEGA FEATURES ═══ */}
      <section className="vip-mega rv">
        <div className="c">

          {/* Mega 1: Concierge Support */}
          <div className="mega-feat vip-accent">
            <div className="mega-inner">
              <div className="mega-text">
                <div className="sh-tag">Concierge Support</div>
                <h3>Your dedicated team,<br />always a message away</h3>
                <p>Studio clients get a named account manager and a senior WordPress engineer assigned to their account. Reach them directly via Slack, email, or phone — no generic ticket system.</p>
                <div className="mega-tags">
                  <span>Direct Slack channel</span>
                  <span>Phone support</span>
                  <span>Scheduled check-ins</span>
                  <span>Priority escalation</span>
                </div>
              </div>
              <div className="concierge-vis">
                <div className="cc-header">
                  <div className="cc-avatar">JS</div>
                  <div>
                    <div className="cc-name">James Sullivan</div>
                    <div className="cc-role">Your Studio Account Manager</div>
                  </div>
                  <div className="cc-status"><div className="cc-dot"></div> Online</div>
                </div>
                <div className="cc-msgs">
                  <div className="cc-msg them">Hey! I noticed your traffic spike this morning — already scaled your resources up ahead of peak hours.</div>
                  <div className="cc-msg me">That&apos;s amazing, thank you! We have a product launch tomorrow too.</div>
                  <div className="cc-msg them">Already on it. I&apos;ve pre-provisioned extra capacity and set up real-time monitoring for the launch window. You&apos;re all set.</div>
                  <div className="cc-msg me">This is why we love Envosta Studio.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Mega 2: Onboarding Timeline */}
          <div className="mega-feat">
            <div className="mega-inner">
              <div className="timeline-vis">
                <div className="tl-item">
                  <div className="tl-line"><div className="tl-dot active"></div><div className="tl-connector"></div></div>
                  <div className="tl-content">
                    <h5>Discovery Call</h5>
                    <p>We learn about your business, goals, traffic patterns, and technical requirements.</p>
                    <span className="tl-time">Day 1</span>
                  </div>
                </div>
                <div className="tl-item">
                  <div className="tl-line"><div className="tl-dot active"></div><div className="tl-connector"></div></div>
                  <div className="tl-content">
                    <h5>Architecture &amp; Migration</h5>
                    <p>We design your infrastructure, migrate your site, and configure staging environments.</p>
                    <span className="tl-time">Day 2–3</span>
                  </div>
                </div>
                <div className="tl-item">
                  <div className="tl-line"><div className="tl-dot active"></div><div className="tl-connector"></div></div>
                  <div className="tl-content">
                    <h5>Performance Tuning</h5>
                    <p>Caching, CDN, database optimization, and Core Web Vitals audit.</p>
                    <span className="tl-time">Day 4–5</span>
                  </div>
                </div>
                <div className="tl-item">
                  <div className="tl-line"><div className="tl-dot active"></div><div className="tl-connector"></div></div>
                  <div className="tl-content">
                    <h5>Security Hardening</h5>
                    <p>WAF configuration, malware scanning, SSL, and two-factor authentication setup.</p>
                    <span className="tl-time">Day 5–6</span>
                  </div>
                </div>
                <div className="tl-item">
                  <div className="tl-line"><div className="tl-dot"></div></div>
                  <div className="tl-content">
                    <h5>Go Live &amp; Ongoing Management</h5>
                    <p>DNS cutover, uptime monitoring, and your dedicated team takes over day-to-day operations.</p>
                    <span className="tl-time">Day 7</span>
                  </div>
                </div>
              </div>
              <div className="mega-text">
                <div className="sh-tag">Studio Onboarding</div>
                <h3>From zero to fully managed<br />in seven days</h3>
                <p>Our Studio onboarding is thorough and hands-on. We don&apos;t just set up hosting — we architect your entire WordPress environment for performance, security, and scale.</p>
                <div className="mega-tags">
                  <span>Zero-downtime migration</span>
                  <span>Custom architecture</span>
                  <span>Full security audit</span>
                  <span>Performance baseline</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ═══ COMPARISON TABLE ═══ */}
      <section className="vip-compare rv">
        <div className="c">

          <div className="vip-compare-header">
            <h2>Studio vs. standard plans</h2>
            <p>See exactly what&apos;s included at the Studio level that goes beyond our already-comprehensive hosting plans.</p>
          </div>

          <table className="compare-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Standard Plans</th>
                <th className="vip-col">Studio</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Personal consultation &amp; onboarding</td>
                <td className="check">{'\u2713'}</td>
                <td className="vip-col check-vip">{'\u2713'}</td>
              </tr>
              <tr>
                <td>Managed WordPress hosting</td>
                <td className="check">{'\u2713'}</td>
                <td className="vip-col check-vip">{'\u2713'}</td>
              </tr>
              <tr>
                <td>Staging environment</td>
                <td className="check">{'\u2713'}</td>
                <td className="vip-col check-vip">{'\u2713'}</td>
              </tr>
              <tr>
                <td>Ongoing website design &amp; updates</td>
                <td className="dash">—</td>
                <td className="vip-col check-vip">{'\u2713'}</td>
              </tr>
              <tr>
                <td>Full SEO structure baked in</td>
                <td className="dash">—</td>
                <td className="vip-col check-vip">{'\u2713'}</td>
              </tr>
              <tr>
                <td>Functionality &amp; feature management</td>
                <td className="dash">—</td>
                <td className="vip-col check-vip">{'\u2713'}</td>
              </tr>
              <tr>
                <td>Dedicated account manager</td>
                <td className="dash">—</td>
                <td className="vip-col check-vip">{'\u2713'}</td>
              </tr>
              <tr>
                <td>Priority response SLA (15 min)</td>
                <td className="dash">—</td>
                <td className="vip-col check-vip">{'\u2713'}</td>
              </tr>
              <tr>
                <td>Direct Slack &amp; phone access</td>
                <td className="dash">—</td>
                <td className="vip-col check-vip">{'\u2713'}</td>
              </tr>
              <tr>
                <td>Proactive performance audits</td>
                <td>Annual</td>
                <td className="vip-col">Quarterly</td>
              </tr>
              <tr>
                <td>Uptime SLA</td>
                <td>99.99%</td>
                <td className="vip-col">99.99%</td>
              </tr>
              <tr>
                <td>Daily backups</td>
                <td className="check">{'\u2713'}</td>
                <td className="vip-col">Hourly</td>
              </tr>
              <tr>
                <td>Plugin &amp; core update management</td>
                <td className="dash">—</td>
                <td className="vip-col check-vip">{'\u2713'}</td>
              </tr>
              <tr>
                <td>Custom infrastructure architecture</td>
                <td className="dash">—</td>
                <td className="vip-col check-vip">{'\u2713'}</td>
              </tr>
              <tr>
                <td>Multisite &amp; network support</td>
                <td>Basic</td>
                <td className="vip-col">Full</td>
              </tr>
            </tbody>
          </table>

        </div>
      </section>

      {/* ═══ METRICS ═══ */}
      <section className="vip-metrics rv">
        <div className="c">

          <div className="plat-metrics">
            <div className="plat-m">
              <strong>99.99%</strong>
              <span>Uptime guarantee</span>
              <div className="plat-m-sub">Enterprise-grade SLA backed by real infrastructure</div>
            </div>
            <div className="plat-m">
              <strong>&lt; 15min</strong>
              <span>Critical response time</span>
              <div className="plat-m-sub">Fastest SLA in managed WordPress hosting</div>
            </div>
            <div className="plat-m">
              <strong>24/7/365</strong>
              <span>Proactive monitoring</span>
              <div className="plat-m-sub">30-second intervals with instant alerting</div>
            </div>
            <div className="plat-m">
              <strong>7 days</strong>
              <span>Full onboarding</span>
              <div className="plat-m-sub">From discovery call to fully optimized and live</div>
            </div>
          </div>

        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section className="vip-testimonials rv">
        <div className="c">

          <div className="vip-test-header">
            <h2>Trusted by teams who can&apos;t afford downtime</h2>
            <p>Our Studio clients rely on Envosta for mission-critical WordPress sites that drive real revenue.</p>
          </div>

          <div className="test-grid">
            <div className="test-card">
              <div className="test-stars">{'\u2605'} {'\u2605'} {'\u2605'} {'\u2605'} {'\u2605'}</div>
              <p className="test-quote">&ldquo;Switching to Envosta Studio was the best infrastructure decision we&apos;ve made. Our account manager caught a performance issue before our biggest sale of the year — saved us thousands.&rdquo;</p>
              <div className="test-author">
                <div className="test-avatar">MR</div>
                <div>
                  <div className="test-name">Michael Reynolds</div>
                  <div className="test-role">CTO, Apex Commerce</div>
                </div>
              </div>
            </div>

            <div className="test-card">
              <div className="test-stars">{'\u2605'} {'\u2605'} {'\u2605'} {'\u2605'} {'\u2605'}</div>
              <p className="test-quote">&ldquo;The direct Slack access alone is worth it. We message our team at Envosta and things just get done. No tickets, no waiting, no friction.&rdquo;</p>
              <div className="test-author">
                <div className="test-avatar">SL</div>
                <div>
                  <div className="test-name">Sarah Lin</div>
                  <div className="test-role">Head of Digital, Meridian Group</div>
                </div>
              </div>
            </div>

            <div className="test-card">
              <div className="test-stars">{'\u2605'} {'\u2605'} {'\u2605'} {'\u2605'} {'\u2605'}</div>
              <p className="test-quote">&ldquo;We migrated 12 sites to Envosta Studio. Zero downtime during migration, 40% faster page loads after their optimization, and we haven&apos;t thought about hosting since.&rdquo;</p>
              <div className="test-author">
                <div className="test-avatar">DK</div>
                <div>
                  <div className="test-name">David Kim</div>
                  <div className="test-role">VP Engineering, Halo Studios</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="studio-faq rv">
        <div className="c">

          <div className="studio-faq-header">
            <h2>Studio frequently asked questions</h2>
            <p>Everything you need to know about our Studio tier.</p>
          </div>

          <div className="studio-faq-list">

            <div className="studio-faq-item">
              <div className="studio-faq-q">
                <h4>How is Studio different from standard plans?</h4>
                <svg className="studio-faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <div className="studio-faq-a"><p>Studio includes everything in our standard plans plus a dedicated account manager, direct Slack and phone access, 15-minute critical response SLA, proactive quarterly audits, managed plugin and core updates, custom infrastructure architecture, and hourly backups. It&apos;s a fully managed partnership, not just hosting.</p></div>
            </div>

            <div className="studio-faq-item">
              <div className="studio-faq-q">
                <h4>How much does Studio cost?</h4>
                <svg className="studio-faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <div className="studio-faq-a"><p>Studio pricing is custom and based on your specific requirements — number of sites, traffic volume, storage needs, and level of management. Schedule a consultation and we&apos;ll put together a tailored proposal.</p></div>
            </div>

            <div className="studio-faq-item">
              <div className="studio-faq-q">
                <h4>Can I upgrade from an existing Envosta plan?</h4>
                <svg className="studio-faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <div className="studio-faq-a"><p>Absolutely. If you&apos;re already on a Growth or Performance plan, your upgrade to Studio is seamless. We&apos;ll assign your account manager, migrate you to Studio infrastructure, and complete a full optimization — all with zero downtime.</p></div>
            </div>

            <div className="studio-faq-item">
              <div className="studio-faq-q">
                <h4>Do you support WooCommerce and multisite?</h4>
                <svg className="studio-faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <div className="studio-faq-a"><p>Yes. Studio is built to handle WooCommerce at scale with optimized database queries, persistent object caching, and PCI-compliant infrastructure. Multisite networks receive full support including subdomain and subdirectory configurations.</p></div>
            </div>

            <div className="studio-faq-item">
              <div className="studio-faq-q">
                <h4>What does the onboarding process look like?</h4>
                <svg className="studio-faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <div className="studio-faq-a"><p>VIP onboarding is a structured 7-day process: discovery call, architecture design, zero-downtime migration, performance tuning, security hardening, and go-live. Your dedicated account manager guides you through every step.</p></div>
            </div>

            <div className="studio-faq-item">
              <div className="studio-faq-q">
                <h4>Is there a minimum contract length?</h4>
                <svg className="studio-faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <div className="studio-faq-a"><p>Studio is available on monthly or annual terms. Annual billing includes a meaningful discount. There&apos;s no long-term lock-in — we earn your business every month.</p></div>
            </div>

          </div>

        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section id="studio-waitlist" className="rv" style={{ padding: '80px 0 100px', scrollMarginTop: 80 }}>
        <div className="c" style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(201,164,92,.08)', border: '1px solid rgba(201,164,92,.2)', borderRadius: 100, padding: '5px 14px', fontSize: '.68rem', fontWeight: 600, color: '#c9a45c', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 16 }}>
              Currently Full
            </div>
            <h2 style={{ fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 400, letterSpacing: '-1px', color: '#fff', marginBottom: 12 }}>Join the Studio waitlist</h2>
            <p style={{ color: 'var(--t2)', fontSize: '.95rem', fontWeight: 300, lineHeight: 1.7 }}>
              Tell us about your project and we&apos;ll reach out when a spot opens up. No commitment — just a conversation.
            </p>
          </div>
          <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(201,164,92,.12)', borderRadius: 20, padding: '32px 28px' }}>
            <ContactForm
              type="sales"
              subject="Studio Waitlist — New Inquiry"
              buttonText="Join Waitlist"
              successMessage="You're on the list! We'll reach out when a spot opens."
            />
          </div>
        </div>
      </section>
    </>
  );
}
