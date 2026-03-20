'use client';

import { useEffect } from 'react';

export default function BlogPostPage() {
  useEffect(() => {
    // Scroll reveal
    document.querySelectorAll('.rv').forEach((el) => {
      new IntersectionObserver(
        (e) => {
          if (e[0].isIntersecting) e[0].target.classList.add('v');
        },
        { threshold: 0.05 }
      ).observe(el);
    });

    // Mobile nav close
    document.querySelectorAll('.mn a').forEach((l) =>
      l.addEventListener('click', () =>
        document.querySelector('.mn')?.classList.remove('open')
      )
    );

    // TOC active state on scroll
    const links = document.querySelectorAll('.toc-list a');
    if (links.length) {
      const ids = Array.from(links).map((a) => a.getAttribute('href')?.slice(1) || '');
      function update() {
        let current = '';
        ids.forEach((id) => {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top < 150) current = id;
        });
        links.forEach((a) => {
          a.classList.toggle('active', a.getAttribute('href') === '#' + current);
        });
      }
      window.addEventListener('scroll', update, { passive: true });
      update();
      return () => window.removeEventListener('scroll', update);
    }
  }, []);

  useEffect(() => {
    // Copy link share button
    const copyBtn = document.querySelector('.share-btn[aria-label="Copy link"]');
    if (!copyBtn) return;
    const handler = function (this: HTMLElement, e: Event) {
      e.preventDefault();
      navigator.clipboard.writeText(window.location.href).then(() => {
        this.textContent = '\u2713';
        setTimeout(() => {
          this.textContent = '\uD83D\uDD17';
        }, 1500);
      });
    };
    copyBtn.addEventListener('click', handler as EventListener);
    return () => copyBtn.removeEventListener('click', handler as EventListener);
  }, []);

  return (
    <>
      <style>{`
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:'Inter',sans-serif;background:#040710;color:#d0d8e8;line-height:1.7;overflow-x:hidden;-webkit-font-smoothing:antialiased}
:root{--bg:#03060e;--bg2:#070c18;--card:#0b1220;--card2:#0f182a;--gold:#2563EB;--gold-dim:#2563EB10;--gold-bright:#3B82F6;--t1:#f5f7fb;--t2:#a3b1c9;--t3:#7889a3;--bdr:#101c2e;--bdr2:#182842;--grn:#22c55e;--r:12px}
body::before{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");pointer-events:none;z-index:9999}
.c{max-width:1320px;margin:0 auto;padding:0 32px}
section{position:relative;z-index:1}

/* Nav */
nav{position:fixed;top:0;left:0;right:0;z-index:1000;background:rgba(8,12,24,.92);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid var(--bdr)}
nav .c{display:flex;align-items:center;height:72px}
.logo{display:inline-flex;align-items:center;gap:10px;text-decoration:none;white-space:nowrap;flex-shrink:0}
.logo-mark{width:32px;height:32px;flex-shrink:0;color:#fff}.logo-mark svg{width:100%;height:100%;display:block}
.logo-text{font-family:'Inter',sans-serif;font-size:1.5rem;font-weight:500;color:#fff;letter-spacing:-.2px}.logo-text span{color:#fff}
.nl{display:flex;align-items:center;gap:32px;list-style:none;margin-left:48px}.nl a{color:rgba(255,255,255,.7);text-decoration:none;font-size:.95rem;font-weight:400;transition:color .2s}.nl a:hover,.nl a.active{color:#fff}
.nc{display:flex;align-items:center;gap:16px;margin-left:auto}.gh{color:rgba(255,255,255,.7);text-decoration:none;font-size:.95rem;font-weight:400}.gh:hover{color:#fff}
.bp{display:inline-flex;align-items:center;padding:10px 22px;background:#fff;color:var(--bg);text-decoration:none;font-size:.84rem;font-weight:500;border-radius:100px;border:none;cursor:pointer;transition:all .2s}.bp:hover{background:rgba(255,255,255,.85)}.bp.lg{padding:16px 32px;font-size:.92rem}
.bp.ghost{background:0 0;color:var(--t2);border:1px solid var(--bdr2)}.bp.ghost:hover{border-color:var(--t3);color:var(--t1)}
.bp.blue{background:var(--gold);color:#fff}.bp.blue:hover{background:var(--gold-bright)}
.ham{display:none;flex-direction:column;gap:5px;cursor:pointer;background:0 0;border:none;padding:4px}.ham span{width:20px;height:1.5px;background:var(--t1);border-radius:2px}
.mn{display:none;position:fixed;top:72px;left:0;right:0;background:var(--bg);border-bottom:1px solid var(--bdr);padding:16px 24px;z-index:999}.mn.open{display:block}.mn a{display:block;padding:12px 0;color:var(--t2);text-decoration:none;font-size:.95rem;border-bottom:1px solid var(--bdr)}.mn a:last-child{border:none}

/* Scroll reveal */
.rv{opacity:0;transform:translateY(30px);transition:opacity .7s,transform .7s}.rv.v{opacity:1;transform:none}

/* Post Hero */
.post-hero{padding:140px 0 0;position:relative;overflow:hidden}
.post-hero::before{content:'';position:absolute;top:-40%;left:50%;transform:translateX(-50%);width:800px;height:800px;background:radial-gradient(circle,rgba(37,99,235,.12),transparent 65%);pointer-events:none}
.post-hero .c{position:relative;z-index:1}
.post-hero-inner{max-width:780px;margin:0 auto;text-align:center}
.post-breadcrumb{display:flex;align-items:center;gap:8px;justify-content:center;margin-bottom:24px;font-size:.78rem;color:var(--t3);font-weight:300}
.post-breadcrumb a{color:var(--t3);text-decoration:none;transition:color .2s}
.post-breadcrumb a:hover{color:var(--t1)}
.post-breadcrumb .sep{opacity:.5}
.post-hero-cat{display:inline-block;padding:5px 16px;background:var(--gold);color:#fff;font-size:.68rem;font-weight:600;border-radius:100px;letter-spacing:.5px;text-transform:uppercase;margin-bottom:20px}
.post-hero h1{font-size:clamp(2rem,4.5vw,3.2rem);font-weight:500;letter-spacing:-1.5px;line-height:1.12;margin-bottom:20px;color:var(--t1)}
.post-hero-excerpt{font-size:1.05rem;color:var(--t2);max-width:600px;margin:0 auto 28px;line-height:1.75;font-weight:300}

/* Author & Meta Row */
.post-author-row{display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:40px;flex-wrap:wrap}
.post-author{display:flex;align-items:center;gap:10px}
.post-author-avatar{width:36px;height:36px;border-radius:50%;background:var(--card2);border:1px solid var(--bdr);display:flex;align-items:center;justify-content:center;font-size:.7rem;color:var(--t3);font-weight:500}
.post-author-info{text-align:left}
.post-author-name{font-size:.82rem;font-weight:500;color:var(--t1)}
.post-author-role{font-size:.72rem;color:var(--t3);font-weight:300}
.meta-divider{width:1px;height:24px;background:var(--bdr2)}
.post-hero-meta{display:flex;align-items:center;gap:12px;font-size:.78rem;color:var(--t3);font-weight:300}
.post-meta-dot{width:3px;height:3px;border-radius:50%;background:var(--t3)}

/* Featured Image */
.post-featured-img{max-width:960px;margin:0 auto 0;border-radius:16px;overflow:hidden;border:1px solid var(--bdr)}
.post-featured-img-inner{background:linear-gradient(135deg,var(--card2),#111d38);min-height:420px;display:flex;align-items:center;justify-content:center;position:relative}
.post-featured-img-inner .img-placeholder{font-size:5rem;opacity:.08}

/* Article Content Layout */
.post-content-wrap{padding:64px 0 80px}
.post-layout{display:grid;grid-template-columns:1fr minmax(0,720px) 1fr;gap:0}
.post-sidebar-left{position:relative}
.post-sidebar-right{position:relative}

/* Sticky Share Bar */
.share-bar{position:sticky;top:100px;display:flex;flex-direction:column;align-items:flex-end;gap:8px;padding-right:40px;padding-top:4px}
.share-label{font-size:.65rem;text-transform:uppercase;letter-spacing:1.5px;color:var(--t3);font-weight:500;margin-bottom:4px}
.share-btn{width:36px;height:36px;border-radius:10px;background:var(--card);border:1px solid var(--bdr);display:flex;align-items:center;justify-content:center;color:var(--t3);text-decoration:none;font-size:.82rem;transition:all .2s;cursor:pointer}
.share-btn:hover{border-color:var(--bdr2);color:var(--t1);background:var(--card2)}

/* Sticky TOC */
.toc{position:sticky;top:100px;padding-left:40px;padding-top:4px}
.toc-label{font-size:.65rem;text-transform:uppercase;letter-spacing:1.5px;color:var(--t3);font-weight:500;margin-bottom:12px}
.toc-list{list-style:none;display:flex;flex-direction:column;gap:0}
.toc-list a{display:block;padding:6px 0 6px 14px;font-size:.78rem;color:var(--t3);text-decoration:none;border-left:1px solid var(--bdr);transition:all .2s;font-weight:300;line-height:1.5}
.toc-list a:hover,.toc-list a.active{color:var(--t1);border-left-color:var(--gold)}

/* Article Body */
.post-body{max-width:720px}
.post-body h2{font-size:1.6rem;font-weight:500;letter-spacing:-.5px;line-height:1.2;margin:48px 0 16px;color:var(--t1);scroll-margin-top:90px}
.post-body h3{font-size:1.2rem;font-weight:500;letter-spacing:-.3px;line-height:1.3;margin:36px 0 12px;color:var(--t1);scroll-margin-top:90px}
.post-body p{font-size:.95rem;color:var(--t2);line-height:1.85;margin-bottom:20px;font-weight:300}
.post-body a{color:var(--gold-bright);text-decoration:underline;text-underline-offset:3px;transition:color .2s}
.post-body a:hover{color:#fff}
.post-body strong{color:var(--t1);font-weight:500}
.post-body ul,.post-body ol{margin:0 0 20px 20px;color:var(--t2);font-size:.95rem;font-weight:300;line-height:1.85}
.post-body li{margin-bottom:8px}
.post-body blockquote{margin:32px 0;padding:20px 24px;background:var(--card);border-left:3px solid var(--gold);border-radius:0 12px 12px 0;font-size:.95rem;color:var(--t2);line-height:1.8;font-weight:300;font-style:italic}
.post-body blockquote p{margin-bottom:0}
.post-body code{background:var(--card);padding:2px 8px;border-radius:6px;font-size:.84rem;color:var(--gold-bright);font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace}
.post-body pre{background:var(--card);border:1px solid var(--bdr);border-radius:12px;padding:20px 24px;margin:24px 0;overflow-x:auto}
.post-body pre code{background:none;padding:0;font-size:.82rem;color:var(--t2);line-height:1.7}
.post-body img{width:100%;border-radius:12px;margin:32px 0;border:1px solid var(--bdr)}
.post-body hr{border:none;border-top:1px solid var(--bdr);margin:40px 0}

/* Callout Box */
.callout{background:var(--card);border:1px solid var(--bdr);border-radius:16px;padding:24px 28px;margin:32px 0;display:flex;gap:14px;align-items:flex-start}
.callout-icon{font-size:1.1rem;flex-shrink:0;line-height:1.7}
.callout-body{font-size:.88rem;color:var(--t2);line-height:1.75;font-weight:300}
.callout-body strong{color:var(--t1);font-weight:500}

/* Post Tags */
.post-tags{display:flex;flex-wrap:wrap;gap:8px;margin:48px 0 0;padding-top:32px;border-top:1px solid var(--bdr)}
.post-tag{padding:5px 16px;background:var(--card);border:1px solid var(--bdr);border-radius:100px;font-size:.75rem;color:var(--t2);text-decoration:none;transition:all .2s;font-weight:400}
.post-tag:hover{border-color:var(--bdr2);color:var(--t1)}

/* Author Card */
.author-card{background:var(--card);border:1px solid var(--bdr);border-radius:16px;padding:32px;margin:48px 0 0;display:flex;gap:20px;align-items:flex-start}
.author-card-avatar{width:56px;height:56px;border-radius:50%;background:var(--card2);border:1px solid var(--bdr);display:flex;align-items:center;justify-content:center;font-size:.88rem;color:var(--t3);font-weight:500;flex-shrink:0}
.author-card-body h4{font-size:.95rem;font-weight:500;color:var(--t1);margin-bottom:2px}
.author-card-body .author-card-role{font-size:.75rem;color:var(--gold);font-weight:400;margin-bottom:10px}
.author-card-body p{font-size:.84rem;color:var(--t2);line-height:1.7;font-weight:300;margin:0}

/* Related Posts */
.related-section{padding:0 0 100px}
.sec-header{text-align:center;margin-bottom:56px}
.sec-header h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:500;letter-spacing:-1px;line-height:1.15;margin-bottom:14px}
.sec-header p{font-size:.95rem;color:var(--t2);font-weight:300;max-width:520px;margin:0 auto;line-height:1.75}
.post-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:0}
.post-card{background:var(--card);border:1px solid var(--bdr);border-radius:16px;overflow:hidden;transition:transform .3s,border-color .3s;display:flex;flex-direction:column}
.post-card:hover{transform:translateY(-4px);border-color:var(--bdr2)}
.post-card-img{height:200px;background:linear-gradient(135deg,var(--card2),#111d38);display:flex;align-items:center;justify-content:center;position:relative}
.post-card-img .post-cat-badge{position:absolute;top:14px;left:14px;background:var(--gold);color:#fff;font-size:.68rem;font-weight:600;padding:4px 16px;border-radius:100px;letter-spacing:.5px;text-transform:uppercase}
.post-card-img-icon{font-size:2.5rem;opacity:.08}
.post-card-body{padding:28px 24px;flex:1;display:flex;flex-direction:column}
.post-card-body .post-cat{font-size:.72rem;font-weight:500;text-transform:uppercase;letter-spacing:3px;color:var(--gold);margin-bottom:8px}
.post-card-body h4{font-size:1rem;font-weight:500;margin-bottom:8px;line-height:1.3}
.post-card-body p{font-size:.84rem;color:var(--t2);line-height:1.7;margin-bottom:auto;padding-bottom:16px;font-weight:300}
.post-card-footer{display:flex;align-items:center;justify-content:space-between;padding-top:14px;border-top:1px solid var(--bdr)}
.post-card-footer .post-meta{display:flex;align-items:center;gap:12px;font-size:.72rem;color:var(--t3);font-weight:300}
.post-card-footer .read-link{font-size:.84rem}
.read-link{display:inline-flex;align-items:center;gap:6px;color:var(--gold);text-decoration:none;font-weight:500;font-size:.88rem;transition:gap .2s}.read-link:hover{gap:10px}

/* Newsletter CTA */
.cta-section{padding:0 0 100px}
.cta-box{background:var(--card);border:1px solid var(--gold);border-radius:20px;padding:64px 48px;text-align:center;position:relative;overflow:hidden}
.cta-box::before{content:'';position:absolute;top:-50%;left:50%;transform:translateX(-50%);width:600px;height:600px;background:radial-gradient(circle,rgba(37,99,235,.1),transparent 65%);pointer-events:none}
.cta-box h2{font-size:clamp(1.8rem,3.5vw,2.4rem);font-weight:500;letter-spacing:-1px;margin-bottom:14px;position:relative;z-index:1}
.cta-box p{font-size:.95rem;color:var(--t2);max-width:460px;margin:0 auto 32px;font-weight:300;line-height:1.75;position:relative;z-index:1}
.nl-form{display:flex;gap:10px;max-width:440px;margin:0 auto;position:relative;z-index:1}
.nl-form input{flex:1;padding:12px 18px;background:var(--bg2);border:1px solid var(--bdr);border-radius:100px;color:var(--t1);font-size:.88rem;font-family:inherit;outline:none;transition:border-color .2s}
.nl-form input:focus{border-color:var(--gold)}
.nl-form input::placeholder{color:var(--t3)}
.nl-form .bp{white-space:nowrap}

/* Footer */
footer{border-top:1px solid var(--bdr);padding:48px 0 24px}
.fg-f{display:grid;grid-template-columns:2.5fr 1fr 1fr 1fr 1fr;gap:40px;margin-bottom:0}
.fbr .logo{margin-bottom:10px;display:inline-flex;white-space:nowrap;flex-shrink:0}.fbr p{font-size:.82rem;color:var(--t2);line-height:1.6;max-width:240px;font-weight:300}
.fcol h5{font-size:.66rem;font-weight:500;text-transform:uppercase;letter-spacing:1.5px;color:var(--t1);margin-bottom:12px}.fcol ul{list-style:none}.fcol li{margin-bottom:7px}.fcol a{color:var(--t2);text-decoration:none;font-size:.82rem;transition:color .2s}.fcol a:hover{color:#fff}
.social-icon{width:32px;height:32px;border-radius:8px;background:var(--card);border:1px solid var(--bdr);display:flex;align-items:center;justify-content:center;color:var(--t3);text-decoration:none;font-size:.75rem;transition:all .2s}
.social-icon:hover{border-color:var(--bdr2);color:var(--t1)}

/* Responsive */
@media(max-width:1200px){
.post-layout{grid-template-columns:0 minmax(0,720px) 0}
.share-bar,.toc{display:none}
.post-layout{max-width:720px;margin:0 auto;display:block}
}
@media(max-width:1024px){
.post-grid{grid-template-columns:repeat(3,1fr);gap:14px}
.fg-f{grid-template-columns:1fr 1fr}
}
@media(max-width:768px){
.nl,.gh{display:none}
.ham{display:flex}
.post-grid{grid-template-columns:1fr}
.fg-f{grid-template-columns:1fr}
.cta-box{padding:40px 24px}
.nl-form{flex-direction:column}
.post-hero{padding:110px 0 0}
.post-hero h1{font-size:clamp(1.6rem,6vw,2.2rem)}
.post-featured-img-inner{min-height:220px}
.post-content-wrap{padding:40px 0 60px}
.post-body h2{margin-top:36px}
.author-card{flex-direction:column;align-items:center;text-align:center}
}
      `}</style>

      {/* NAV */}
      <nav>
        <div className="c">
          <a href="/" className="logo">
            <div className="logo-mark">
              <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 3h22v5H11v5h13v5H11v5h16v5H5z" fill="currentColor" />
              </svg>
            </div>
            <div className="logo-text">Env<span>o</span>sta</div>
          </a>
          <ul className="nl">
            <li><a href="https://envosta.com/features/">Features</a></li>
            <li><a href="https://envosta.com/pricing">Plans &amp; Pricing</a></li>
            <li><a href="https://envosta.com/resources" className="active">Resources</a></li>
            <li><a href="https://envosta.com/support">Support</a></li>
          </ul>
          <div className="nc">
            <a href="https://app.envosta.com/" className="gh">Log in</a>
            <div className="block-button">
              <a href="https://envosta.com/pricing" className="bp">Get Started</a>
            </div>
          </div>
          <button
            className="ham"
            onClick={() => document.querySelector('.mn')?.classList.toggle('open')}
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </nav>
      <div className="mn">
        <a href="https://envosta.com/features/">Features</a>
        <a href="https://envosta.com/pricing">Plans &amp; Pricing</a>
        <a href="https://envosta.com/resources">Resources</a>
        <a href="https://envosta.com/support">Support</a>
      </div>

      {/* POST HERO */}
      <section className="post-hero">
        <div className="c">
          <div className="post-hero-inner rv">

            <div className="post-breadcrumb">
              <a href="https://envosta.com/resources">Blog</a>
              <span className="sep">&rarr;</span>
              <a href="#">Performance</a>
              <span className="sep">&rarr;</span>
              <span>How We Reduced Average Load Times&hellip;</span>
            </div>

            <div className="post-hero-cat">Performance</div>
            <h1>How We Reduced Average Load Times to Under 0.8 Seconds</h1>
            <p className="post-hero-excerpt">A deep dive into the infrastructure changes, caching strategies, and CDN optimizations that make Envosta-hosted sites among the fastest on the web.</p>

            <div className="post-author-row">
              <div className="post-author">
                <div className="post-author-avatar">JM</div>
                <div className="post-author-info">
                  <div className="post-author-name">James Mitchell</div>
                  <div className="post-author-role">Head of Infrastructure</div>
                </div>
              </div>
              <div className="meta-divider"></div>
              <div className="post-hero-meta">
                <span>Dec 12, 2025</span>
                <div className="post-meta-dot"></div>
                <span>8 min read</span>
              </div>
            </div>

          </div>

          {/* Featured Image */}
          <div className="post-featured-img rv">
            <div className="post-featured-img-inner">
              <div className="img-placeholder">&#9889;</div>
            </div>
          </div>

        </div>
      </section>

      {/* ARTICLE CONTENT */}
      <section className="post-content-wrap">
        <div className="c">
          <div className="post-layout">

            {/* Left Sidebar: Share Bar */}
            <div className="post-sidebar-left">
              <div className="share-bar">
                <div className="share-label">Share</div>
                <a href="#" className="share-btn" aria-label="Share on Twitter">&#120143;</a>
                <a href="#" className="share-btn" aria-label="Share on LinkedIn">in</a>
                <a href="#" className="share-btn" aria-label="Share on Facebook">f</a>
                <a href="#" className="share-btn" aria-label="Copy link">&#128279;</a>
              </div>
            </div>

            {/* Article Body */}
            <article className="post-body rv">

              <p>When we launched Envosta, our average customer site loaded in 2.4 seconds. That&#39;s not terrible — but it&#39;s not good enough. For an e-commerce store losing 7% of conversions for every second of delay, that gap matters. Here&#39;s the full breakdown of how we got that number below 0.8 seconds — and what it means for your site.</p>

              <h2 id="the-problem">The Problem with &ldquo;Fast Enough&rdquo;</h2>

              <p>Most hosting companies will tell you their servers are fast. And technically, they are — the server response time might be 200ms. But <strong>server response time is only one piece of the puzzle</strong>. What actually matters is how long it takes a real visitor, on a real device, on a real network, to see and interact with your page.</p>

              <p>We measured Time to First Byte (TTFB), Largest Contentful Paint (LCP), and Cumulative Layout Shift (CLS) across 12,000 customer sites. The results were eye-opening:</p>

              <ul>
                <li><strong>TTFB:</strong> Averaged 380ms — acceptable but inconsistent across regions</li>
                <li><strong>LCP:</strong> Averaged 2.8 seconds — the primary bottleneck</li>
                <li><strong>CLS:</strong> 0.14 — above the 0.1 &ldquo;good&rdquo; threshold</li>
              </ul>

              <p>The server was fast. Everything between the server and the visitor&#39;s screen was not.</p>

              <h2 id="infrastructure">Infrastructure Overhaul: The Foundation</h2>

              <p>We started at the metal. Envosta migrated its entire fleet to NVMe SSD clusters with dedicated CPU allocation per container. No more noisy neighbor problems. No more shared I/O bottlenecks.</p>

              <div className="callout">
                <div className="callout-icon">&#128161;</div>
                <div className="callout-body"><strong>What this means for you:</strong> Every Envosta site now runs on isolated compute resources. Your site&#39;s performance is never affected by another customer&#39;s traffic spike.</div>
              </div>

              <p>We also moved from a single-region model to a multi-region origin architecture. Customer sites are now served from the origin closest to their primary audience, with automatic failover across three regions.</p>

              <h2 id="caching">Multi-Layer Caching Strategy</h2>

              <p>Caching was the single biggest performance lever. We implemented a four-layer caching system that handles requests at the optimal level:</p>

              <h3>1. Object Cache (Redis)</h3>
              <p>Every WordPress database query result is cached in Redis. For a typical page load that might trigger 40–60 database queries, <strong>Redis reduces that to zero on subsequent loads</strong>. We auto-configure Redis for every site — no plugin required.</p>

              <h3>2. Full-Page Cache</h3>
              <p>Static HTML snapshots of every page are stored at the server level. When a visitor requests a page, they receive the pre-built HTML without WordPress even executing. Invalidation happens automatically when content is updated in the admin.</p>

              <h3>3. CDN Edge Cache</h3>
              <p>Pages and assets are replicated to 280+ edge locations worldwide. A visitor in Tokyo doesn&#39;t need to round-trip to a server in Virginia. They get the page from an edge node in their city.</p>

              <h3>4. Browser Cache</h3>
              <p>We set aggressive but smart <code>Cache-Control</code> headers. Static assets like CSS and JS are versioned and cached for one year. HTML pages use <code>stale-while-revalidate</code> to serve instantly while checking for updates in the background.</p>

              <pre><code>{`# Example headers set by Envosta's edge layer
Cache-Control: public, max-age=31536000, immutable  # static assets
Cache-Control: public, s-maxage=600, stale-while-revalidate=86400  # HTML`}</code></pre>

              <h2 id="image-optimization">Automatic Image Optimization</h2>

              <p>Images are typically 60–80% of a page&#39;s total weight. We built an image pipeline that processes every upload automatically:</p>

              <ul>
                <li>Converts to WebP (or AVIF where supported) — <strong>30–50% smaller</strong> than JPEG</li>
                <li>Generates responsive <code>srcset</code> variants at 6 breakpoints</li>
                <li>Lazy-loads all images below the fold</li>
                <li>Pre-loads the LCP image with <code>&lt;link rel=&quot;preload&quot;&gt;</code></li>
              </ul>

              <p>This single optimization shaved an average of 1.2 seconds off LCP across customer sites. It&#39;s also entirely automatic — site owners upload images as usual and the pipeline handles the rest.</p>

              <h2 id="results">The Results</h2>

              <p>After rolling these changes out across our fleet over 90 days, we re-measured the same 12,000 sites:</p>

              <blockquote>
                <p>Average LCP dropped from 2.8 seconds to 0.74 seconds. TTFB went from 380ms to 89ms. CLS improved to 0.04. These aren&#39;t lab numbers — they&#39;re real-user metrics from Chrome User Experience Report data.</p>
              </blockquote>

              <p>More importantly, our WooCommerce customers saw a <strong>12% average increase in conversion rates</strong> in the 30 days following migration, with no other changes to their stores.</p>

              <h2 id="what-this-means">What This Means for Your Site</h2>

              <p>If you&#39;re hosting with Envosta, these optimizations are already active on your site. There&#39;s nothing to configure or enable. If you&#39;re not yet on Envosta, here&#39;s what to keep in mind:</p>

              <ul>
                <li><strong>Speed isn&#39;t just a feature — it&#39;s infrastructure.</strong> No plugin can fix a slow server or a missing CDN.</li>
                <li><strong>Core Web Vitals directly affect SEO rankings.</strong> Google has confirmed that LCP, CLS, and INP are ranking signals.</li>
                <li><strong>Every 100ms of load time matters.</strong> Amazon famously measured that 100ms of added latency cost them 1% in sales.</li>
              </ul>

              <p>Ready to see how fast your WordPress site can be? <a href="https://envosta.com/pricing">Start with a free migration</a> and experience the difference.</p>

              {/* Post Tags */}
              <div className="post-tags">
                <a href="#" className="post-tag">Performance</a>
                <a href="#" className="post-tag">Infrastructure</a>
                <a href="#" className="post-tag">CDN</a>
                <a href="#" className="post-tag">Core Web Vitals</a>
                <a href="#" className="post-tag">Caching</a>
                <a href="#" className="post-tag">WordPress Speed</a>
              </div>

              {/* Author Card */}
              <div className="author-card">
                <div className="author-card-avatar">JM</div>
                <div className="author-card-body">
                  <h4>James Mitchell</h4>
                  <div className="author-card-role">Head of Infrastructure at Envosta</div>
                  <p>James leads the team responsible for Envosta&#39;s hosting infrastructure, performance optimization, and global CDN. Before Envosta, he spent 8 years building high-availability systems at AWS and Cloudflare.</p>
                </div>
              </div>

            </article>

            {/* Right Sidebar: Table of Contents */}
            <div className="post-sidebar-right">
              <div className="toc">
                <div className="toc-label">Contents</div>
                <ul className="toc-list">
                  <li><a href="#the-problem">The Problem with &ldquo;Fast Enough&rdquo;</a></li>
                  <li><a href="#infrastructure">Infrastructure Overhaul</a></li>
                  <li><a href="#caching">Multi-Layer Caching</a></li>
                  <li><a href="#image-optimization">Image Optimization</a></li>
                  <li><a href="#results">The Results</a></li>
                  <li><a href="#what-this-means">What This Means for You</a></li>
                </ul>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* RELATED POSTS */}
      <section className="related-section">
        <div className="c">
          <div className="sec-header rv">
            <h2>Related articles</h2>
            <p>Keep reading for more insights on speed, infrastructure, and WordPress performance.</p>
          </div>

          <div className="post-grid">

            <div className="post-card rv">
              <div className="post-card-img">
                <div className="post-cat-badge">WordPress</div>
                <div className="post-card-img-icon">&#128268;</div>
              </div>
              <div className="post-card-body">
                <div className="post-cat">WordPress</div>
                <h4>The 7 Plugins Every WordPress Site Actually Needs</h4>
                <p>Stop installing 30 plugins. Here are the only seven you need for security, speed, SEO, and backups — and how to configure each one.</p>
                <div className="post-card-footer">
                  <div className="post-meta"><span>Dec 8, 2025</span><div className="post-meta-dot"></div><span>6 min</span></div>
                  <a href="#" className="read-link">Read &rarr;</a>
                </div>
              </div>
            </div>

            <div className="post-card rv">
              <div className="post-card-img">
                <div className="post-cat-badge">WooCommerce</div>
                <div className="post-card-img-icon">&#128722;</div>
              </div>
              <div className="post-card-body">
                <div className="post-cat">WooCommerce</div>
                <h4>Speed Up Your WooCommerce Store Without Breaking It</h4>
                <p>Slow checkouts kill conversions. A step-by-step guide to optimizing your WooCommerce store for sub-second load times.</p>
                <div className="post-card-footer">
                  <div className="post-meta"><span>Nov 28, 2025</span><div className="post-meta-dot"></div><span>9 min</span></div>
                  <a href="#" className="read-link">Read &rarr;</a>
                </div>
              </div>
            </div>

            <div className="post-card rv">
              <div className="post-card-img">
                <div className="post-cat-badge">Performance</div>
                <div className="post-card-img-icon">&#128202;</div>
              </div>
              <div className="post-card-body">
                <div className="post-cat">Performance</div>
                <h4>Core Web Vitals in 2026: What Actually Matters</h4>
                <p>Google keeps updating the goalposts. Here&#39;s what LCP, CLS, and INP scores your WordPress site actually needs to rank well.</p>
                <div className="post-card-footer">
                  <div className="post-meta"><span>Nov 20, 2025</span><div className="post-meta-dot"></div><span>5 min</span></div>
                  <a href="#" className="read-link">Read &rarr;</a>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* NEWSLETTER CTA */}
      <section className="cta-section">
        <div className="c">
          <div className="cta-box rv">
            <h2>Get marketing tips delivered to your inbox</h2>
            <p>Join 2,400+ business owners who get our weekly WordPress tips, security updates, and performance guides.</p>
            <div className="nl-form">
              <input type="email" placeholder="you@company.com" />
              <button className="bp blue">Subscribe</button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="c">
          <div className="fg-f">
            <div className="fbr">
              <a href="/" className="logo" style={{ marginBottom: '16px' }}>
                <div className="logo-mark">
                  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 3h22v5H11v5h13v5H11v5h16v5H5z" fill="currentColor" />
                  </svg>
                </div>
                <div className="logo-text">Env<span>o</span>sta</div>
              </a>
              <p style={{ maxWidth: '280px' }}>Managed WordPress hosting that starts with a consultation. Enterprise infrastructure, expert support, and hands-on onboarding — all in one place.</p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <a href="#" className="social-icon" aria-label="Twitter">&#120143;</a>
                <a href="#" className="social-icon" aria-label="LinkedIn">in</a>
                <a href="#" className="social-icon" aria-label="Facebook">f</a>
                <a href="#" className="social-icon" aria-label="YouTube">&#9654;</a>
              </div>
            </div>
            <div className="fcol">
              <h5>Hosting</h5>
              <ul>
                <li><a href="https://envosta.com/pricing">Managed WordPress</a></li>
                <li><a href="https://envosta.com/pricing">WooCommerce Hosting</a></li>
                <li><a href="https://envosta.com/features/">Enterprise Hosting</a></li>
                <li><a href="https://envosta.com/pricing">Plans &amp; Pricing</a></li>
                <li><a href="#">Domain Names</a></li>
                <li><a href="#">Free Migration</a></li>
              </ul>
            </div>
            <div className="fcol">
              <h5>Features</h5>
              <ul>
                <li><a href="https://envosta.com/features/">Onboarding &amp; Setup</a></li>
                <li><a href="https://envosta.com/features/">SEO Tools</a></li>
                <li><a href="https://envosta.com/features/">Speed &amp; Performance</a></li>
                <li><a href="https://envosta.com/features/">Security &amp; SSL</a></li>
                <li><a href="https://envosta.com/features/">Daily Backups</a></li>
                <li><a href="https://envosta.com/features/">Global CDN</a></li>
              </ul>
            </div>
            <div className="fcol">
              <h5>Resources</h5>
              <ul>
                <li><a href="https://envosta.com/resources">Knowledge Base</a></li>
                <li><a href="https://envosta.com/resources">Blog</a></li>
                <li><a href="https://envosta.com/resources">Guides &amp; Tutorials</a></li>
                <li><a href="#">Developer Docs</a></li>
                <li><a href="#">System Status</a></li>
                <li><a href="#">Changelog</a></li>
              </ul>
            </div>
            <div className="fcol">
              <h5>Company</h5>
              <ul>
                <li><a href="#">About Envosta</a></li>
                <li><a href="https://envosta.com/support">Contact Us</a></li>
                <li><a href="https://envosta.com/support">Support Center</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Partners &amp; Affiliates</a></li>
                <li><a href="#">Brand Assets</a></li>
              </ul>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--bdr)', marginTop: '48px', paddingTop: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '16px' }}>
            <p style={{ fontSize: '.75rem', color: 'var(--t3)' }}>&copy; 2025 Envosta Inc. All rights reserved.</p>
            <div style={{ display: 'flex', gap: '24px' }}>
              <a href="#" style={{ fontSize: '.75rem', color: 'var(--t3)', textDecoration: 'none', transition: 'color .2s' }}>Privacy Policy</a>
              <a href="#" style={{ fontSize: '.75rem', color: 'var(--t3)', textDecoration: 'none', transition: 'color .2s' }}>Terms of Service</a>
              <a href="#" style={{ fontSize: '.75rem', color: 'var(--t3)', textDecoration: 'none', transition: 'color .2s' }}>Cookie Policy</a>
              <a href="#" style={{ fontSize: '.75rem', color: 'var(--t3)', textDecoration: 'none', transition: 'color .2s' }}>GDPR</a>
              <a href="#" style={{ fontSize: '.75rem', color: 'var(--t3)', textDecoration: 'none', transition: 'color .2s' }}>Sitemap</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
