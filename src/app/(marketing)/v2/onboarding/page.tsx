'use client';

import { useEffect } from 'react';
import Link from 'next/link';

function CheckIcon() {
  return (
    <svg className="ck" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 8.5l3 3 7-7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function OnboardingPage() {
  useEffect(() => {
    // Set page title
    document.title = 'Your Onboarding Journey | Envosta';

    // Set meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', 'No guesswork, no waiting around. From sign-up to launch in days — setup, security, optimization, all handled for you.');

    // Set canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', 'https://envosta.com/onboarding');

    // Scroll reveal
    const revealEls = document.querySelectorAll('.rv');
    const revealObservers: IntersectionObserver[] = [];
    revealEls.forEach((el) => {
      const obs = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            entries[0].target.classList.add('v');
          }
        },
        { threshold: 0.05 }
      );
      obs.observe(el);
      revealObservers.push(obs);
    });

    // Activate timeline steps on scroll
    const steps = document.querySelectorAll('.tl-step');
    const stepObservers: IntersectionObserver[] = [];
    steps.forEach((step) => {
      const obs = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            step.classList.add('active');
          }
        },
        { threshold: 0.2 }
      );
      obs.observe(step);
      stepObservers.push(obs);
    });

    return () => {
      revealObservers.forEach((obs) => obs.disconnect());
      stepObservers.forEach((obs) => obs.disconnect());
    };
  }, []);

  return (
    <>
      {/* ═══ HERO ═══ */}
      <section className="ob-hero">
        <div className="c">
          <h1>Your onboarding <em>timeline</em></h1>
          <p>No guesswork, no waiting around. From the moment you sign up, we handle everything — setup, security, optimization — tailored to the plan you choose. Your site is live and performing in days, not weeks.</p>
        </div>
      </section>

      {/* ═══ TIMELINE ═══ */}
      <section className="timeline rv">
        <div className="c">
          <div className="tl-track">

            {/* Step 1 */}
            <div className="tl-step active">
              <div className="tl-dot">1</div>
              <div className="tl-wire" />
              <div className="tl-card">
                <div className="tl-card-top">
                  <div className="tl-card-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="20" y1="8" x2="20" y2="14" />
                      <line x1="23" y1="11" x2="17" y2="11" />
                    </svg>
                  </div>
                  <div className="tl-card-meta">
                    <h3>Sign Up and Kickoff Call</h3>
                    <span className="tl-time">Day 1</span>
                  </div>
                </div>
                <p>You pick a plan and we schedule a short kickoff call. We&apos;ll talk through your goals, your current site (if you have one), and exactly what you need from your hosting.</p>
                <ul>
                  <li><CheckIcon />Choose your plan (Minimum, Growth, or Performance)</li>
                  <li><CheckIcon />15-minute kickoff call to understand your goals</li>
                  <li><CheckIcon />Share logins for any existing site or domain registrar</li>
                </ul>
              </div>
              <div className="tl-tail" />
            </div>

            {/* Step 2 */}
            <div className="tl-step">
              <div className="tl-dot">2</div>
              <div className="tl-wire" />
              <div className="tl-card">
                <div className="tl-card-top">
                  <div className="tl-card-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </div>
                  <div className="tl-card-meta">
                    <h3>Environment Setup and Migration</h3>
                    <span className="tl-time">Days 1–2</span>
                  </div>
                </div>
                <p>We spin up your server, configure your hosting environment, and install WordPress. If you have an existing site, we migrate everything — files, database, emails — with zero downtime.</p>
                <ul>
                  <li><CheckIcon />Dedicated server provisioned and hardened</li>
                  <li><CheckIcon />WordPress installed with best-practice configuration</li>
                  <li><CheckIcon />Full site migration (if applicable) — free with every plan</li>
                  <li><CheckIcon />Staging environment ready for testing</li>
                  <li><CheckIcon />WooCommerce installed and configured <span className="plan-tag growth">Growth+</span></li>
                  <li><CheckIcon />Custom theme designed and installed <span className="plan-tag perf">Performance</span></li>
                </ul>
              </div>
              <div className="tl-tail" />
            </div>

            {/* Step 3 */}
            <div className="tl-step">
              <div className="tl-dot">3</div>
              <div className="tl-wire" />
              <div className="tl-card">
                <div className="tl-card-top">
                  <div className="tl-card-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <div className="tl-card-meta">
                    <h3>Security, SSL and Domain Configuration</h3>
                    <span className="tl-time">Day 2</span>
                  </div>
                </div>
                <p>We configure your domain, point DNS, install your SSL certificate, and lock down your site with enterprise-grade security — firewall, malware scanning, and brute-force protection.</p>
                <ul>
                  <li><CheckIcon />Domain DNS pointed to your new server</li>
                  <li><CheckIcon />Free SSL certificate installed and enforced</li>
                  <li><CheckIcon />Web application firewall activated</li>
                  <li><CheckIcon />Automated daily backups configured</li>
                </ul>
              </div>
              <div className="tl-tail" />
            </div>

            {/* Step 4 */}
            <div className="tl-step">
              <div className="tl-dot">4</div>
              <div className="tl-wire" />
              <div className="tl-card">
                <div className="tl-card-top">
                  <div className="tl-card-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  </div>
                  <div className="tl-card-meta">
                    <h3>Performance Optimization</h3>
                    <span className="tl-time">Days 2–3</span>
                  </div>
                </div>
                <p>We fine-tune everything for speed. Caching layers, CDN configuration, image optimization, and database tuning — your site loads fast from day one.</p>
                <ul>
                  <li><CheckIcon />Server-level and page caching enabled</li>
                  <li><CheckIcon />Global CDN activated for static assets</li>
                  <li><CheckIcon />Image compression and lazy loading</li>
                  <li><CheckIcon />Database optimization and cleanup</li>
                  <li><CheckIcon />Full SEO audit with technical recommendations <span className="plan-tag growth">Growth+</span></li>
                </ul>
              </div>
              <div className="tl-tail" />
            </div>

            {/* Step 5 */}
            <div className="tl-step">
              <div className="tl-dot">5</div>
              <div className="tl-wire" />
              <div className="tl-card">
                <div className="tl-card-top">
                  <div className="tl-card-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                  </div>
                  <div className="tl-card-meta">
                    <h3>Walkthrough and Handoff</h3>
                    <span className="tl-time">Day 3–4</span>
                  </div>
                </div>
                <p>Once everything is set up, we do a live walkthrough. We&apos;ll show you your dashboard, how to manage content, and where to find us when you need help. Then we hand over the keys.</p>
                <ul>
                  <li><CheckIcon />Live screen-share walkthrough of your site</li>
                  <li><CheckIcon />WordPress admin tour and content editing basics</li>
                  <li><CheckIcon />Support channels and escalation paths explained</li>
                  <li><CheckIcon />Admin credentials and documentation delivered</li>
                </ul>
              </div>
              <div className="tl-tail" />
            </div>

            {/* Step 6 */}
            <div className="tl-step final">
              <div className="tl-dot">6</div>
              <div className="tl-wire" />
              <div className="tl-card">
                <div className="tl-card-top">
                  <div className="tl-card-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <div className="tl-card-meta">
                    <h3>You&apos;re Live — Ongoing Support Begins</h3>
                    <span className="tl-time">Day 4–5</span>
                  </div>
                </div>
                <p>Your site is live and fully operational. From here, our team monitors your hosting 24/7, handles updates, and is available whenever you need us. You focus on running your business.</p>
                <ul>
                  <li><CheckIcon />24/7 uptime monitoring active</li>
                  <li><CheckIcon />Ongoing managed updates (core, plugins, themes)</li>
                  <li><CheckIcon />Email support (all plans) with priority response <span className="plan-tag perf">Performance</span></li>
                  <li><CheckIcon />Dedicated account manager <span className="plan-tag perf">Performance</span></li>
                  <li><CheckIcon />Monthly performance and security reports</li>
                </ul>
              </div>
              <div className="tl-tail" />
            </div>

          </div>
        </div>
      </section>

      {/* ═══ PRICING CTA ═══ */}
      <div className="rv" style={{ textAlign: 'center', padding: '80px 0' }}>
        <Link href="/get-started" className="bp lg">Get Started</Link>
      </div>

      {/* FAQ removed per request */}
      {/* CTA removed per request */}
    </>
  );
}
