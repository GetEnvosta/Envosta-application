'use client';

import { useEffect } from 'react';

export default function MethodPage() {
  useEffect(() => {
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

      {/* CTA — dark theme */}
      <div className="zone-a" style={{ marginTop: 0, borderRadius: 0, borderTop: 'none', paddingTop: 0 }}>
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
              <a href="/get-started" className="bp lg">Get Started</a>
              <a href="/support" className="bp ghost lg">Talk to Sales</a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
