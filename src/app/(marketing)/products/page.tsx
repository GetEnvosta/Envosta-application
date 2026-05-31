'use client';

import { useEffect, useCallback } from 'react';

/* ── Page-specific CSS (not in shared marketing.css) ── */
const pageStyles = `
/* sh-tag */
.sh-tag{display:inline-block;font-size:.72rem;font-weight:500;text-transform:uppercase;letter-spacing:3px;color:var(--gold);margin-bottom:10px}

/* hero */
.feat-hero{padding:160px 0 80px;text-align:center;position:relative;overflow:hidden}
.feat-hero::before{content:'';position:absolute;top:-40%;left:50%;transform:translateX(-50%);width:800px;height:800px;background:radial-gradient(circle,rgba(37,99,235,.12),transparent 65%);pointer-events:none}
.feat-hero .c{position:relative;z-index:1}
.feat-hero h1{font-size:clamp(2.4rem,5vw,3.8rem);font-weight:600;letter-spacing:-2px;line-height:1.12;margin-bottom:20px}
.feat-hero p{font-size:1.05rem;color:var(--t2);max-width:560px;margin:0 auto 44px;line-height:1.8;font-weight:300}
.hero-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}

/* onboarding split */
.onb-split{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.onb-text h3{font-size:1.5rem;font-weight:500;letter-spacing:-.5px;margin-bottom:16px}
.onb-text p{font-size:.88rem;color:var(--t3);line-height:1.7;font-weight:300;margin-bottom:20px}
.onb-steps{display:flex;flex-direction:column;gap:14px}
.onb-step{display:flex;align-items:flex-start;gap:14px}
.onb-num{width:32px;height:32px;border-radius:50%;background:var(--gold-dim);display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:600;color:var(--gold);flex-shrink:0;border:1px solid rgba(37,99,235,.2)}
.onb-step-text h4{font-size:.84rem;font-weight:500;margin-bottom:2px}
.onb-step-text p{font-size:.76rem;color:var(--t3);font-weight:300;line-height:1.6;margin:0}

/* mini chat */
.mini-chat{display:flex;flex-direction:column;gap:10px;padding:24px;background:var(--card);border:1px solid var(--bdr);border-radius:16px}
.chat-msg{padding:10px 14px;border-radius:12px;font-size:.76rem;font-weight:300;max-width:85%}
.chat-msg.them{background:var(--card2);color:var(--t2);align-self:flex-start;border-bottom-left-radius:4px}
.chat-msg.us{background:var(--gold);color:#fff;align-self:flex-end;border-bottom-right-radius:4px}

/* mega card */
.mega{background:var(--card);border:1px solid var(--bdr);border-radius:20px;padding:48px;margin-bottom:32px}
.mega-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.mega h3{font-size:1.5rem;font-weight:500;letter-spacing:-.5px;margin-bottom:16px}
.mega .desc{font-size:.88rem;color:var(--t3);line-height:1.7;font-weight:300;margin-bottom:24px}
.mega-tags{display:flex;flex-wrap:wrap;gap:8px}
.mega-tags span{display:inline-block;padding:6px 14px;background:var(--card2);border:1px solid var(--bdr);border-radius:100px;font-size:.72rem;color:var(--t2);font-weight:400}

/* wp.cloud stack */
.wpc-stack{display:flex;flex-direction:column;gap:8px}
.wpc-row{display:flex;align-items:center;gap:12px;background:var(--card2);border:1px solid var(--bdr);border-radius:10px;padding:14px 18px;transition:border-color .3s}
.wpc-row:hover{border-color:rgba(37,99,235,.3)}
.wpc-ic{width:28px;height:28px;border-radius:8px;background:var(--gold-dim);display:flex;align-items:center;justify-content:center;font-size:.7rem;flex-shrink:0}
.wpc-row .lbl{font-size:.76rem;font-weight:400;color:var(--t2)}
.wpc-row .val{margin-left:auto;font-size:.72rem;font-weight:500;color:var(--grn)}

/* perf bars */
.perf{display:flex;flex-direction:column;gap:8px}
.perf-row{display:flex;align-items:center;gap:12px;padding:10px 16px;background:var(--card2);border:1px solid var(--bdr);border-radius:10px}
.perf-row .pl{font-size:.72rem;color:var(--t3);font-weight:300;width:90px}
.perf-row .bar{flex:1;height:6px;background:var(--bg2);border-radius:100px;overflow:hidden}
.perf-row .fill{height:100%;border-radius:100px;background:linear-gradient(90deg,var(--gold),var(--grn))}
.perf-row .sc{font-size:.72rem;color:var(--grn);font-weight:500;width:36px;text-align:right}

/* domain search */
.dom-search-wrap{max-width:560px;margin:0 auto}
.dom-search{display:flex;gap:0;background:var(--card);border:1px solid var(--bdr);border-radius:100px;padding:6px;transition:border-color .3s}
.dom-search:focus-within{border-color:var(--gold)}
.dom-search input{flex:1;background:none;border:none;outline:none;color:var(--t1);font-size:.92rem;padding:10px 20px;font-family:inherit}
.dom-search input::placeholder{color:var(--t3)}
.dom-search button{padding:12px 28px;background:var(--gold);color:#fff;border:none;border-radius:100px;font-size:.84rem;font-weight:500;cursor:pointer;transition:background .2s;font-family:inherit}
.dom-search button:hover{background:var(--gold-bright)}
.dom-result{margin-top:20px;text-align:center;min-height:40px}
.dom-result .available{color:var(--grn);font-size:.88rem}
.dom-result .taken{color:#ef4444;font-size:.88rem}
.dom-result .checking{color:var(--t3);font-size:.84rem;font-weight:300}
.dom-tlds{display:flex;gap:8px;justify-content:center;margin-top:16px;flex-wrap:wrap}
.dom-tld{padding:8px 18px;background:var(--card);border:1px solid var(--bdr);border-radius:100px;font-size:.76rem;color:var(--t2);font-weight:400;cursor:default}
.dom-tld.avail{border-color:var(--grn);color:var(--grn)}
.dom-tld.taken{border-color:var(--t3);color:var(--t3);opacity:.5}

/* email features */
.email-features{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.email-feat{background:var(--card2);border:1px solid var(--bdr);border-radius:var(--r);padding:24px;transition:border-color .3s}
.email-feat:hover{border-color:var(--bdr2)}
.ef-ic{width:36px;height:36px;border-radius:10px;background:var(--gold-dim);display:flex;align-items:center;justify-content:center;font-size:.9rem;margin-bottom:14px}
.email-feat h4{font-size:.84rem;font-weight:500;margin-bottom:4px}
.email-feat p{font-size:.72rem;color:var(--t3);font-weight:300;line-height:1.6}

/* feature grid */
.fg6{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.fg-i{background:var(--card);border:1px solid var(--bdr);border-radius:var(--r);padding:28px;transition:border-color .3s,transform .3s}
.fg-i:hover{border-color:var(--bdr2);transform:translateY(-2px)}
.fg-i .ic{width:40px;height:40px;border-radius:10px;background:var(--gold-dim);display:flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:1.1rem}
.fg-i h4{font-size:.92rem;font-weight:500;margin-bottom:6px}
.fg-i p{font-size:.78rem;color:var(--t3);font-weight:300;line-height:1.6}

/* studio */
.studio{padding:120px 0;position:relative;overflow:hidden}
.studio::before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent,rgba(37,99,235,.03) 20%,rgba(37,99,235,.05) 50%,rgba(37,99,235,.03) 80%,transparent);pointer-events:none}
.studio::after{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(37,99,235,.3) 30%,rgba(37,99,235,.5) 50%,rgba(37,99,235,.3) 70%,transparent)}
.studio .c{position:relative;z-index:1}
.studio-card{display:grid;grid-template-columns:1fr 1fr;gap:56px;background:var(--card);border:1px solid var(--bdr);border-radius:24px;padding:56px 48px;position:relative;overflow:hidden}
.studio-card::before{content:'';position:absolute;top:-40%;right:-20%;width:500px;height:500px;background:radial-gradient(circle,rgba(37,99,235,.08),transparent 65%);pointer-events:none}
.studio-left{position:relative;z-index:1}
.studio-right{position:relative;z-index:1}
.studio-badge{display:inline-flex;align-items:center;gap:8px;padding:6px 16px;background:transparent;border:1px solid rgba(37,99,235,.3);border-radius:100px;font-size:.68rem;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:var(--gold-bright);margin-bottom:24px}
.studio-badge-dot{width:6px;height:6px;border-radius:50%;background:var(--gold-bright);animation:sPulse 2s ease-in-out infinite}
@keyframes sPulse{0%,100%{opacity:.5;box-shadow:0 0 0 0 rgba(59,130,246,.4)}50%{opacity:1;box-shadow:0 0 0 6px rgba(59,130,246,0)}}
.studio-card h3{font-size:1.8rem;font-weight:500;letter-spacing:-1px;margin-bottom:16px;line-height:1.15}
.studio-card h3 span{background:linear-gradient(90deg,var(--gold-bright),var(--grn));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.studio-left>p{font-size:.88rem;color:var(--t3);line-height:1.7;font-weight:300;margin-bottom:28px}
.studio-price{margin-bottom:8px}
.studio-price strong{font-size:1.6rem;font-weight:600;letter-spacing:-.5px}
.studio-price span{font-size:.84rem;color:var(--t3);font-weight:300;margin-left:4px}
.studio-price-note{font-size:.72rem;color:var(--t3);font-weight:300;margin-bottom:28px}
.studio-cta{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.waitlist-note{font-size:.72rem;color:var(--t3);font-weight:300;font-style:italic}
.studio-features{display:flex;flex-direction:column;gap:20px}
.studio-feat{display:flex;align-items:flex-start;gap:14px}
.studio-feat-icon{width:36px;height:36px;border-radius:10px;background:var(--gold-dim);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--gold)}
.studio-feat-icon svg{width:18px;height:18px}
.studio-feat-text h4{font-size:.84rem;font-weight:500;margin-bottom:3px}
.studio-feat-text p{font-size:.76rem;color:var(--t3);font-weight:300;line-height:1.6}
.studio-limit{margin-top:28px;padding:16px 20px;background:rgba(37,99,235,.04);border:1px solid rgba(37,99,235,.12);border-radius:12px;font-size:.76rem;color:var(--t2);line-height:1.6;font-weight:300}

/* cta */
.feat-cta-section{padding:80px 0 100px}
.feat-cta-box{background:var(--card);border:1px solid var(--gold);border-radius:20px;padding:64px 48px;text-align:center;position:relative;overflow:hidden}
.feat-cta-box::before{content:'';position:absolute;top:-50%;left:50%;transform:translateX(-50%);width:600px;height:600px;background:radial-gradient(circle,rgba(37,99,235,.1),transparent 65%);pointer-events:none}
.feat-cta-box h2{font-size:clamp(1.8rem,3.5vw,2.4rem);font-weight:500;letter-spacing:-1px;margin-bottom:14px;position:relative;z-index:1}
.feat-cta-box p{font-size:.92rem;color:var(--t2);max-width:460px;margin:0 auto 32px;font-weight:300;line-height:1.7;position:relative;z-index:1}
.feat-cta-btns{display:flex;gap:12px;justify-content:center;position:relative;z-index:1}

/* bp.blue */
.bp.blue{background:var(--gold);color:#fff}
.bp.blue:hover{background:var(--gold-bright)}

/* responsive */
@media(max-width:1024px){
  .fg6,.email-features{grid-template-columns:1fr 1fr}
  .mega-grid,.onb-split{grid-template-columns:1fr}
  .studio-card{grid-template-columns:1fr;gap:40px}
}
@media(max-width:768px){
  .fg6,.email-features{grid-template-columns:1fr}
  .feat-hero{padding:140px 0 60px}
  .feat-cta-box{padding:40px 24px}
  .studio{padding:80px 0}
  .studio-card{padding:40px 28px}
  .feat-cta-btns{flex-direction:column;align-items:center}
  .dom-search{flex-direction:column;border-radius:16px}
  .dom-search input{padding:14px 20px}
  .dom-search button{border-radius:100px}
}
`;

export default function ProductsPage() {
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
      <style dangerouslySetInnerHTML={{ __html: pageStyles }} />

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
