'use client';

import { useEffect, useRef } from 'react';

export default function LighthouseScores() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    let fired = false;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || fired) return;
        fired = true;

        // Animate rings
        const rings = wrap.querySelectorAll<HTMLElement>('.lh-ring-fill');
        rings.forEach((r) => {
          const offset = parseInt(r.getAttribute('data-offset') || '0');
          setTimeout(() => {
            r.style.transition = 'stroke-dashoffset 1.8s cubic-bezier(.22,1,.36,1)';
            r.style.strokeDashoffset = String(offset);
          }, 300);
        });

        // Show values
        const vals = wrap.querySelectorAll<HTMLElement>('.lh-ring-val');
        vals.forEach((v) => {
          setTimeout(() => {
            v.style.transition = 'opacity .5s ease';
            v.style.opacity = '1';
          }, 1000);
        });

        // Detail rows
        const rows = wrap.querySelectorAll<HTMLElement>('.lh-detail-row');
        rows.forEach((r, i) => {
          setTimeout(() => {
            r.style.transition = 'opacity .4s ease,transform .4s ease';
            r.style.opacity = '1';
            r.style.transform = 'translateY(0)';
          }, 1400 + i * 100);
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(wrap);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div id="lh-visual" className="zc-panel" ref={wrapRef}>
      <div className="zc-panel-glow" style={{ left: '-10%' }} />

      {/* URL bar */}
      <div className="lh-url-bar">
        <div style={{ color: '#22c55e', fontSize: '.6rem' }}>&#x1f512;</div>
        <span>yourbusiness.com — Lighthouse Report</span>
      </div>

      {/* Score rings grid */}
      <div className="lh-scores">
        <div className="lh-score">
          <div className="lh-ring-wrap">
            <svg viewBox="0 0 72 72" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="5" />
              <circle
                cx="36"
                cy="36"
                r="30"
                fill="none"
                stroke="#22c55e"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="188.5"
                strokeDashoffset="188.5"
                className="lh-ring-fill"
                data-offset="4"
              />
            </svg>
            <div className="lh-ring-val">98</div>
          </div>
          <div className="lh-ring-label">Performance</div>
        </div>

        <div className="lh-score">
          <div className="lh-ring-wrap">
            <svg viewBox="0 0 72 72" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="5" />
              <circle
                cx="36"
                cy="36"
                r="30"
                fill="none"
                stroke="#22c55e"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="188.5"
                strokeDashoffset="188.5"
                className="lh-ring-fill"
                data-offset="0"
              />
            </svg>
            <div className="lh-ring-val">100</div>
          </div>
          <div className="lh-ring-label">Accessibility</div>
        </div>

        <div className="lh-score">
          <div className="lh-ring-wrap">
            <svg viewBox="0 0 72 72" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="5" />
              <circle
                cx="36"
                cy="36"
                r="30"
                fill="none"
                stroke="#22c55e"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="188.5"
                strokeDashoffset="188.5"
                className="lh-ring-fill"
                data-offset="0"
              />
            </svg>
            <div className="lh-ring-val">100</div>
          </div>
          <div className="lh-ring-label">Best Practices</div>
        </div>

        <div className="lh-score">
          <div className="lh-ring-wrap">
            <svg viewBox="0 0 72 72" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="5" />
              <circle
                cx="36"
                cy="36"
                r="30"
                fill="none"
                stroke="#22c55e"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="188.5"
                strokeDashoffset="188.5"
                className="lh-ring-fill"
                data-offset="6"
              />
            </svg>
            <div className="lh-ring-val">97</div>
          </div>
          <div className="lh-ring-label">SEO</div>
        </div>
      </div>

      {/* Core Web Vitals detail rows */}
      <div className="lh-details">
        <div className="lh-detail-row">
          <div className="lh-detail-icon">&#x2713;</div>
          <div className="lh-detail-name">First Contentful Paint</div>
          <div className="lh-detail-val">0.4s</div>
        </div>
        <div className="lh-detail-row">
          <div className="lh-detail-icon">&#x2713;</div>
          <div className="lh-detail-name">Largest Contentful Paint</div>
          <div className="lh-detail-val">0.8s</div>
        </div>
        <div className="lh-detail-row">
          <div className="lh-detail-icon">&#x2713;</div>
          <div className="lh-detail-name">Cumulative Layout Shift</div>
          <div className="lh-detail-val">0.01</div>
        </div>
        <div className="lh-detail-row">
          <div className="lh-detail-icon">&#x2713;</div>
          <div className="lh-detail-name">Total Blocking Time</div>
          <div className="lh-detail-val">12ms</div>
        </div>
      </div>
    </div>
  );
}
