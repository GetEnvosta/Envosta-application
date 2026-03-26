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
      <style>{`
        /* ── Studio CSS variables ── */
        :root{--vip:#c9a45c;--vip-dim:rgba(201,164,92,.1);--vip-bright:#d4b06a}

        /* ── Scroll reveal ── */
        .rv{opacity:0;transform:translateY(30px);transition:opacity .7s,transform .7s}
        .rv.v{opacity:1;transform:none}

        /* ── Shared check SVG ── */
        .ck{width:16px;height:16px;flex-shrink:0;color:var(--grn)}

        /* ═══ STUDIO HERO ═══ */
        .vip-hero{padding:160px 0 80px;text-align:center;position:relative;overflow:hidden}
        .vip-hero::before{content:'';position:absolute;top:-40%;left:50%;transform:translateX(-50%);width:900px;height:900px;background:radial-gradient(circle,rgba(201,164,92,.1),transparent 60%);pointer-events:none}
        .vip-hero::after{content:'';position:absolute;bottom:-30%;left:50%;transform:translateX(-50%);width:700px;height:700px;background:radial-gradient(circle,rgba(37,99,235,.08),transparent 60%);pointer-events:none}
        .vip-hero .c{position:relative;z-index:1}
        .vip-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(201,164,92,.08);border:1px solid rgba(201,164,92,.2);border-radius:100px;padding:8px 20px 8px 14px;font-size:.72rem;font-weight:500;letter-spacing:1.5px;text-transform:uppercase;color:var(--vip);margin-bottom:28px}
        .vip-badge-diamond{width:16px;height:16px}
        .vip-hero h1{font-size:clamp(2.6rem,5.5vw,4.2rem);font-weight:600;letter-spacing:-1.5px;line-height:1.08;margin-bottom:24px}
        .vip-hero h1 em{font-style:normal;background:linear-gradient(135deg,var(--vip),var(--vip-bright));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .vip-hero p{font-size:1.08rem;color:var(--t2);max-width:580px;margin:0 auto 44px;line-height:1.8;font-weight:300}
        .hero-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}

        /* ── Floating trust strip ── */
        .vip-trust{display:flex;align-items:center;justify-content:center;gap:32px;margin-top:56px;flex-wrap:wrap}
        .vip-trust-item{display:flex;align-items:center;gap:8px;font-size:.78rem;color:var(--t3);font-weight:400}
        .vip-trust-item svg{width:16px;height:16px;color:var(--vip);flex-shrink:0}

        /* ═══ WHAT MAKES STUDIO DIFFERENT ═══ */
        .vip-diff{padding:100px 0}
        .vip-diff-header{text-align:center;margin-bottom:64px}
        .vip-diff-header .sh-tag{display:inline-block;font-size:.72rem;font-weight:500;text-transform:uppercase;letter-spacing:3px;color:var(--vip);margin-bottom:10px}
        .vip-diff-header h2{font-size:clamp(1.8rem,3.5vw,2.8rem);font-weight:500;letter-spacing:-1px;line-height:1.15;margin-bottom:14px}
        .vip-diff-header p{font-size:.95rem;color:var(--t2);font-weight:300;max-width:560px;margin:0 auto;line-height:1.75}

        .vip-diff-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
        .vip-diff-card{background:var(--card);border:1px solid var(--bdr);border-radius:20px;padding:36px 28px;transition:all .3s;position:relative;overflow:hidden}
        .vip-diff-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(201,164,92,.4),transparent);opacity:0;transition:opacity .3s}
        .vip-diff-card:hover{border-color:rgba(201,164,92,.2);transform:translateY(-3px)}
        .vip-diff-card:hover::before{opacity:1}
        .vip-diff-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:20px}
        .vip-diff-icon svg{width:22px;height:22px}
        .vip-diff-icon.gold{background:rgba(201,164,92,.1);border:1px solid rgba(201,164,92,.18);color:var(--vip)}
        .vip-diff-icon.blue{background:rgba(37,99,235,.1);border:1px solid rgba(37,99,235,.18);color:var(--gold)}
        .vip-diff-icon.green{background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.18);color:var(--grn)}
        .vip-diff-icon.purple{background:rgba(159,122,234,.1);border:1px solid rgba(159,122,234,.18);color:#9f7aea}
        .vip-diff-icon.teal{background:rgba(56,178,172,.1);border:1px solid rgba(56,178,172,.18);color:#38b2ac}
        .vip-diff-icon.red{background:rgba(252,129,129,.1);border:1px solid rgba(252,129,129,.15);color:#fc8181}
        .vip-diff-card h4{font-size:.95rem;font-weight:500;margin-bottom:8px;color:var(--t1)}
        .vip-diff-card p{font-size:.82rem;color:var(--t2);line-height:1.7;font-weight:300}

        /* ═══ CONCIERGE EXPERIENCE ═══ */
        .vip-mega{padding:0 0 100px}
        .mega-feat{background:var(--card);border:1px solid var(--bdr);border-radius:20px;padding:48px;margin-bottom:32px;overflow:hidden;transition:border-color .3s}
        .mega-feat:hover{border-color:var(--bdr2)}
        .mega-feat.vip-accent{border-color:rgba(201,164,92,.15);background:linear-gradient(180deg,rgba(201,164,92,.03),var(--card) 50%)}
        .mega-inner{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
        .mega-text .sh-tag{display:inline-block;font-size:.72rem;font-weight:500;text-transform:uppercase;letter-spacing:3px;color:var(--vip);margin-bottom:10px}
        .mega-text h3{font-size:1.6rem;font-weight:500;letter-spacing:-.5px;margin-bottom:16px}
        .mega-text p{font-size:.88rem;color:var(--t2);line-height:1.7;font-weight:300;margin-bottom:24px}
        .mega-tags{display:flex;flex-wrap:wrap;gap:8px}
        .mega-tags span{display:inline-block;padding:6px 14px;background:var(--card2);border:1px solid var(--bdr);border-radius:100px;font-size:.72rem;color:var(--t2);font-weight:400}

        /* ── Concierge chat illustration ── */
        .concierge-vis{background:var(--bg2);border:1px solid var(--bdr);border-radius:16px;padding:24px;min-height:320px;position:relative;overflow:hidden}
        .concierge-vis::before{content:'';position:absolute;top:-20%;right:-15%;width:200px;height:200px;background:radial-gradient(circle,rgba(201,164,92,.06),transparent 60%);pointer-events:none}
        .cc-header{display:flex;align-items:center;gap:10px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--bdr)}
        .cc-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--vip),var(--vip-bright));display:flex;align-items:center;justify-content:center;font-size:.6rem;font-weight:700;color:var(--bg)}
        .cc-name{font-size:.78rem;font-weight:500;color:var(--t1)}
        .cc-role{font-size:.65rem;color:var(--vip);font-weight:400}
        .cc-status{margin-left:auto;display:flex;align-items:center;gap:5px;font-size:.65rem;color:var(--grn);font-weight:400}
        .cc-dot{width:6px;height:6px;border-radius:50%;background:var(--grn);animation:dotPulse 2s ease-in-out infinite}
        @keyframes dotPulse{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}
        .cc-msgs{display:flex;flex-direction:column;gap:10px}
        .cc-msg{max-width:78%;padding:10px 14px;border-radius:12px;font-size:.72rem;line-height:1.6;font-weight:300;animation:msgFade .5s ease both}
        .cc-msg.them{background:var(--card);border:1px solid var(--bdr);color:var(--t2);align-self:flex-start;border-bottom-left-radius:4px}
        .cc-msg.me{background:rgba(201,164,92,.1);border:1px solid rgba(201,164,92,.15);color:var(--vip-bright);align-self:flex-end;border-bottom-right-radius:4px}
        .cc-msg:nth-child(2){animation-delay:.2s}
        .cc-msg:nth-child(3){animation-delay:.4s}
        .cc-msg:nth-child(4){animation-delay:.6s}
        @keyframes msgFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

        /* ── Timeline illustration ── */
        .timeline-vis{background:var(--bg2);border:1px solid var(--bdr);border-radius:16px;padding:28px 24px;min-height:320px}
        .tl-item{display:flex;gap:16px;margin-bottom:20px;position:relative}
        .tl-item:last-child{margin-bottom:0}
        .tl-line{position:relative;display:flex;flex-direction:column;align-items:center}
        .tl-dot{width:12px;height:12px;border-radius:50%;border:2px solid var(--vip);background:var(--bg2);flex-shrink:0;z-index:1}
        .tl-dot.active{background:var(--vip)}
        .tl-connector{width:2px;flex:1;background:var(--bdr);margin-top:4px}
        .tl-item:last-child .tl-connector{display:none}
        .tl-content{flex:1;padding-bottom:4px}
        .tl-content h5{font-size:.78rem;font-weight:500;color:var(--t1);margin-bottom:2px}
        .tl-content p{font-size:.68rem;color:var(--t3);line-height:1.6;font-weight:300}
        .tl-content .tl-time{font-size:.62rem;color:var(--vip);font-weight:500;margin-top:3px;display:inline-block}

        /* ═══ COMPARISON TABLE ═══ */
        .vip-compare{padding:0 0 100px}
        .vip-compare-header{text-align:center;margin-bottom:56px}
        .vip-compare-header h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:500;letter-spacing:-1px;line-height:1.15;margin-bottom:14px}
        .vip-compare-header p{font-size:.95rem;color:var(--t2);font-weight:300;max-width:520px;margin:0 auto;line-height:1.75}
        .compare-table{width:100%;border-collapse:collapse}
        .compare-table thead th{padding:16px 20px;font-size:.72rem;font-weight:500;text-transform:uppercase;letter-spacing:2px;color:var(--t2);text-align:center;border-bottom:1px solid var(--bdr)}
        .compare-table thead th:first-child{text-align:left;color:var(--t3)}
        .compare-table thead th.vip-col{color:var(--vip);position:relative}
        .compare-table thead th.vip-col::after{content:'';position:absolute;bottom:0;left:20%;right:20%;height:2px;background:linear-gradient(90deg,transparent,var(--vip),transparent)}
        .compare-table tbody td{padding:14px 20px;font-size:.84rem;color:var(--t2);border-bottom:1px solid var(--bdr);text-align:center;font-weight:300;line-height:1.7}
        .compare-table tbody td:first-child{text-align:left;color:var(--t1);font-weight:400}
        .compare-table tbody td.vip-col{background:rgba(201,164,92,.03)}
        .compare-table tbody tr:hover{background:rgba(37,99,235,.03)}
        .compare-table .check{color:var(--grn);font-size:1rem}
        .compare-table .check-vip{color:var(--vip);font-size:1rem}
        .compare-table .dash{color:var(--t3)}

        /* ═══ METRICS ═══ */
        .vip-metrics{padding:0 0 100px;text-align:center}
        .plat-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-bottom:0}
        .plat-m{background:#0f1a2e;border:1px solid #1e2f4a;border-radius:20px;padding:44px 20px;text-align:center;transition:all .3s}
        .plat-m:nth-child(1){background:linear-gradient(180deg,rgba(201,164,92,.15),#0f1a2e);border-color:rgba(201,164,92,.25)}
        .plat-m:nth-child(2){background:linear-gradient(180deg,rgba(37,99,235,.15),#0f1a2e);border-color:rgba(37,99,235,.25)}
        .plat-m:nth-child(3){background:linear-gradient(180deg,rgba(34,197,94,.15),#0f1a2e);border-color:rgba(34,197,94,.25)}
        .plat-m:nth-child(4){background:linear-gradient(180deg,rgba(159,122,234,.15),#0f1a2e);border-color:rgba(159,122,234,.25)}
        .plat-m:hover{transform:translateY(-3px)}
        .plat-m strong{font-family:'Inter',sans-serif;font-size:clamp(2.2rem,3.8vw,3.2rem);font-weight:600;display:block;margin-bottom:6px}
        .plat-m:nth-child(1) strong{color:var(--vip)}
        .plat-m:nth-child(2) strong{color:var(--gold-bright)}
        .plat-m:nth-child(3) strong{color:var(--grn)}
        .plat-m:nth-child(4) strong{color:#9f7aea}
        .plat-m span{font-size:.78rem;color:rgba(255,255,255,.35);display:block;margin-bottom:8px}
        .plat-m-sub{font-size:.68rem;color:rgba(255,255,255,.22);line-height:1.5;max-width:180px;margin:0 auto}

        /* ═══ TESTIMONIALS ═══ */
        .vip-testimonials{padding:0 0 100px}
        .vip-test-header{text-align:center;margin-bottom:56px}
        .vip-test-header h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:500;letter-spacing:-1px;line-height:1.15;margin-bottom:14px}
        .vip-test-header p{font-size:.95rem;color:var(--t2);font-weight:300;max-width:480px;margin:0 auto;line-height:1.75}
        .test-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
        .test-card{background:var(--card);border:1px solid var(--bdr);border-radius:16px;padding:32px 28px;transition:all .3s}
        .test-card:hover{border-color:rgba(201,164,92,.2);transform:translateY(-3px)}
        .test-card:nth-child(1){background:linear-gradient(180deg,rgba(201,164,92,.04),var(--card) 50%)}
        .test-card:nth-child(2){background:linear-gradient(180deg,rgba(37,99,235,.04),var(--card) 50%)}
        .test-card:nth-child(3){background:linear-gradient(180deg,rgba(34,197,94,.04),var(--card) 50%)}
        .test-stars{display:flex;gap:3px;margin-bottom:16px;color:var(--vip);font-size:.72rem}
        .test-quote{font-size:.86rem;color:var(--t2);line-height:1.7;font-weight:300;margin-bottom:24px;font-style:italic}
        .test-author{display:flex;align-items:center;gap:12px}
        .test-avatar{width:40px;height:40px;border-radius:50%;background:var(--card2);border:1px solid var(--bdr);display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:600;color:var(--t3)}
        .test-name{font-size:.82rem;font-weight:500;color:var(--t1)}
        .test-role{font-size:.7rem;color:var(--t3);font-weight:300}

        /* ═══ FAQ ═══ */
        .studio-faq{padding:0 0 100px}
        .studio-faq-header{text-align:center;margin-bottom:56px}
        .studio-faq-header h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:500;letter-spacing:-1px;line-height:1.15;margin-bottom:14px}
        .studio-faq-header p{font-size:.95rem;color:var(--t2);font-weight:300;line-height:1.75}
        .studio-faq-list{max-width:720px;margin:0 auto}
        .studio-faq-item{border-bottom:1px solid var(--bdr)}
        .studio-faq-q{display:flex;align-items:center;justify-content:space-between;padding:20px 0;cursor:pointer;gap:16px}
        .studio-faq-q h4{font-size:.92rem;font-weight:400;color:var(--t1);transition:color .2s}
        .studio-faq-q:hover h4{color:#fff}
        .studio-faq-icon{width:24px;height:24px;flex-shrink:0;color:var(--t3);transition:transform .3s,color .3s}
        .studio-faq-item.open .studio-faq-icon{transform:rotate(45deg);color:var(--vip)}
        .studio-faq-a{max-height:0;overflow:hidden;transition:max-height .4s ease,padding .4s ease}
        .studio-faq-item.open .studio-faq-a{max-height:300px;padding-bottom:20px}
        .studio-faq-a p{font-size:.84rem;color:var(--t2);line-height:1.7;font-weight:300}

        /* ═══ CTA ═══ */
        .cta-section{padding:0 0 100px}
        .cta-box{background:var(--card);border:1px solid rgba(201,164,92,.25);border-radius:20px;padding:64px 48px;text-align:center;position:relative;overflow:hidden}
        .cta-box::before{content:'';position:absolute;top:-50%;left:50%;transform:translateX(-50%);width:600px;height:600px;background:radial-gradient(circle,rgba(201,164,92,.08),transparent 65%);pointer-events:none}
        .cta-box h2{font-size:clamp(1.8rem,3.5vw,2.4rem);font-weight:500;letter-spacing:-1px;margin-bottom:14px;position:relative;z-index:1}
        .cta-box p{font-size:.92rem;color:var(--t2);max-width:480px;margin:0 auto 32px;font-weight:300;line-height:1.7;position:relative;z-index:1}
        .cta-btns{display:flex;gap:12px;justify-content:center;position:relative;z-index:1}

        /* ═══ RESPONSIVE ═══ */
        @media(max-width:1024px){
          .vip-diff-grid{grid-template-columns:repeat(2,1fr)}
          .mega-inner{grid-template-columns:1fr}
          .test-grid{grid-template-columns:repeat(2,1fr)}
          .plat-metrics{grid-template-columns:repeat(2,1fr)}
          .compare-table{font-size:.8rem}
        }
        @media(max-width:768px){
          .vip-diff-grid,.test-grid,.plat-metrics{grid-template-columns:1fr}
          .mega-inner{grid-template-columns:1fr;gap:32px}
          .cta-box{padding:40px 24px}
          .cta-btns{flex-direction:column;align-items:center}
          .compare-table thead th,.compare-table tbody td{padding:10px 8px;font-size:.72rem}
          .vip-trust{gap:20px}
          .hero-btns{flex-direction:column;align-items:center}
        }
      `}</style>

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
            <a href="/get-started" className="bp vip lg">Schedule a Studio Consultation</a>
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
      <section className="rv" style={{ padding: '80px 0 100px' }}>
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
              type="studio"
              subject="Studio Inquiry"
              buttonText="Get in Touch"
              successMessage="Thanks! We'll review your project and reach out soon."
            />
          </div>
        </div>
      </section>
    </>
  );
}
