'use client';

import { useEffect, useRef } from 'react';

export function GutenbergAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const L = 14500;
    const $ = (id: string) => document.getElementById(id);
    const vp = container.querySelector<HTMLElement>('.ge2 .viewport');
    let T: ReturnType<typeof setTimeout>[] = [];
    let ti: ReturnType<typeof setInterval> | null = null;
    let mainInterval: ReturnType<typeof setInterval> | null = null;
    const SC = 0.78;

    function fl(e: HTMLElement | null, d = 250) {
      if (!e) return;
      e.style.transition = 'background .1s,transform .1s,color .1s';
      e.style.background = 'var(--blue)';
      e.style.color = '#fff';
      e.style.transform = 'scale(.9)';
      setTimeout(() => {
        e.style.background = '';
        e.style.color = '';
        e.style.transform = '';
      }, d);
    }

    function flSoft(e: HTMLElement | null, d = 200) {
      if (!e) return;
      e.style.transition = 'background .1s';
      e.style.background = 'rgba(0,113,227,.15)';
      setTimeout(() => {
        e.style.background = '';
      }, d);
    }

    function ps(t: HTMLElement | null, l: string) {
      if (!t || !vp) return;
      const v = vp.getBoundingClientRect();
      const r = t.getBoundingClientRect();
      const p = 8;
      const s = $('sl');
      if (!s) return;
      s.style.top = ((r.top - v.top) / SC - p) + 'px';
      s.style.left = ((r.left - v.left) / SC - p) + 'px';
      s.style.width = (r.width / SC + p * 2) + 'px';
      s.style.height = (r.height / SC + p * 2) + 'px';
      const st = $('st');
      if (st) st.textContent = l;
      s.classList.add('visible');
    }

    function hs() {
      $('sl')?.classList.remove('visible');
    }

    function tt(e: HTMLElement | null, tx: string, sp: number, cb?: () => void) {
      if (!e) return;
      let i = 0;
      e.innerHTML = '<span class="cursor"></span>';
      ti = setInterval(() => {
        if (i < tx.length) {
          e.innerHTML = tx.slice(0, i + 1) + '<span class="cursor"></span>';
          i++;
          ps(e, 'Button');
        } else {
          if (ti) { clearInterval(ti); ti = null; }
          if (cb) cb();
        }
      }, sp);
    }

    function s(fn: () => void, ms: number) {
      T.push(setTimeout(fn, ms));
    }

    function run() {
      T.forEach(clearTimeout);
      T = [];
      if (ti) { clearInterval(ti); ti = null; }
      $('dm')?.classList.remove('visible');
      $('dm')?.classList.remove('fade-out');
      $('bm')?.classList.remove('visible');
      $('bm')?.classList.remove('fade-out');
      hs();
      $('iw')?.classList.remove('visible');
      const ib = $('ib');
      if (ib) ib.innerHTML = '';
      $('liveToast')?.classList.remove('visible');
      container.querySelectorAll('.doc-item,.blk-item').forEach((x) => x.classList.remove('selected'));

      // Reset badge to draft
      const badge = $('badge');
      if (badge) {
        badge.className = 'status-badge draft';
        badge.textContent = 'Draft';
      }

      // 0.5s: Hamburger clicks
      s(() => fl($('hb')), 500);
      // 1s: Doc Overview slides up
      s(() => $('dm')?.classList.add('visible'), 1000);
      // 2s: Hero item selected
      s(() => { $('dh')?.classList.add('selected'); flSoft($('dh')); }, 2000);
      // 2.5s: Selector on hero
      s(() => ps($('hs'), 'Hero Section'), 2500);
      // 3.8s: + button clicks
      s(() => fl($('pb')), 3800);
      // 4.8s: Doc out (fade only)
      s(() => { $('dm')?.classList.add('fade-out'); }, 4800);
      // 5.3s: Blocks in
      s(() => $('bm')?.classList.add('visible'), 5300);
      // 6.3s: Button block selected
      s(() => { $('bb')?.classList.add('selected'); flSoft($('bb')); }, 6300);
      // 7.2s: Button appears on site
      s(() => {
        $('iw')?.classList.add('visible');
        const ibEl = $('ib');
        if (ibEl) ibEl.innerHTML = '<span class="cursor"></span>';
        setTimeout(() => ps($('ib'), 'Button'), 300);
      }, 7200);
      // 7.7s: Type "Get Started"
      s(() => tt($('ib'), 'Get Started', 80, () => setTimeout(() => {
        const ibEl = $('ib');
        if (ibEl) ibEl.innerHTML = 'Get Started';
        ps($('ib'), 'Button');
      }, 500)), 7700);
      // 9.2s: Blocks panel fades out
      s(() => { $('bm')?.classList.add('fade-out'); }, 9200);
      // 9.7s: Publish button clicks
      s(() => {
        const sv = $('saveBtn');
        if (!sv) return;
        sv.style.transition = 'transform .1s,box-shadow .1s';
        sv.style.transform = 'scale(.92)';
        sv.style.boxShadow = 'inset 0 2px 6px rgba(0,0,0,.3)';
        setTimeout(() => {
          sv.style.transform = 'scale(1.03)';
          sv.style.boxShadow = '0 0 0 4px var(--blue-glow)';
        }, 150);
        setTimeout(() => {
          sv.style.transform = '';
          sv.style.boxShadow = '';
        }, 400);
      }, 9700);
      // 10.2s: Badge changes to Published
      s(() => {
        if (!badge) return;
        badge.style.transform = 'scale(1.2)';
        setTimeout(() => {
          badge.className = 'status-badge published';
          badge.textContent = 'Published';
          badge.style.transform = 'scale(1)';
        }, 200);
      }, 10200);
      // 10.5s: Hide selector
      s(() => hs(), 10500);
      // 11s: Live toast appears
      s(() => $('liveToast')?.classList.add('visible'), 11000);
      // 13s: Delete button from site
      s(() => $('iw')?.classList.remove('visible'), 13000);
      // 13.2s: Clean
      s(() => { const ibEl = $('ib'); if (ibEl) ibEl.innerHTML = ''; }, 13200);
      // 13.5s: Revert badge to draft
      s(() => {
        if (!badge) return;
        badge.className = 'status-badge draft';
        badge.textContent = 'Draft';
      }, 13500);
      // 13.8s: Hide live toast
      s(() => $('liveToast')?.classList.remove('visible'), 13800);
    }

    const initTimeout = setTimeout(() => {
      run();
      mainInterval = setInterval(run, L);
    }, 3200);

    return () => {
      clearTimeout(initTimeout);
      T.forEach(clearTimeout);
      if (ti) clearInterval(ti);
      if (mainInterval) clearInterval(mainInterval);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="rv ge-wrap"
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '20px',
        height: '780px',
        margin: '0 -16px',
      }}
    >
      {/* Gradient color splashes */}
      <div
        style={{
          position: 'absolute',
          top: '-30%',
          left: '-20%',
          width: '80%',
          height: '90%',
          background: 'radial-gradient(ellipse,rgba(56,120,255,.28),transparent 50%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-25%',
          right: '-15%',
          width: '75%',
          height: '80%',
          background: 'radial-gradient(ellipse,rgba(160,80,255,.22),transparent 50%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '45%',
          width: '55%',
          height: '55%',
          background: 'radial-gradient(ellipse,rgba(37,99,235,.14),transparent 50%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '55%',
          left: '5%',
          width: '50%',
          height: '50%',
          background: 'radial-gradient(ellipse,rgba(120,60,230,.12),transparent 50%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '0%',
          right: '20%',
          width: '40%',
          height: '45%',
          background: 'radial-gradient(ellipse,rgba(80,160,255,.08),transparent 55%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="ge2-scale"
        style={{
          transform: 'scale(0.78)',
          transformOrigin: 'bottom center',
          width: '1320px',
          height: '860px',
          position: 'absolute',
          bottom: '-10px',
          left: '50%',
          marginLeft: '-660px',
          opacity: 0,
          animation: 'ge-contentSlideUp 1.2s cubic-bezier(.22,1,.36,1) .2s forwards',
        }}
      >
        <div className="ge2">
          <div className="stage">
            <div className="glow" />

            {/* Browser */}
            <div className="browser">
              <div className="browser-bar">
                <div style={{ display: 'flex', gap: '7px' }}>
                  <div className="tl tl-r" />
                  <div className="tl tl-y" />
                  <div className="tl tl-g" />
                </div>
                <div className="addr">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  builder.envosta.com
                </div>
              </div>
              <div className="gb-toolbar">
                <div className="gb-btn" id="hb">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </div>
                <div className="gb-btn" id="pb">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
                <div className="gb-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M9 14L4 9l5-5" />
                  </svg>
                </div>
                <div className="gb-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M15 14l5-5-5-5" />
                  </svg>
                </div>
                <div className="gb-spacer" />
                <div className="status-badge" id="badge">
                  Draft
                </div>
                <button className="gb-save" id="saveBtn">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Publish
                </button>
              </div>
              <div className="viewport">
                <div className="site-canvas">
                  <nav className="s-nav">
                    <div className="s-brand">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="12" y="1" width="15.56" height="15.56" rx="3" transform="rotate(45 12 1)" stroke="#0071e3" strokeWidth="2" />
                        <rect x="12" y="7.5" width="6.36" height="6.36" rx="1" transform="rotate(45 12 7.5)" fill="#0071e3" />
                      </svg>
                      Envosta Studio
                    </div>
                    <div className="s-links">
                      <span>Home</span>
                      <span>Services</span>
                      <span>Work</span>
                      <span>Contact</span>
                    </div>
                  </nav>
                  <div className="s-hero" id="hs">
                    <div className="s-pill">Digital Studio</div>
                    <h2>Building Products People Remember.</h2>
                    <p>
                      The only platform helping ambitious brands define, design, and ship world class
                      products.
                    </p>
                    <div className="cta-row">
                      <div className="injected-btn-wrap" id="iw">
                        <button className="injected-btn" id="ib" aria-label="Get Started" />
                      </div>
                    </div>
                  </div>
                  <div className="s-features" id="fs">
                    <div className="s-features-title">What We Do</div>
                    <h3>End-to-end, from strategy to launch.</h3>
                    <p>We align with your team to move fast, stay creative, and deliver work that holds up.</p>
                    <div className="feat-grid">
                      <div className="feat-card">
                        <div className="feat-icon">&#x25C6;</div>
                        <div className="feat-name">Strategy</div>
                        <div className="feat-desc">Research, positioning, and product roadmapping.</div>
                      </div>
                      <div className="feat-card">
                        <div className="feat-icon">&#x2726;</div>
                        <div className="feat-name">Design</div>
                        <div className="feat-desc">Brand identity, UI/UX, and design systems.</div>
                      </div>
                      <div className="feat-card">
                        <div className="feat-icon">&#x26A1;</div>
                        <div className="feat-name">Engineering</div>
                        <div className="feat-desc">Frontend, backend, and infrastructure.</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="sel" id="sl">
                  <div className="sel-tag" id="st">Hero Section</div>
                </div>
              </div>
            </div>

            {/* Document Overview Modal */}
            <div className="float-modal" id="dm">
              <div className="fm-header">
                <div className="fm-title">List View</div>
                <div className="fm-close">&#x2715;</div>
              </div>
              <div className="fm-tabs">
                <div className="fm-tab active">List View</div>
                <div className="fm-tab">Outline</div>
              </div>
              <div className="fm-body">
                {/* Navigation */}
                <div className="doc-item">
                  <div className="doc-arrow">&#x25B8;</div>
                  <div className="doc-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </div>
                  Navigation
                </div>

                {/* Group: Hero */}
                <div className="doc-item" id="dh">
                  <div className="doc-arrow">&#x25BE;</div>
                  <div className="doc-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                    </svg>
                  </div>
                  Group — Hero
                </div>
                <div className="doc-item child">
                  <div className="doc-arrow" />
                  <div className="doc-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M4 7V4h16v3" />
                      <path d="M12 4v10" />
                      <path d="M4 20h16" />
                    </svg>
                  </div>
                  Heading
                </div>
                <div className="doc-item child">
                  <div className="doc-arrow" />
                  <div className="doc-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M4 7V4h16v3" />
                      <path d="M9 20h6" />
                      <path d="M12 4v16" />
                    </svg>
                  </div>
                  Paragraph
                </div>

                <div className="doc-sep" />

                {/* Group: Features */}
                <div className="doc-item">
                  <div className="doc-arrow">&#x25BE;</div>
                  <div className="doc-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                    </svg>
                  </div>
                  Group — Features
                </div>
                <div className="doc-item child">
                  <div className="doc-arrow" />
                  <div className="doc-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M4 7V4h16v3" />
                      <path d="M12 4v10" />
                      <path d="M4 20h16" />
                    </svg>
                  </div>
                  Heading
                </div>
                <div className="doc-item child">
                  <div className="doc-arrow" />
                  <div className="doc-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M4 7V4h16v3" />
                      <path d="M9 20h6" />
                      <path d="M12 4v16" />
                    </svg>
                  </div>
                  Paragraph
                </div>
                <div className="doc-item child">
                  <div className="doc-arrow">&#x25B8;</div>
                  <div className="doc-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                    </svg>
                  </div>
                  Columns (3)
                </div>

                <div className="doc-sep" />

                {/* Footer */}
                <div className="doc-item">
                  <div className="doc-arrow">&#x25B8;</div>
                  <div className="doc-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                    </svg>
                  </div>
                  Group — Footer
                </div>
              </div>
            </div>

            {/* Add Block Modal */}
            <div className="float-modal" id="bm">
              <div className="fm-header">
                <div className="fm-title">Add Block</div>
                <div className="fm-close">&#x2715;</div>
              </div>
              <div className="fm-tabs">
                <div className="fm-tab active">Blocks</div>
                <div className="fm-tab">Patterns</div>
                <div className="fm-tab">Media</div>
              </div>
              <div className="fm-body">
                <input className="blk-search" type="text" placeholder="Search" readOnly />
                <div className="blk-label">Common</div>
                <div className="blk-grid">
                  <div className="blk-item">
                    <div className="blk-item-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M4 7V4h16v3" />
                        <path d="M9 20h6" />
                        <path d="M12 4v16" />
                      </svg>
                    </div>
                    <div className="blk-item-name">Paragraph</div>
                  </div>
                  <div className="blk-item">
                    <div className="blk-item-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M4 7V4h16v3" />
                        <path d="M12 4v10" />
                        <path d="M4 20h16" />
                      </svg>
                    </div>
                    <div className="blk-item-name">Heading</div>
                  </div>
                  <div className="blk-item">
                    <div className="blk-item-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                        <path d="M8 12h8M12 8v8" />
                      </svg>
                    </div>
                    <div className="blk-item-name">Image</div>
                  </div>
                  <div className="blk-item" id="bb">
                    <div className="blk-item-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <rect x="3" y="7" width="18" height="10" rx="5" />
                        <path d="M8 12h8" />
                      </svg>
                    </div>
                    <div className="blk-item-name">Button</div>
                  </div>
                  <div className="blk-item">
                    <div className="blk-item-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M8 6h13M8 12h13M8 18h13" />
                        <circle cx="4" cy="6" r="1" fill="currentColor" />
                        <circle cx="4" cy="12" r="1" fill="currentColor" />
                        <circle cx="4" cy="18" r="1" fill="currentColor" />
                      </svg>
                    </div>
                    <div className="blk-item-name">List</div>
                  </div>
                  <div className="blk-item">
                    <div className="blk-item-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 17h3l2-4V7H5v6h3l-2 4zm9 0h3l2-4V7h-6v6h3l-2 4z" />
                      </svg>
                    </div>
                    <div className="blk-item-name">Quote</div>
                  </div>
                  <div className="blk-item">
                    <div className="blk-item-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                      </svg>
                    </div>
                    <div className="blk-item-name">Code</div>
                  </div>
                  <div className="blk-item">
                    <div className="blk-item-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
                      </svg>
                    </div>
                    <div className="blk-item-name">Table</div>
                  </div>
                  <div className="blk-item">
                    <div className="blk-item-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <rect x="2" y="4" width="20" height="16" rx="2.5" />
                        <path d="M6 9h12M6 13h8M6 17h10" />
                      </svg>
                    </div>
                    <div className="blk-item-name">Classic</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Toast */}
            <div className="live-toast" id="liveToast">
              <div className="live-toast-dot" />
              <div>
                <div className="live-toast-text">Live</div>
                <div className="live-toast-sub">Your changes are published</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
