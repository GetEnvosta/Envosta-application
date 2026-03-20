'use client';

import { useEffect, useRef } from 'react';

export function SerpAnimation() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const query = 'best professional services near me';
    const typed = wrap.querySelector<HTMLElement>('#serp-typed');
    let charIdx = 0;
    let fired = false;
    let typeInt: ReturnType<typeof setInterval> | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || fired) return;
        fired = true;

        typeInt = setInterval(() => {
          if (typed && charIdx < query.length) {
            typed.textContent += query[charIdx];
            charIdx++;
          } else {
            if (typeInt) clearInterval(typeInt);
            typeInt = null;
            showResults();
          }
        }, 45);

        function showResults() {
          function reveal(id: string, delay: number) {
            setTimeout(() => {
              const el = wrap!.querySelector<HTMLElement>(`#${id}`);
              if (el) {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
                el.style.transition = 'opacity .6s ease,transform .6s ease';
              }
            }, delay);
          }
          reveal('serp-meta', 300);
          reveal('serp-r1', 500);
          reveal('serp-schema', 1200);
          reveal('serp-sitelinks', 1600);
          reveal('serp-r2', 2000);
          reveal('serp-r3', 2300);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(wrap);

    return () => {
      observer.disconnect();
      if (typeInt) clearInterval(typeInt);
    };
  }, []);

  return (
    <div className="serp-wrap" id="serp-wrap" ref={wrapRef}>
      <div className="zc-panel-glow" style={{ right: '-10%' }} />

      <div className="serp-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <div style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.6)', fontWeight: 400 }}>
          <span id="serp-typed" />
          <span
            style={{
              borderRight: '2px solid rgba(255,255,255,.4)',
              animation: 'serpBlink .8s step-end infinite',
              paddingRight: '1px',
            }}
          />
        </div>
      </div>

      <div
        id="serp-meta"
        style={{
          fontSize: '.62rem',
          color: 'rgba(255,255,255,.15)',
          marginBottom: '16px',
          fontWeight: 300,
          opacity: 0,
        }}
      >
        About 2,450,000 results (0.34 seconds)
      </div>

      {/* Result 1 — YOUR SITE */}
      <div
        id="serp-r1"
        style={{
          padding: '14px 0',
          borderBottom: '1px solid rgba(255,255,255,.04)',
          opacity: 0,
          transform: 'translateY(14px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
          <div
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: 'rgba(37,99,235,.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '.65rem', color: 'rgba(255,255,255,.3)', fontWeight: 300 }}>
              yourbusiness.com
            </div>
          </div>
        </div>
        <div
          style={{
            fontSize: '.92rem',
            fontWeight: 500,
            color: '#93c5fd',
            marginBottom: '5px',
            letterSpacing: '-.2px',
          }}
        >
          Your Business — Professional Services{' '}
          <span
            style={{
              display: 'inline-flex',
              padding: '2px 8px',
              background: 'rgba(34,197,94,.08)',
              border: '1px solid rgba(34,197,94,.12)',
              borderRadius: '100px',
              fontSize: '.52rem',
              color: '#86efac',
              fontWeight: 500,
              marginLeft: '4px',
              verticalAlign: 'middle',
            }}
          >
            #1
          </span>
        </div>
        <div
          style={{
            fontSize: '.72rem',
            color: 'rgba(255,255,255,.35)',
            fontWeight: 300,
            lineHeight: 1.5,
          }}
        >
          Award-winning services tailored to your needs. Trusted by 500+ clients.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px' }}>
          <div style={{ color: '#f59e0b', fontSize: '.62rem', letterSpacing: '1px' }}>★★★★★</div>
          <div style={{ fontSize: '.55rem', color: 'rgba(255,255,255,.2)' }}>4.9 · 127 reviews</div>
        </div>

        <div
          id="serp-schema"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            marginTop: '8px',
            padding: '4px 10px',
            background: 'rgba(34,197,94,.06)',
            border: '1px solid rgba(34,197,94,.1)',
            borderRadius: '100px',
            opacity: 0,
          }}
        >
          <div
            style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#22c55e' }}
          />
          <div style={{ fontSize: '.55rem', color: '#86efac', fontWeight: 400 }}>
            Rich snippets active
          </div>
        </div>

        <div
          id="serp-sitelinks"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            marginTop: '10px',
            opacity: 0,
          }}
        >
          <div
            style={{
              padding: '8px 10px',
              background: 'rgba(255,255,255,.02)',
              border: '1px solid rgba(255,255,255,.04)',
              borderRadius: '8px',
            }}
          >
            <div style={{ fontSize: '.68rem', color: '#93c5fd', fontWeight: 400 }}>About Us</div>
          </div>
          <div
            style={{
              padding: '8px 10px',
              background: 'rgba(255,255,255,.02)',
              border: '1px solid rgba(255,255,255,.04)',
              borderRadius: '8px',
            }}
          >
            <div style={{ fontSize: '.68rem', color: '#93c5fd', fontWeight: 400 }}>Services</div>
          </div>
          <div
            style={{
              padding: '8px 10px',
              background: 'rgba(255,255,255,.02)',
              border: '1px solid rgba(255,255,255,.04)',
              borderRadius: '8px',
            }}
          >
            <div style={{ fontSize: '.68rem', color: '#93c5fd', fontWeight: 400 }}>Portfolio</div>
          </div>
          <div
            style={{
              padding: '8px 10px',
              background: 'rgba(255,255,255,.02)',
              border: '1px solid rgba(255,255,255,.04)',
              borderRadius: '8px',
            }}
          >
            <div style={{ fontSize: '.68rem', color: '#93c5fd', fontWeight: 400 }}>Contact</div>
          </div>
        </div>
      </div>

      {/* Competitor results (dimmed) */}
      <div
        id="serp-r2"
        style={{
          padding: '14px 0',
          borderBottom: '1px solid rgba(255,255,255,.03)',
          opacity: 0,
          transform: 'translateY(14px)',
        }}
      >
        <div style={{ fontSize: '.65rem', color: 'rgba(255,255,255,.15)', marginBottom: '4px' }}>
          competitor-one.com
        </div>
        <div style={{ fontSize: '.82rem', color: 'rgba(147,197,253,.3)', marginBottom: '3px' }}>
          Competitor One — Services
        </div>
        <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.15)', fontWeight: 300 }}>
          Generic description about services...
        </div>
      </div>
      <div
        id="serp-r3"
        style={{ padding: '14px 0', opacity: 0, transform: 'translateY(14px)' }}
      >
        <div style={{ fontSize: '.65rem', color: 'rgba(255,255,255,.15)', marginBottom: '4px' }}>
          another-business.com
        </div>
        <div style={{ fontSize: '.82rem', color: 'rgba(147,197,253,.3)', marginBottom: '3px' }}>
          Another Business — Services &amp; More
        </div>
        <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.15)', fontWeight: 300 }}>
          Another listing without rich snippets...
        </div>
      </div>
    </div>
  );
}
