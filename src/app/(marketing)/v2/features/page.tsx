'use client';

import { useEffect, useCallback } from 'react';

export default function FeaturesPage() {
  const searchDomain = useCallback(() => {
    const input = document.getElementById('dom-input') as HTMLInputElement | null;
    const result = document.getElementById('dom-result');
    if (!input || !result) return;

    let q = input.value.trim().toLowerCase().replace(/\s+/g, '');
    if (!q) { result.innerHTML = ''; return; }

    q = q.replace(/^(https?:\/\/)?(www\.)?/, '');
    const hasTLD = /\.[a-z]{2,}$/.test(q);
    const base = hasTLD ? q.replace(/\.[a-z]{2,}$/, '') : q;
    const tld = hasTLD ? (q.match(/\.[a-z]{2,}$/) as RegExpMatchArray)[0] : '.com';
    const full = base + tld;

    result.innerHTML = '<p class="checking">Checking availability...</p>';

    setTimeout(() => {
      let hash = 0;
      for (let i = 0; i < full.length; i++) hash += full.charCodeAt(i);
      const isAvail = hash % 3 !== 0;

      const tlds = ['.com', '.net', '.org', '.co', '.io', '.dev'];
      let html = '';

      if (isAvail) {
        html += '<p class="available">&#10003; <strong>' + full + '</strong> is available!</p>';
      } else {
        html += '<p class="taken">&#10007; <strong>' + full + '</strong> is taken.</p>';
      }

      html += '<div class="dom-tlds">';
      for (let j = 0; j < tlds.length; j++) {
        const tldFull = base + tlds[j];
        let tldHash = 0;
        for (let k = 0; k < tldFull.length; k++) tldHash += tldFull.charCodeAt(k);
        const tldAvail = tldHash % 3 !== 0;
        html += '<span class="dom-tld ' + (tldAvail ? 'avail' : 'taken') + '">' + tlds[j] + '</span>';
      }
      html += '</div>';

      result.innerHTML = html;
    }, 800);
  }, []);

  useEffect(() => {
    // Scroll reveal
    const rvEls = document.querySelectorAll('.rv');
    const observers: IntersectionObserver[] = [];
    rvEls.forEach((el) => {
      const obs = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) entries[0].target.classList.add('v');
        },
        { threshold: 0.05 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    // Domain search key listener
    const domInput = document.getElementById('dom-input');
    const handleKey = (e: Event) => {
      if ((e as KeyboardEvent).key === 'Enter') searchDomain();
    };
    domInput?.addEventListener('keydown', handleKey);

    return () => {
      observers.forEach((obs) => obs.disconnect());
      domInput?.removeEventListener('keydown', handleKey);
    };
  }, [searchDomain]);

  return (
    <>
      {/* HERO */}
      <section className="feat-hero">
        <div className="c">
          <h1 className="rv">Built to perform</h1>
          <p className="rv">Managed WordPress hosting on enterprise infrastructure, domain registration, business email, and a team that helps you set it all up.</p>
          <div className="hero-btns rv">
            <a href="/get-started" className="bp lg">Create Your Website</a>
          </div>
        </div>
      </section>

      {/* THE ENVOSTA DIFFERENCE */}
      <section style={{ padding: '100px 0' }}>
        <div className="c">
          <div className="sh rv">
            <span className="sh-tag">The Envosta Difference</span>
            <h2>Every plan starts with a real conversation</h2>
            <p className="sh-desc">Most hosts hand you a login and wish you luck. We start every engagement with a 1-on-1 consultation — then help you configure hosting, migrate your site, set up your domain, configure email, and optimize everything before you go live.</p>
          </div>
          <div className="onb-split rv">
            <div className="onb-text">
              <h3>Your onboarding, handled</h3>
              <p>We don&apos;t just sell you a server — we help you build on it. Our team walks through your goals, configures your entire environment, and stays with you through launch.</p>
              <div className="onb-steps">
                <div className="onb-step">
                  <div className="onb-num">1</div>
                  <div className="onb-step-text">
                    <h4>Personal consultation</h4>
                    <p>We review your site goals, business needs, and technical requirements together.</p>
                  </div>
                </div>
                <div className="onb-step">
                  <div className="onb-num">2</div>
                  <div className="onb-step-text">
                    <h4>Environment setup</h4>
                    <p>We configure your hosting, install WordPress, set up your domain and SSL — all of it.</p>
                  </div>
                </div>
                <div className="onb-step">
                  <div className="onb-num">3</div>
                  <div className="onb-step-text">
                    <h4>Migration and optimization</h4>
                    <p>We migrate your existing site for free, then optimize performance, caching, and security.</p>
                  </div>
                </div>
                <div className="onb-step">
                  <div className="onb-num">4</div>
                  <div className="onb-step-text">
                    <h4>Launch with confidence</h4>
                    <p>Final review, DNS cutover, and you&apos;re live — with our team on standby if you need anything.</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="mini-chat">
                <div className="chat-msg them">Hi, I just signed up. I have a WooCommerce store on another host — can you help me move it over?</div>
                <div className="chat-msg us">Of course! Can you send me your current host&apos;s login details and the domain you&apos;d like to use? I&apos;ll take it from there.</div>
                <div className="chat-msg them">Just sent everything over. How long does this usually take?</div>
                <div className="chat-msg us">Most migrations are done within 24 hours. I&apos;ll handle the files, database, SSL, and DNS — and I&apos;ll send you a preview link before we go live. Want to schedule a quick call to walk through your new dashboard once it&apos;s ready?</div>
                <div className="chat-msg them">That would be great, thank you.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WORDPRESS HOSTING */}
      <section style={{ padding: '100px 0' }}>
        <div className="c">
          <div className="sh rv">
            <span className="sh-tag">WordPress Hosting</span>
            <h2>Enterprise WordPress, powered by wp.cloud</h2>
            <p className="sh-desc">Your site runs on the same cloud infrastructure trusted by some of the biggest names on the web. Automattic&apos;s wp.cloud platform delivers the performance, security, and reliability that enterprise WordPress demands.</p>
          </div>

          <div className="mega rv">
            <div className="mega-grid">
              <div>
                <h3>Infrastructure you can trust</h3>
                <p className="desc">wp.cloud is built and maintained by Automattic — the company behind WordPress.com, WooCommerce, and Jetpack. Every Envosta site runs on this platform, which means you get the same globally distributed infrastructure, automated scaling, and battle-tested security that powers millions of sites worldwide.</p>
                <div className="mega-tags">
                  <span>wp.cloud by Automattic</span>
                  <span>Global Edge Network</span>
                  <span>Auto-Scaling</span>
                  <span>Managed Updates</span>
                  <span>DDoS Protection</span>
                </div>
              </div>
              <div>
                <div className="wpc-stack">
                  <div className="wpc-row"><div className="wpc-ic">&#x1F310;</div><span className="lbl">Global Edge Network</span><span className="val">28+ locations</span></div>
                  <div className="wpc-row"><div className="wpc-ic">&#x26A1;</div><span className="lbl">Time to First Byte</span><span className="val">&lt; 200ms</span></div>
                  <div className="wpc-row"><div className="wpc-ic">&#x1F512;</div><span className="lbl">WAF + DDoS Protection</span><span className="val">Always on</span></div>
                  <div className="wpc-row"><div className="wpc-ic">&#x1F4BE;</div><span className="lbl">Automated Daily Backups</span><span className="val">30-day retention</span></div>
                  <div className="wpc-row"><div className="wpc-ic">&#x1F504;</div><span className="lbl">Auto-Scaling Resources</span><span className="val">Built-in</span></div>
                  <div className="wpc-row"><div className="wpc-ic">&#x1F4CA;</div><span className="lbl">Uptime SLA</span><span className="val">99.99%</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mega rv">
            <div className="mega-grid">
              <div>
                <h3>Performance at every layer</h3>
                <p className="desc">Speed isn&apos;t one feature — it&apos;s the result of hundreds of decisions. From server architecture to theme code to image delivery, every layer is tuned for performance.</p>
                <div className="mega-tags">
                  <span>Edge Caching</span>
                  <span>Brotli Compression</span>
                  <span>HTTP/3</span>
                  <span>Lazy Loading</span>
                  <span>Critical CSS</span>
                  <span>Object Caching</span>
                </div>
              </div>
              <div>
                <div className="perf">
                  <div className="perf-row"><span className="pl">Server TTFB</span><div className="bar"><div className="fill" style={{ width: '96%' }} /></div><span className="sc">98</span></div>
                  <div className="perf-row"><span className="pl">Theme Code</span><div className="bar"><div className="fill" style={{ width: '94%' }} /></div><span className="sc">96</span></div>
                  <div className="perf-row"><span className="pl">Image Delivery</span><div className="bar"><div className="fill" style={{ width: '92%' }} /></div><span className="sc">94</span></div>
                  <div className="perf-row"><span className="pl">CSS / JS</span><div className="bar"><div className="fill" style={{ width: '95%' }} /></div><span className="sc">97</span></div>
                  <div className="perf-row"><span className="pl">CDN Edge</span><div className="bar"><div className="fill" style={{ width: '97%' }} /></div><span className="sc">99</span></div>
                  <div className="perf-row"><span className="pl">Lighthouse</span><div className="bar"><div className="fill" style={{ width: '95%' }} /></div><span className="sc">95+</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DOMAIN NAMES */}
      <section style={{ padding: '100px 0' }}>
        <div className="c">
          <div className="sh rv" style={{ textAlign: 'center' }}>
            <span className="sh-tag">Domain Names</span>
            <h2>Register your domain, right here</h2>
            <p className="sh-desc" style={{ margin: '16px auto 0' }}>Find and register the perfect domain for your business. We handle DNS, SSL, and connect everything to your hosting automatically.</p>
          </div>

          <div className="rv">
            <div className="dom-search-wrap">
              <div className="dom-search">
                <input type="text" id="dom-input" placeholder="Search for a domain name..." />
                <button id="dom-btn" onClick={searchDomain}>Search</button>
              </div>
              <div className="dom-result" id="dom-result" />
            </div>
          </div>

          <div className="mega rv" style={{ marginTop: '48px' }}>
            <div className="mega-grid">
              <div>
                <h3>Domains, fully managed</h3>
                <p className="desc">Register .com, .net, .org, and dozens of other TLDs directly through your Envosta dashboard. We automatically configure DNS records, provision SSL certificates, and point everything to your hosting.</p>
                <div className="mega-tags">
                  <span>20+ TLDs</span>
                  <span>Auto DNS Config</span>
                  <span>Free SSL</span>
                  <span>WHOIS Privacy</span>
                  <span>Easy Transfers</span>
                </div>
              </div>
              <div>
                <div className="wpc-stack">
                  <div className="wpc-row"><div className="wpc-ic">&#x1F517;</div><span className="lbl">DNS Configuration</span><span className="val">Automatic</span></div>
                  <div className="wpc-row"><div className="wpc-ic">&#x1F512;</div><span className="lbl">SSL Certificate</span><span className="val">Free</span></div>
                  <div className="wpc-row"><div className="wpc-ic">&#x1F6E1;&#xFE0F;</div><span className="lbl">WHOIS Privacy</span><span className="val">Included</span></div>
                  <div className="wpc-row"><div className="wpc-ic">&#x1F504;</div><span className="lbl">Auto-Renewal</span><span className="val">Enabled</span></div>
                  <div className="wpc-row"><div className="wpc-ic">&#x1F4E7;</div><span className="lbl">Email Forwarding</span><span className="val">Included</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BUSINESS EMAIL */}
      <section style={{ padding: '100px 0' }}>
        <div className="c">
          <div className="sh rv">
            <span className="sh-tag">Business Email</span>
            <h2>Professional email with Google Workspace</h2>
            <p className="sh-desc">Get you@yourdomain.com powered by Google Workspace. We help you sign up, configure your DNS records, and verify your domain — so you&apos;re sending and receiving from day one.</p>
          </div>

          <div className="mega rv">
            <div className="mega-grid">
              <div>
                <h3>We set it up, you just send</h3>
                <p className="desc">Google Workspace gives you Gmail, Drive, Calendar, Meet, and the full suite of productivity tools under your custom domain. We handle the technical setup: MX records, SPF, DKIM, and DMARC so your emails land in inboxes, not spam.</p>
                <div style={{ marginTop: '24px' }}>
                  <a href="https://workspace.google.com/business/signup/welcome" target="_blank" rel="noopener noreferrer" className="bp blue">Get Google Workspace</a>
                </div>
              </div>
              <div>
                <div className="email-features">
                  <div className="email-feat"><div className="ef-ic">&#x1F4E7;</div><h4>Custom Email</h4><p>you@yourdomain.com powered by Gmail</p></div>
                  <div className="email-feat"><div className="ef-ic">&#x1F4BE;</div><h4>Cloud Storage</h4><p>30GB+ per user with Google Drive</p></div>
                  <div className="email-feat"><div className="ef-ic">&#x1F4C5;</div><h4>Calendar</h4><p>Shared calendars and scheduling</p></div>
                  <div className="email-feat"><div className="ef-ic">&#x1F3A5;</div><h4>Video Calls</h4><p>Google Meet for team and client calls</p></div>
                  <div className="email-feat"><div className="ef-ic">&#x1F512;</div><h4>DNS Records</h4><p>MX, SPF, DKIM, DMARC configured for you</p></div>
                  <div className="email-feat"><div className="ef-ic">&#x1F6E1;&#xFE0F;</div><h4>Spam Protection</h4><p>Enterprise-grade filtering built in</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ALL FEATURES */}
      <section style={{ padding: '100px 0' }}>
        <div className="c">
          <div className="sh rv" style={{ textAlign: 'center' }}>
            <span className="sh-tag">Everything Included</span>
            <h2>All the tools, every plan</h2>
          </div>
          <div className="fg6">
            <div className="fg-i rv"><div className="ic">&#x1F310;</div><h4>Global CDN</h4><p>Content served from 28+ edge locations worldwide.</p></div>
            <div className="fg-i rv"><div className="ic">&#x1F4BE;</div><h4>Daily Backups</h4><p>Automated backups with 30-day retention and one-click restore.</p></div>
            <div className="fg-i rv"><div className="ic">&#x1F512;</div><h4>Free SSL</h4><p>Auto-provisioned certificates for every domain.</p></div>
            <div className="fg-i rv"><div className="ic">&#x1F9EA;</div><h4>Staging</h4><p>One-click staging to test changes before going live.</p></div>
            <div className="fg-i rv"><div className="ic">&#x1F69A;</div><h4>Free Migration</h4><p>Our team handles your full site migration at no cost.</p></div>
            <div className="fg-i rv"><div className="ic">&#x1F6E1;&#xFE0F;</div><h4>Malware Scanning</h4><p>Daily scanning with real-time threat detection.</p></div>
            <div className="fg-i rv"><div className="ic">&#x1F4DE;</div><h4>1-on-1 Setup Call</h4><p>Every plan starts with a personal consultation.</p></div>
            <div className="fg-i rv"><div className="ic">&#x1F30D;</div><h4>Multi-Region</h4><p>Choose your preferred server location for optimal latency.</p></div>
            <div className="fg-i rv"><div className="ic">&#x2699;&#xFE0F;</div><h4>Latest PHP</h4><p>Always running the latest stable versions.</p></div>
            <div className="fg-i rv"><div className="ic">&#x1F4E7;</div><h4>Email Forwarding</h4><p>Professional email forwarding included free.</p></div>
            <div className="fg-i rv"><div className="ic">&#x1F6D2;</div><h4>WooCommerce Ready</h4><p>Optimized for online stores with dedicated resources.</p></div>
            <div className="fg-i rv"><div className="ic">&#x1F504;</div><h4>Managed Updates</h4><p>WordPress core and plugin updates handled for you.</p></div>
          </div>
        </div>
      </section>

      {/* ENVOSTA STUDIO */}
      <section className="studio">
        <div className="c">
          <div className="sh rv">
            <div className="sh-tag">Envosta Studio</div>
            <h2>Need a team, not just a host?</h2>
            <p className="sh-desc">For businesses that want dedicated WordPress experts handling design, development, and ongoing optimization alongside their hosting.</p>
          </div>
          <div className="studio-card rv">
            <div className="studio-left">
              <div className="studio-badge"><div className="studio-badge-dot" />Waitlist Full</div>
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
                  <div className="studio-feat-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                  </div>
                  <div className="studio-feat-text"><h4>Dedicated Account Lead</h4><p>A named senior engineer who knows your stack, your goals, and your site history.</p></div>
                </div>
                <div className="studio-feat">
                  <div className="studio-feat-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                  </div>
                  <div className="studio-feat-text"><h4>Same-Day Response</h4><p>Critical issues resolved within hours, not days. Direct Slack or phone access.</p></div>
                </div>
                <div className="studio-feat">
                  <div className="studio-feat-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" /></svg>
                  </div>
                  <div className="studio-feat-text"><h4>Proactive Monitoring</h4><p>We catch problems before you do. Uptime, performance, and security — watched 24/7.</p></div>
                </div>
                <div className="studio-feat">
                  <div className="studio-feat-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
                  </div>
                  <div className="studio-feat-text"><h4>Monthly Strategy Calls</h4><p>Recurring sessions to review performance, plan updates, and align on priorities.</p></div>
                </div>
              </div>
              <div className="studio-limit">We intentionally keep capacity <strong>limited</strong> to maintain the quality our clients expect. Currently full.</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="feat-cta-section">
        <div className="c">
          <div className="feat-cta-box rv">
            <h2>Ready to get started?</h2>
            <p>Every plan begins with a personal consultation. Let&apos;s build the right foundation for your site together.</p>
            <div className="feat-cta-btns">
              <a href="/get-started" className="bp lg">View Plans</a>
              <a href="/support" className="bp ghost lg">Book a Consultation</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
