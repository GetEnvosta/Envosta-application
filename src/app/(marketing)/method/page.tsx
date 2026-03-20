'use client';

import { useEffect } from 'react';

export default function MethodPage() {
  useEffect(() => {
    // Set page title
    document.title = 'The ENVOSTA Method – From Idea to Authority | Envosta';

    // Set meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', 'Seven phases. One clear path. The ENVOSTA Method gets your site live faster, performing better, and built to grow from day one.');

    // Set canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', 'https://envosta.com/method');

    // Scroll reveal
    const revealElements = document.querySelectorAll('.rv');
    const observers: IntersectionObserver[] = [];
    revealElements.forEach((el) => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            entries[0].target.classList.add('v');
          }
        },
        { threshold: 0.05 }
      );
      observer.observe(el);
      observers.push(observer);
    });

    // ENVOSTA letter animation
    const letters = document.querySelectorAll('.envosta span');
    if (letters.length) {
      let i = 0;
      function light() {
        if (i < letters.length) {
          letters[i].classList.add('lit');
          i++;
          setTimeout(light, 120);
        }
      }
      const timer = setTimeout(light, 400);
      return () => {
        clearTimeout(timer);
        observers.forEach((obs) => obs.disconnect());
      };
    }

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, []);

  return (
    <>
      <style jsx>{`
        /* ── ENVOSTA Letters ── */
        .envosta{letter-spacing:clamp(2px,.8vw,8px);display:inline}
        .envosta span{color:rgba(255,255,255,.15);transition:color .4s;display:inline}
        .envosta span.lit{color:#fff}

        /* ── Section header extras ── */
        .sh-center{text-align:center}
        .sh-center .sh-desc{margin-left:auto;margin-right:auto}
        .sh-tag{display:inline-block;font-size:.72rem;font-weight:500;text-transform:uppercase;letter-spacing:3px;color:var(--gold);margin-bottom:10px}

        /* ── Method Steps ── */
        .method-grid{display:flex;flex-direction:column;gap:24px;counter-reset:step}
        .method-step{background:var(--card);border:1px solid var(--bdr);border-radius:24px;overflow:hidden;transition:all .3s;display:grid;grid-template-columns:100px 1fr;align-items:stretch;counter-increment:step}
        .method-step:hover{border-color:var(--bdr2);transform:translateY(-3px)}
        .method-step:nth-child(1){background:linear-gradient(135deg,rgba(37,99,235,.06),var(--card));border-color:rgba(37,99,235,.12)}
        .method-step:nth-child(2){background:linear-gradient(135deg,rgba(52,211,153,.04),var(--card));border-color:rgba(52,211,153,.1)}
        .method-step:nth-child(3){background:linear-gradient(135deg,rgba(159,122,234,.04),var(--card));border-color:rgba(159,122,234,.1)}
        .method-step:nth-child(4){background:linear-gradient(135deg,rgba(99,179,237,.04),var(--card));border-color:rgba(99,179,237,.1)}
        .method-step:nth-child(5){background:linear-gradient(135deg,rgba(252,176,69,.04),var(--card));border-color:rgba(252,176,69,.1)}
        .method-step:nth-child(6){background:linear-gradient(135deg,rgba(252,129,129,.04),var(--card));border-color:rgba(252,129,129,.1)}
        .method-step:nth-child(7){background:linear-gradient(135deg,rgba(56,178,172,.04),var(--card));border-color:rgba(56,178,172,.1)}
        .step-letter{display:flex;align-items:center;justify-content:center;border-right:1px solid var(--bdr);position:relative}
        .step-letter span{font-family:'Plus Jakarta Sans',sans-serif;font-size:2.4rem;font-weight:700;opacity:.15}
        .method-step:nth-child(1) .step-letter span{color:#2563EB}
        .method-step:nth-child(2) .step-letter span{color:#34d399}
        .method-step:nth-child(3) .step-letter span{color:#9f7aea}
        .method-step:nth-child(4) .step-letter span{color:#63b3ed}
        .method-step:nth-child(5) .step-letter span{color:#fcb045}
        .method-step:nth-child(6) .step-letter span{color:#fc8181}
        .method-step:nth-child(7) .step-letter span{color:#38b2ac}
        .step-body{padding:32px 36px}
        .step-body h3{font-size:1.15rem;font-weight:500;margin-bottom:8px;color:var(--t1);line-height:1.3}
        .step-body p{font-size:.88rem;color:var(--t2);line-height:1.7;font-weight:300}
        .step-tag{display:inline-block;font-size:.65rem;font-weight:600;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;border-radius:100px;padding:3px 10px}
        .method-step:nth-child(1) .step-tag{background:rgba(37,99,235,.1);color:#5B9AF6}
        .method-step:nth-child(2) .step-tag{background:rgba(52,211,153,.1);color:#34d399}
        .method-step:nth-child(3) .step-tag{background:rgba(159,122,234,.1);color:#9f7aea}
        .method-step:nth-child(4) .step-tag{background:rgba(99,179,237,.1);color:#63b3ed}
        .method-step:nth-child(5) .step-tag{background:rgba(252,176,69,.1);color:#fcb045}
        .method-step:nth-child(6) .step-tag{background:rgba(252,129,129,.1);color:#fc8181}
        .method-step:nth-child(7) .step-tag{background:rgba(56,178,172,.1);color:#38b2ac}

        /* ── Why section ── */
        .why-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
        .why-card{background:var(--card);border:1px solid var(--bdr);border-radius:20px;padding:32px 28px;transition:all .3s}
        .why-card:hover{border-color:var(--bdr2);transform:translateY(-3px)}
        .why-card:nth-child(1){background:linear-gradient(135deg,rgba(52,211,153,.06),var(--card));border-color:rgba(52,211,153,.12)}
        .why-card:nth-child(2){background:linear-gradient(135deg,rgba(37,99,235,.06),var(--card));border-color:rgba(37,99,235,.12)}
        .why-card:nth-child(3){background:linear-gradient(135deg,rgba(252,176,69,.06),var(--card));border-color:rgba(252,176,69,.12)}
        .why-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;margin-bottom:18px}
        .why-card:nth-child(1) .why-icon{background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.2)}
        .why-card:nth-child(2) .why-icon{background:rgba(37,99,235,.12);border:1px solid rgba(37,99,235,.2)}
        .why-card:nth-child(3) .why-icon{background:rgba(252,176,69,.12);border:1px solid rgba(252,176,69,.2)}
        .why-card h4{font-size:1rem;font-weight:500;margin-bottom:8px;color:var(--t1)}
        .why-card p{font-size:.82rem;color:var(--t3);line-height:1.7;font-weight:300}

        /* ── CTA ── */
        .cta-section{padding:100px 0;text-align:center}
        .cta-section h2{font-family:'Plus Jakarta Sans',sans-serif;font-size:clamp(1.8rem,3.5vw,2.8rem);font-weight:500;letter-spacing:-.8px;line-height:1.15;margin-bottom:16px}
        .cta-section p{color:var(--t2);font-size:.95rem;max-width:520px;margin:0 auto 32px;font-weight:300;line-height:1.7}
        .cta-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}

        /* ── Responsive ── */
        @media(max-width:1024px){
          .method-step{grid-template-columns:80px 1fr}
          .why-grid{grid-template-columns:1fr 1fr}
        }
        @media(max-width:768px){
          .method-step{grid-template-columns:1fr}
          .step-letter{border-right:none;border-bottom:1px solid var(--bdr);padding:16px 0}
          .step-letter span{font-size:1.8rem}
          .why-grid{grid-template-columns:1fr}
          .cta-btns{flex-direction:column;align-items:center}
        }
      `}</style>

      {/* ZONE A - The 7 Steps */}
      <div className="zone-a" style={{ marginTop: 0, borderRadius: 0, paddingTop: '140px' }}>
        <section style={{ padding: '0 0 80px' }}>
          <div className="c">
            <div className="sh sh-center rv">
              <span className="sh-tag">Our Signature Framework</span>
              <h1 style={{ fontSize: 'clamp(2.4rem,5.5vw,3.6rem)', fontWeight: 600, letterSpacing: '-1.5px', lineHeight: 1.08, marginBottom: '16px' }}>
                The{' '}
                <span className="envosta">
                  <span>E</span>
                  <span>N</span>
                  <span>V</span>
                  <span>O</span>
                  <span>S</span>
                  <span>T</span>
                  <span>A</span>
                </span>{' '}
                Method
              </h1>
              <p className="sh-desc">
                Seven phases. One clear path. Every step is designed to get your site live faster, performing better, and built to grow from day one.
              </p>
            </div>

            <div className="method-grid">
              {/* E */}
              <div className="method-step rv">
                <div className="step-letter"><span>E</span></div>
                <div className="step-body">
                  <div className="step-tag">Step 1</div>
                  <h3>Establish Your Foundation</h3>
                  <p>Choose the right hosting, install WordPress properly, and configure every core setting from day one. A strong foundation means fewer problems later — no shortcuts, no inherited tech debt. This is where uptime, speed, and security start.</p>
                </div>
              </div>

              {/* N */}
              <div className="method-step rv">
                <div className="step-letter"><span>N</span></div>
                <div className="step-body">
                  <div className="step-tag">Step 2</div>
                  <h3>Nail Your Niche &amp; Message</h3>
                  <p>Before a single pixel is placed, define who you serve, what you offer, and why someone should choose you. Clarity in audience and offer translates directly into clarity on the page — and clarity converts.</p>
                </div>
              </div>

              {/* V */}
              <div className="method-step rv">
                <div className="step-letter"><span>V</span></div>
                <div className="step-body">
                  <div className="step-tag">Step 3</div>
                  <h3>Visualize the User Journey</h3>
                  <p>Map every page, every flow, every click path before building. Wireframe the structure so visitors intuitively find what they need. Great sites don&apos;t confuse — they guide.</p>
                </div>
              </div>

              {/* O */}
              <div className="method-step rv">
                <div className="step-letter"><span>O</span></div>
                <div className="step-body">
                  <div className="step-tag">Step 4</div>
                  <h3>Optimize the Build</h3>
                  <p>Design with performance, mobile responsiveness, and SEO best practices baked into every layer. Lightweight themes, optimized images, semantic HTML, Core Web Vitals — this isn&apos;t polish, it&apos;s architecture.</p>
                </div>
              </div>

              {/* S */}
              <div className="method-step rv">
                <div className="step-letter"><span>S</span></div>
                <div className="step-body">
                  <div className="step-tag">Step 5</div>
                  <h3>Structure for Conversions</h3>
                  <p>Strategic layouts, compelling calls-to-action, trust signals, and social proof — placed exactly where they need to be. Every section has a job. Every element earns its place on the page.</p>
                </div>
              </div>

              {/* T */}
              <div className="method-step rv">
                <div className="step-letter"><span>T</span></div>
                <div className="step-body">
                  <div className="step-tag">Step 6</div>
                  <h3>Traffic-Ready Setup</h3>
                  <p>Analytics, search console, sitemap submission, schema markup, and speed optimization — all configured before launch. When traffic arrives, your site is ready to capture every opportunity.</p>
                </div>
              </div>

              {/* A */}
              <div className="method-step rv">
                <div className="step-letter"><span>A</span></div>
                <div className="step-body">
                  <div className="step-tag">Step 7</div>
                  <h3>Automate &amp; Ascend</h3>
                  <p>Email capture, marketing funnels, automated backups, uptime monitoring, and scaling systems. Your site doesn&apos;t just launch — it grows. This is where presence becomes authority.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why It Works */}
        <section style={{ padding: '0 0 100px' }}>
          <div className="c">
            <div className="sh sh-center rv">
              <span className="sh-tag">Built Different</span>
              <h2>Why the ENVOSTA Method works</h2>
            </div>

            <div className="why-grid">
              <div className="why-card rv">
                <div className="why-icon">&#x1F3AF;</div>
                <h4>Nothing is an afterthought</h4>
                <p>Most agencies bolt on SEO, security, and performance later. The ENVOSTA Method builds them into the foundation from step one — so nothing is patched, everything is planned.</p>
              </div>
              <div className="why-card rv">
                <div className="why-icon">&#x1F501;</div>
                <h4>Repeatable &amp; proven</h4>
                <p>This isn&apos;t a one-off process. It&apos;s a framework refined across hundreds of projects — from local businesses to national brands. Every step has been tested and validated.</p>
              </div>
              <div className="why-card rv">
                <div className="why-icon">&#x1F4C8;</div>
                <h4>Designed to scale</h4>
                <p>The method doesn&apos;t end at launch. Step 7 ensures your site keeps growing with automation, monitoring, and systems that compound over time — turning a website into a business asset.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ZONE B - CTA */}
      <div className="zone-b">
        <section className="cta-section">
          <div className="c">
            <span className="sh-tag rv">Ready to Start?</span>
            <h2 className="rv">
              Apply the ENVOSTA Method<br />
              to your next project
            </h2>
            <p className="rv">
              Whether you&apos;re building from scratch or rebuilding what&apos;s broken — the method is the same. Every Envosta plan includes a personal consultation where we walk through your project step by step.
            </p>
            <div className="cta-btns rv">
              <a href="https://envosta.com/pricing" className="bp lg">Compare Plans</a>
              <a href="https://envosta.com/support" className="bp ghost lg">Talk to Sales</a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
