'use client';

import { useEffect, useRef } from 'react';

export function ArchitectureCards() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const cards = wrap.querySelectorAll<HTMLElement>('.arch-card');
    const conns = wrap.querySelectorAll<HTMLElement>('.arch-card-conn');
    let fired = false;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !fired) {
          fired = true;
          for (let i = 0; i < cards.length; i++) {
            ((idx) => {
              setTimeout(() => {
                cards[idx].classList.add('visible');
              }, idx * 180);
            })(i);
          }
          for (let j = 0; j < conns.length; j++) {
            ((idx) => {
              setTimeout(() => {
                conns[idx].classList.add('visible');
              }, idx * 180 + 120);
            })(j);
          }
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(wrap);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="arch-cards" ref={wrapRef}>
      <div className="arch-card acard-1">
        <div className="arch-card-glow" />
        <div className="arch-card-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <div className="arch-card-text">
          <h3>wp.cloud</h3>
          <p>Enterprise hosting infrastructure. The foundation everything runs on.</p>
        </div>
        <div className="arch-card-num">01</div>
      </div>

      <div className="arch-card-conn acc-1">
        <div className="arch-card-conn-pulse" />
      </div>

      <div className="arch-card acard-2">
        <div className="arch-card-glow" />
        <div className="arch-card-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
          </svg>
        </div>
        <div className="arch-card-text">
          <h3>WordPress Core</h3>
          <p>The world&apos;s most trusted CMS. Powering 43% of the web.</p>
        </div>
        <div className="arch-card-num">02</div>
      </div>

      <div className="arch-card-conn acc-2">
        <div className="arch-card-conn-pulse" />
      </div>

      <div className="arch-card acard-3">
        <div className="arch-card-glow" />
        <div className="arch-card-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </div>
        <div className="arch-card-text">
          <h3>Plugins &amp; Integrations</h3>
          <p>Payments, forms, analytics, email — configured during onboarding.</p>
        </div>
        <div className="arch-card-num">03</div>
      </div>

      <div className="arch-card-conn acc-3">
        <div className="arch-card-conn-pulse" />
      </div>

      <div className="arch-card acard-4">
        <div className="arch-card-glow" />
        <div className="arch-card-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <div className="arch-card-text">
          <h3>Custom Theme</h3>
          <p>Designed from scratch for your brand. No templates, no bloat.</p>
        </div>
        <div className="arch-card-num">04</div>
      </div>

      <div className="arch-card-conn acc-4">
        <div className="arch-card-conn-pulse" />
      </div>

      <div className="arch-card acard-5">
        <div className="arch-card-glow" />
        <div className="arch-card-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div className="arch-card-text">
          <h3>Your Content</h3>
          <p>Your words, your images, your business — ready to grow.</p>
        </div>
        <div className="arch-card-num">05</div>
      </div>
    </div>
  );
}
